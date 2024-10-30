import { OllamaClient } from '@/lib/llm/ollama-client';
import { OllamaModelStatus } from '@/lib/llm/types';
import { useCallback, useEffect, useState } from 'react';

export function useModelManager(modelId: string) {
  const [status, setStatus] = useState<OllamaModelStatus>({
    name: modelId,
    status: 'checking',
    lastUpdated: new Date(),
  });

  // Check initial status and set up event stream
  useEffect(() => {
    const client = OllamaClient.getInstance();

    // Get initial status
    const checkHealth = async () => {
      try {
        const isHealthy = await client.checkHealth();
        if (!isHealthy) {
          setStatus((prev) => ({
            ...prev,
            status: 'error',
            error: 'Ollama service is not healthy',
            lastUpdated: new Date(),
          }));
          return;
        }

        // Get initial model status
        const currentStatus = client.getModelStatus(modelId);
        if (currentStatus) {
          setStatus(currentStatus);
        }
      } catch (error) {
        console.error('Failed to check health:', error);
        setStatus((prev) => ({
          ...prev,
          status: 'error',
          error: 'Failed to check health',
          lastUpdated: new Date(),
        }));
      }
    };

    checkHealth();

    // Set up event stream for status updates
    const eventSource = client.setupModelStatusStream(modelId);

    // Handle incoming status updates
    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const newStatus = JSON.parse(event.data) as OllamaModelStatus;
        setStatus(newStatus);
      } catch (error) {
        console.error('Failed to parse status update:', error);
      }
    };

    eventSource.onerror = () => {
      console.error('Status EventSource error');
      setStatus((prev) => ({
        ...prev,
        status: 'error',
        error: 'Connection error',
        lastUpdated: new Date(),
      }));
    };

    return () => {
      eventSource.close();
    };
  }, [modelId]);

  const handleDownload = useCallback(async () => {
    try {
      setStatus((prev) => ({
        ...prev,
        status: 'downloading',
        progress: 0,
        lastUpdated: new Date(),
      }));

      const client = OllamaClient.getInstance();
      const eventSource = client.setupPullStream(modelId);

      // Handle download progress
      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as OllamaModelStatus;
          setStatus((prev) => ({
            ...prev,
            ...data,
            lastUpdated: new Date(),
          }));

          // Close event source when download is complete
          if (data.status === 'ready' || data.status === 'error') {
            eventSource.close();
          }
        } catch (error) {
          console.error('Failed to parse pull status:', error);
        }
      };

      // Handle errors
      eventSource.onerror = () => {
        console.error('Pull event stream error');
        setStatus((prev) => ({
          ...prev,
          status: 'error',
          error: 'Failed to download model',
          lastUpdated: new Date(),
        }));
        eventSource.close();
      };
    } catch (error) {
      console.error('Failed to start model download:', error);
      setStatus((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to start download',
        lastUpdated: new Date(),
      }));
    }
  }, [modelId]);

  return {
    status,
    handleDownload,
  };
}
