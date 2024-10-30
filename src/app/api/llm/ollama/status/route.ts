import { OllamaService } from '@/lib/llm/api/ollama';
import { OllamaModelStatus } from '@/lib/llm/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<Response> {
  console.log('Status request received', req.nextUrl.searchParams);

  // Get query parameters
  const searchParams = req.nextUrl.searchParams;
  const modelId = searchParams.get('modelId');
  const apiKey = searchParams.get('apiKey');

  // Validate inputs
  if (apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!modelId) {
    return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
  }

  // Create ReadableStream for SSE
  const stream = new ReadableStream({
    start: async (controller) => {
      try {
        // Get Ollama service instance
        const ollama = OllamaService.getInstance();

        // Get initial status by checking if model is in list
        const models = await ollama.listModels();
        const modelInfo = models.find((m) => m.name === modelId);

        const initialStatus: OllamaModelStatus = {
          name: modelId,
          status: modelInfo ? 'ready' : 'checking',
          progress: 0,
          lastUpdated: new Date(),
        };

        // Debug log
        console.log('Sending initial status:', initialStatus);

        // Send initial status
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(initialStatus)}\n\n`));

        // Set up periodic status checks
        const statusInterval = setInterval(async () => {
          try {
            // Check model status by listing models
            const currentModels = await ollama.listModels();
            const currentModel = currentModels.find((m) => m.name === modelId);

            // Get metrics if model exists
            const metrics = currentModel ? await ollama.getModelMetrics(modelId) : undefined;

            const status: OllamaModelStatus = {
              name: modelId,
              status: currentModel ? 'ready' : 'checking',
              lastUpdated: new Date(),
              metrics,
            };

            // Send status update
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(status)}\n\n`));
          } catch (error) {
            console.error('Error checking status:', error);
          }
        }, 5000); // Check every 5 seconds

        // Keep-alive interval
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(': ping\n\n'));
          } catch (error) {
            console.error('Error sending keepalive:', error);
            clearInterval(keepAlive);
            clearInterval(statusInterval);
            controller.close();
          }
        }, 15000);

        // Handle client disconnect
        req.signal.addEventListener('abort', () => {
          console.log('Client disconnected, cleaning up');
          clearInterval(keepAlive);
          clearInterval(statusInterval);
          controller.close();
        });
      } catch (error) {
        console.error('Stream error:', error);
        controller.error(error);
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
