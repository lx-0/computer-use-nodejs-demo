import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OllamaClient } from '@/lib/llm/ollama-client';
import { AVAILABLE_MODELS, OllamaModelInfo } from '@/lib/llm/types';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ModelManager } from './ModelManager';

export function LocalModels() {
  const [installedModels, setInstalledModels] = useState<OllamaModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the list of available local models from our predefined list
  const availableLocalModels = AVAILABLE_MODELS.filter((model) => model.provider === 'local');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError(null);
        const client = OllamaClient.getInstance();

        // First check if Ollama is running
        const isHealthy = await client.checkHealth();
        if (!isHealthy) {
          throw new Error('Ollama service is not running. Please start Ollama and try again.');
        }

        const models = await client.listModels();
        setInstalledModels(models);
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch models');
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  if (loading) {
    return <div className="p-4">Loading local models...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Local Models</h3>
      <div className="space-y-2">
        {availableLocalModels.map((model) => {
          const isInstalled = installedModels.some((m) => m.name === model.id);
          return (
            <ModelManager
              key={model.id}
              modelId={model.id}
              model={model}
              isInstalled={isInstalled}
              onStatusChange={(_status) => {
                // console.log('Model status changed:', model.id, status);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
