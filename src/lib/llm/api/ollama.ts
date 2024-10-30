import { ModelResourceMetrics, OllamaModelInfo, OllamaModelStatus } from '@/lib/llm/types';
import { getOllamaHeaders } from '@/lib/utils/api';

// Define a type for the model
interface Model {
  name: string;
  digest: string;
  size: number;
  modified_at: string;
  details?: {
    parameter_size: number;
    quantization_level: string;
  };
}

export class OllamaService {
  private static instance: OllamaService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
  }

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  public async listModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        headers: getOllamaHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch models');

      const { models } = await response.json();
      return models.map((model: Model) => ({
        id: model.name,
        name: model.name,
        provider: 'local' as const,
        digest: model.digest,
        size: model.size,
        modified_at: model.modified_at,
        status: 'ready',
        contextLength: 4096,
        description: model.details
          ? `${model.details.parameter_size} parameters, ${model.details.quantization_level} quantization`
          : 'Local model',
        details: model.details,
      }));
    } catch (error) {
      console.error('Failed to list models:', error);
      throw error;
    }
  }

  public async pullModel(
    modelName: string,
    onProgress?: (status: OllamaModelStatus) => void
  ): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: getOllamaHeaders(),
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error('Failed to start model pull');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      // Process the stream using async iteration
      const processStream = async () => {
        let buffer = '';
        let isDone = false;

        try {
          while (!isDone) {
            const { done, value } = await reader.read();
            isDone = done;

            if (done) break;

            // Append new chunk to buffer and split by newlines
            buffer += new TextDecoder().decode(value);
            const lines = buffer.split('\n');

            // Process all complete lines
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              try {
                const progress = JSON.parse(line);

                // Create status update based on progress
                const status: OllamaModelStatus = {
                  name: modelName,
                  status: progress.status === 'success' ? 'ready' : 'downloading',
                  progress:
                    progress.completed && progress.total
                      ? (progress.completed / progress.total) * 100
                      : undefined,
                  downloadedSize: progress.completed,
                  totalSize: progress.total,
                  error: progress.error,
                  lastUpdated: new Date(),
                };

                // Call the progress callback if provided
                onProgress?.(status);

                // If we got an error or success, we're done
                if (progress.status === 'success' || progress.error) {
                  isDone = true;
                  break;
                }
              } catch (error) {
                console.warn('Failed to parse progress:', error);
              }
            }

            // Keep the last incomplete line in the buffer
            buffer = lines[lines.length - 1];
          }
        } finally {
          reader.releaseLock();
        }
      };

      // Start processing the stream
      await processStream();
      return response;
    } catch (error) {
      console.error('Failed to pull model:', error);
      throw error;
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        headers: getOllamaHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  public async getModelMetrics(modelId: string): Promise<ModelResourceMetrics> {
    // Implement actual metrics fetching from Ollama when available
    return {
      memoryUsage: 0,
    };
  }
}
