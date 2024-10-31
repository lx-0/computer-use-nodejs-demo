import { OllamaService } from '@/lib/llm/api/ollama';
import { OllamaModelStatus } from '@/lib/llm/types';
import { throttle } from 'lodash';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const modelId = searchParams.get('modelId');
  const apiKey = searchParams.get('apiKey');

  // Check API key
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!modelId) {
    return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  // Create ReadableStream for SSE
  const stream = new ReadableStream({
    start: async (controller) => {
      let isControllerClosed = false;
      let throttledSendStatus: ReturnType<typeof throttle> | null = null;

      // Helper function to check if we can send
      const canSend = () => !isControllerClosed && controller.desiredSize !== null;

      // Helper function to send status update
      const sendStatus = (status: OllamaModelStatus) => {
        if (!canSend()) {
          console.log('Skipping status update - controller is closed or stream ended');
          return;
        }

        try {
          const statusWithTimestamp = {
            ...status,
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusWithTimestamp)}\n\n`));
        } catch (error) {
          if (error instanceof Error && error.message.includes('Controller is already closed')) {
            console.log('Stream was closed, cleaning up');
            cleanup();
          } else if (!isControllerClosed) {
            console.error('Error sending status:', error);
          }
        }
      };

      let keepAliveInterval: ReturnType<typeof setInterval> | undefined;

      const cleanup = () => {
        if (isControllerClosed) {
          console.log('Cleanup already performed');
          return;
        }

        console.log('Performing cleanup');
        isControllerClosed = true;

        // Cancel throttled function if it exists
        if (throttledSendStatus) {
          throttledSendStatus.cancel();
          throttledSendStatus.flush(); // Flush any pending updates
          throttledSendStatus = null;
        }

        // Clear intervals
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = undefined;
        }

        // Close the controller last
        try {
          if (controller.desiredSize !== null) {
            controller.close();
          }
        } catch (error: unknown) {
          console.error(
            `Error closing controller: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      };

      try {
        const ollama = OllamaService.getInstance();

        // Create initial status
        const initialStatus: OllamaModelStatus = {
          name: modelId,
          status: 'downloading',
          progress: 0,
          lastUpdated: new Date(),
          timestamp: new Date().toISOString(),
        };
        sendStatus(initialStatus);

        // Create throttled version of sendStatus with early exit
        throttledSendStatus = throttle((status: OllamaModelStatus) => {
          if (!canSend()) {
            console.log('Skipping throttled status - stream ended');
            return;
          }
          sendStatus(status);
        }, 1000);

        // Start pull process with progress callback
        await ollama.pullModel(modelId, (status: OllamaModelStatus) => {
          if (!canSend()) return;

          try {
            const statusWithTimestamp = {
              ...status,
              timestamp: new Date().toISOString(),
            };

            if (status.status === 'downloading' && throttledSendStatus) {
              throttledSendStatus(statusWithTimestamp);
            } else {
              // Send terminal states immediately and cleanup
              if (canSend()) {
                sendStatus(statusWithTimestamp);
              }
              cleanup();
            }
          } catch (error) {
            if (!isControllerClosed) {
              console.error('Error writing to stream:', error);
            }
            cleanup();
          }
        });

        // Keep-alive interval with check
        keepAliveInterval = setInterval(() => {
          if (!canSend()) {
            clearInterval(keepAliveInterval);
            return;
          }
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch (error) {
            if (!isControllerClosed) {
              console.error('Error sending keepalive:', error);
            }
            cleanup();
          }
        }, 15000);

        // Handle client disconnect
        req.signal.addEventListener('abort', cleanup);
      } catch (error) {
        console.error('Stream error:', error);
        // Send error status if we still can
        if (canSend()) {
          const errorStatus: OllamaModelStatus = {
            name: modelId,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            lastUpdated: new Date(),
            timestamp: new Date().toISOString(),
          };
          sendStatus(errorStatus);
        }
        cleanup();
      }
    },
  });

  // Return streaming response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
