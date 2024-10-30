import { OllamaService } from '@/lib/llm/ollama';
import { OllamaModelStatus } from '@/lib/llm/types';
import { throttle } from 'lodash';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

interface DebugMessage {
  type: 'debug';
  message: string;
  data?: {
    status?: string;
    progress?: number;
    error?: string;
    [key: string]: unknown;
  };
}

export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const modelId = searchParams.get('modelId');
  const apiKey = searchParams.get('apiKey');

  console.log('Pull request received for model:', modelId);

  // Check API key
  if (!apiKey || apiKey !== process.env.API_KEY) {
    console.error('Unauthorized pull request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!modelId) {
    console.error('No model ID provided');
    return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  // Create ReadableStream for SSE
  const stream = new ReadableStream({
    start: async (controller) => {
      // Helper function to send debug info
      const sendDebug = async (message: string, data?: DebugMessage['data']) => {
        const debugMessage: DebugMessage = {
          type: 'debug',
          message,
          data,
        };
        console.log(`[Pull Debug] ${message}`, data);
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(debugMessage)}\n\n`));
        } catch (error) {
          console.error('Error sending debug message:', error);
        }
      };

      // Helper function to send status update
      const sendStatus = (status: OllamaModelStatus) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(status)}\n\n`));
        } catch (error) {
          console.error('Error sending status:', error);
          throw error;
        }
      };

      // Create throttled versions of both functions
      const throttledSendStatus = throttle(sendStatus, 1000); // Update once per second
      const throttledSendDebug = throttle(sendDebug, 2000); // Debug messages every 2 seconds

      let keepAliveInterval: ReturnType<typeof setInterval> | undefined;

      try {
        const ollama = OllamaService.getInstance();
        await sendDebug('Starting pull process'); // Initial debug not throttled

        // Create initial status
        const initialStatus: OllamaModelStatus = {
          name: modelId,
          status: 'downloading',
          progress: 0,
          lastUpdated: new Date(),
        };
        sendStatus(initialStatus); // Initial status not throttled

        // Start pull process with progress callback
        await ollama.pullModel(modelId, (status: OllamaModelStatus) => {
          try {
            // Use throttled debug for progress updates
            if (status.status === 'downloading') {
              throttledSendDebug('Received status update', {
                status: status.status,
                progress: status.progress,
                error: status.error,
              });
              throttledSendStatus(status);
            } else {
              // But send terminal states (ready/error) immediately with debug
              sendDebug('Received status update', {
                status: status.status,
                progress: status.progress,
                error: status.error,
              });
              sendStatus(status);
            }

            // If we're done or have an error, clean up
            if (status.status === 'ready' || status.status === 'error') {
              if (keepAliveInterval) {
                clearInterval(keepAliveInterval);
              }
              controller.close();
            }
          } catch (error) {
            console.error('Error writing to stream:', error);
            sendDebug('Error writing status', { error: String(error) });
            if (keepAliveInterval) {
              clearInterval(keepAliveInterval);
            }
            controller.close();
          }
        });

        // Keep-alive interval
        keepAliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch (error) {
            console.error('Error sending keepalive:', error);
            if (keepAliveInterval) {
              clearInterval(keepAliveInterval);
            }
            controller.close();
          }
        }, 15000);

        // Handle client disconnect
        req.signal.addEventListener('abort', () => {
          console.log('Client disconnected, cleaning up');
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
          }
          controller.close();
        });
      } catch (error) {
        console.error('Stream error:', error);
        // Send error status
        const errorStatus: OllamaModelStatus = {
          name: modelId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastUpdated: new Date(),
        };
        sendStatus(errorStatus);
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
        }
        controller.close();
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
