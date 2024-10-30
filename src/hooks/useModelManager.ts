import { OllamaClient } from '@/lib/llm/ollama-client';
import { OllamaModelStatus } from '@/lib/llm/types';
import { useCallback, useEffect, useRef, useState } from 'react';

// Create a static map to persist download states across component instances
const globalDownloadStates = new Map<string, OllamaModelStatus>();

export function useModelManager(modelId: string, isInstalled: boolean) {
  const [status, setStatus] = useState<OllamaModelStatus>(
    () =>
      globalDownloadStates.get(modelId) || {
        name: modelId,
        status: isInstalled ? 'ready' : 'checking',
        lastUpdated: new Date(),
      }
  );

  // Keep refs for cleanup and state tracking
  const eventSourceRef = useRef<EventSource | null>(null);
  const isDownloadingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('Cleaning up event source for:', modelId);
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    isDownloadingRef.current = false;
  }, [modelId]);

  // Update global state when local state changes
  useEffect(() => {
    globalDownloadStates.set(modelId, status);
  }, [modelId, status]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Initial status check
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!isMountedRef.current || isDownloadingRef.current) return;

      try {
        const client = OllamaClient.getInstance();
        const isHealthy = await client.checkHealth();

        if (!isHealthy) {
          if (isMountedRef.current) {
            setStatus((prev) => ({
              ...prev,
              status: 'error',
              error: 'Ollama service is not healthy',
              lastUpdated: new Date(),
            }));
          }
          return;
        }

        // If model is installed, set status to ready
        if (isInstalled && isMountedRef.current) {
          setStatus((prev) => ({
            ...prev,
            status: 'ready',
            lastUpdated: new Date(),
          }));
        } else if (isMountedRef.current) {
          setStatus((prev) => ({
            ...prev,
            status: 'checking',
            lastUpdated: new Date(),
          }));
        }
      } catch (error) {
        console.error('Failed to check initial status:', error);
        if (isMountedRef.current) {
          setStatus((prev) => ({
            ...prev,
            status: 'error',
            error: 'Failed to check status',
            lastUpdated: new Date(),
          }));
        }
      }
    };

    checkInitialStatus();
  }, [modelId, isInstalled]);

  // Check initial status and set up event stream
  useEffect(() => {
    const client = OllamaClient.getInstance();

    const checkHealth = async () => {
      if (!isMountedRef.current) return;

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
        if (currentStatus && isMountedRef.current) {
          setStatus(currentStatus);
        }
      } catch (error) {
        console.error('Failed to check health:', error);
        if (isMountedRef.current) {
          setStatus((prev) => ({
            ...prev,
            status: 'error',
            error: 'Failed to check health',
            lastUpdated: new Date(),
          }));
        }
      }
    };

    // Only check health if not downloading
    if (!isDownloadingRef.current) {
      checkHealth();
    }

    // Set up event stream for status updates if downloading
    if (status.status === 'downloading' && !eventSourceRef.current) {
      isDownloadingRef.current = true;
      eventSourceRef.current = client.setupPullStream(modelId);

      eventSourceRef.current.onmessage = (event: MessageEvent) => {
        if (!isMountedRef.current) return;

        try {
          const newStatus = JSON.parse(event.data) as OllamaModelStatus;
          setStatus(newStatus);

          // Close stream if download is complete or failed
          if (newStatus.status === 'ready' || newStatus.status === 'error') {
            cleanup();
          }
        } catch (error) {
          console.error('Failed to parse status update:', error);
        }
      };

      eventSourceRef.current.onerror = () => {
        console.error('Status EventSource error');
        if (isMountedRef.current) {
          setStatus((prev) => ({
            ...prev,
            status: 'error',
            error: 'Connection error',
            lastUpdated: new Date(),
          }));
        }
        cleanup();
      };
    }

    return cleanup;
  }, [modelId, status.status, cleanup]);

  const handleDownload = useCallback(async () => {
    if (isDownloadingRef.current) {
      console.log('Download already in progress for:', modelId);
      return;
    }

    try {
      cleanup(); // Clean up any existing connections
      isDownloadingRef.current = true;

      if (!isMountedRef.current) return;
      setStatus((prev) => ({
        ...prev,
        status: 'downloading',
        progress: 0,
        lastUpdated: new Date(),
      }));

      const client = OllamaClient.getInstance();
      eventSourceRef.current = client.setupPullStream(modelId);

      // Handle download progress
      eventSourceRef.current.onmessage = (event: MessageEvent) => {
        if (!isMountedRef.current) return;

        try {
          const data = JSON.parse(event.data) as OllamaModelStatus;
          setStatus((prev) => ({
            ...prev,
            ...data,
            lastUpdated: new Date(),
          }));

          // Close event source when download is complete
          if (data.status === 'ready' || data.status === 'error') {
            cleanup();
          }
        } catch (error) {
          console.error('Failed to parse pull status:', error);
        }
      };

      // Handle errors
      eventSourceRef.current.onerror = () => {
        console.error('Pull event stream error');
        if (isMountedRef.current) {
          setStatus((prev) => ({
            ...prev,
            status: 'error',
            error: 'Failed to download model',
            lastUpdated: new Date(),
          }));
        }
        cleanup();
      };
    } catch (error) {
      console.error('Failed to start model download:', error);
      if (isMountedRef.current) {
        setStatus((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to start download',
          lastUpdated: new Date(),
        }));
      }
      cleanup();
    }
  }, [modelId, cleanup]);

  return {
    status,
    handleDownload,
  };
}
