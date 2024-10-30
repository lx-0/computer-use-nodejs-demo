import { ChatMessageData, Subprocess, SubprocessStatus } from '@/components/chat/ChatMessage';
import { dockerService } from '@/services/dockerService';
import { EventEmitter } from 'events';
import { useCallback, useEffect, useState } from 'react';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

const vncReadyEmitter = new EventEmitter();

export interface DockerControlState {
  containerId: string | null;
  containerStatus: string | null;
  containerDetails: string | null;
  buildProgress: Record<string, string>;
  buildSuccessful: boolean;
  dockerfiles: string[];
  selectedImage: string;
}

interface UseDockerHandlersProps {
  addChatMessage: (
    type: ChatMessageData['type'],
    content: string,
    title?: string,
    service?: string
  ) => string;
  updateChatMessage: (messageId: string, messageContent: Partial<ChatMessageData>) => void;
  updateSubprocess: (
    messageId: string,
    subprocessId: string,
    updater: (subprocess: Subprocess) => Subprocess
  ) => void;
  addSubprocess: (messageId: string, subprocess: Subprocess) => void;
  createSubprocess: (title: string, content: string, status: SubprocessStatus) => Subprocess;
}

export function useDockerHandlers({
  addChatMessage,
  updateChatMessage,
  updateSubprocess,
  addSubprocess,
  createSubprocess,
}: UseDockerHandlersProps) {
  const [state, setState] = useState<DockerControlState>({
    containerId: null,
    containerStatus: null,
    containerDetails: null,
    buildProgress: {},
    buildSuccessful: false,
    dockerfiles: [],
    selectedImage: 'Dockerfile',
  });

  const [vncReady, setVncReady] = useState(false);

  const followBuildProgress = useCallback(
    (messageId: string, subprocessId: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
        const eventSource = new EventSource(`/api/docker?buildId=${Date.now()}&apiKey=${apiKey}`);
        let buildLog = '';

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.stream) {
            buildLog += data.stream;
          }

          const lines = buildLog.split('\n').filter((line) => line.trim());
          const latestLine = lines[lines.length - 1] || '';

          updateSubprocess(messageId, subprocessId, (sp) => ({
            ...sp,
            content: buildLog,
            subtitle: latestLine,
            status: (data.status as SubprocessStatus) || 'building',
          }));

          if (data.status === 'completed') {
            eventSource.close();
            setState((prev) => ({ ...prev, buildSuccessful: true }));
            resolve(true);
          } else if (data.status === 'error') {
            console.error('Build failed');
            eventSource.close();
            setState((prev) => ({ ...prev, buildSuccessful: false }));
            resolve(false);
          }
        };

        eventSource.onerror = (error) => {
          console.error('Build event source error:', error);
          eventSource.close();
          setState((prev) => ({ ...prev, buildSuccessful: false }));
          resolve(false);
        };
      });
    },
    [updateSubprocess]
  );

  const checkVncReadiness = useCallback(async (containerId: string): Promise<boolean> => {
    try {
      // Try to connect to the VNC port
      const response = await fetch('/api/docker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY || '',
        },
        body: JSON.stringify({
          action: 'checkVncStatus',
          containerId,
        }),
      });
      const data = await response.json();
      return data.ready;
    } catch (error) {
      return false;
    }
  }, []);

  const handleBuildImage = useCallback(
    async (dockerfile: string, messageId?: string): Promise<{ success: boolean }> => {
      if (!messageId) {
        messageId = addChatMessage('log', '', 'Docker Container Setup', 'Docker');
      }

      const buildSubprocess = createSubprocess(
        'Image Build',
        'Starting build process...',
        'building'
      );
      addSubprocess(messageId, buildSubprocess);

      try {
        await dockerService.buildImage(dockerfile);

        const buildSuccess = await followBuildProgress(messageId, buildSubprocess.id);

        return { success: buildSuccess };
      } catch (error) {
        console.error('Failed to build image:', error);

        updateSubprocess(messageId, buildSubprocess.id, (sp) => ({
          ...sp,
          status: 'error',
          content: `Error: Failed to build Docker image`,
        }));

        return { success: false };
      }
    },
    [addChatMessage, followBuildProgress, updateChatMessage]
  );

  const handleStartContainer = useCallback(
    async (imageName: string, messageId?: string) => {
      if (!messageId) {
        messageId = addChatMessage('log', '', 'Docker Container Setup', 'Docker');
      }

      // Build image
      await handleBuildImage(imageName, messageId);

      // Start container
      const startSubprocess = createSubprocess(
        'Container Start',
        'Starting container...',
        'running'
      );
      addSubprocess(messageId, startSubprocess);
      try {
        const startResponse = await dockerService.startContainer(imageName);

        if (startResponse.ok) {
          setState((prev) => ({
            ...prev,
            containerId: startResponse.id ?? null,
            containerStatus: 'running',
          }));

          // Wait for VNC to be ready
          const vncSubprocess = createSubprocess(
            'VNC Setup',
            'Waiting for VNC server...',
            'running'
          );
          addSubprocess(messageId, vncSubprocess);

          let retries = 0;
          const maxRetries = 30; // 30 seconds timeout
          while (retries < maxRetries) {
            const isReady = await checkVncReadiness(startResponse.id!);
            if (isReady) {
              setVncReady(true);
              updateSubprocess(messageId, vncSubprocess.id, (sp) => ({
                ...sp,
                status: 'completed',
                content: 'VNC server is ready',
              }));
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            retries++;
          }

          if (retries >= maxRetries) {
            updateSubprocess(messageId, vncSubprocess.id, (sp) => ({
              ...sp,
              status: 'error',
              content: 'VNC server failed to start',
            }));
          }

          updateSubprocess(messageId, startSubprocess.id, (sp) => ({
            ...sp,
            status: 'completed',
            subtitle: `Container started`,
            content: `Container started with ID: ${startResponse.id}`,
          }));
        } else {
          updateSubprocess(messageId, startSubprocess.id, (sp) => ({
            ...sp,
            status: 'error',
            content: `Error: ${startResponse.message}\n${startResponse.error || ''}`,
          }));
        }
      } catch (error) {
        console.error('Failed to start container:', error);
        updateSubprocess(messageId, startSubprocess.id, (sp) => ({
          ...sp,
          status: 'error',
          content: 'Error: Failed to start Docker container',
        }));
      }
    },
    [handleBuildImage, addSubprocess, updateSubprocess, checkVncReadiness]
  );

  const handleStopContainer = useCallback(async () => {
    if (!state.containerId) return;
    try {
      const response = await dockerService.stopContainer(state.containerId);
      if (response.ok) {
        setState((prev) => ({ ...prev, containerId: null }));
        addChatMessage('log', 'Docker container stopped');
      } else {
        addChatMessage('log', `Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Failed to stop container:', error);
      addChatMessage('log', 'Error: Failed to stop Docker container');
    }
  }, [state.containerId, addChatMessage]);

  const handleDeleteContainer = useCallback(async () => {
    try {
      const response = await dockerService.deleteContainer();
      if (response.ok) {
        setState((prev) => ({
          ...prev,
          containerId: null,
          containerStatus: null,
          containerDetails: null,
        }));
        addChatMessage('log', `Docker container: ${response.message}`, 'Docker');
      } else {
        addChatMessage('log', `Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Failed to delete container:', error);
      addChatMessage('log', 'Error: Failed to delete Docker container', 'Docker');
    }
  }, [addChatMessage]);

  const fetchDockerfiles = useCallback(async () => {
    try {
      const data = await dockerService.fetchDockerfiles();
      setState((prev) => ({ ...prev, dockerfiles: data.dockerfiles }));
    } catch (error) {
      console.error('Failed to fetch Dockerfiles:', error);
      addChatMessage('log', 'Error: Failed to fetch Dockerfiles');
    }
  }, [addChatMessage]);

  const startDefaultContainer = useCallback(() => {
    const messageId = addChatMessage('log', '', 'Docker Container Setup', 'Docker');
    handleStartContainer(state.selectedImage, messageId);
  }, [handleStartContainer, state.selectedImage]);

  // Initialize dockerfiles on mount
  useEffect(() => {
    fetchDockerfiles();
  }, [fetchDockerfiles]);

  // Add container status stream handling
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const setupStatusStream = () => {
      if (state.containerId) {
        const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
        eventSource = new EventSource(
          `/api/docker?statusId=${Date.now()}&containerId=${state.containerId}&apiKey=${apiKey}`
        );

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setState((prev) => ({
            ...prev,
            containerStatus: data.status,
            containerDetails: data.details || '',
          }));
        };

        eventSource.onerror = (error) => {
          console.error('Status EventSource failed:', error);
          eventSource?.close();
          setTimeout(setupStatusStream, 5000);
        };
      }
    };

    setupStatusStream();

    return () => {
      eventSource?.close();
    };
  }, [state.containerId]);

  return {
    ...state,
    vncReady,
    setState,
    handleBuildImage,
    handleStartContainer,
    handleStopContainer,
    handleDeleteContainer,
    startDefaultContainer,
    fetchDockerfiles,
  } as const;
}
