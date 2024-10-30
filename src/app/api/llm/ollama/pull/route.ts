import { OllamaService } from '@/lib/llm/ollama';
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

      // Helper function to check if we can send
      const canSend = () => !isControllerClosed;

      // Helper function to send status update
      const sendStatus = (status: OllamaModelStatus) => {
        if (!canSend()) return;
        try {
          const statusWithTimestamp = {
            ...status,
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusWithTimestamp)}\n\n`));
        } catch (error) {
          if (!isControllerClosed) {
            console.error('Error sending status:', error);
          }
        }
      };

      // Create throttled version of sendStatus
      const throttledSendStatus = throttle((status: OllamaModelStatus) => {
        if (canSend()) sendStatus(status);
      }, 1000);

      let keepAliveInterval: ReturnType<typeof setInterval> | undefined;

      const cleanup = () => {
        if (isControllerClosed) return; // Prevent multiple cleanups

        isControllerClosed = true;
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = undefined;
        }

        // Cancel any pending throttled functions
        throttledSendStatus.cancel();

        // Close the controller last
        controller.close();
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

        // Start pull process with progress callback
        await ollama.pullModel(modelId, (status: OllamaModelStatus) => {
          if (!canSend()) return;

          try {
            const statusWithTimestamp = {
              ...status,
              timestamp: new Date().toISOString(),
            };

            if (status.status === 'downloading') {
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

        // Keep-alive interval
        keepAliveInterval = setInterval(() => {
          if (!canSend()) return;
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
