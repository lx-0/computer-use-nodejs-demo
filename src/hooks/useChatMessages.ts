import { ChatMessageData, Subprocess, SubprocessStatus } from '@/components/chat/ChatMessage';
import { useCallback, useState } from 'react';

type SubprocessUpdater = (subprocess: Subprocess) => Subprocess;

export const useChatMessages = () => {
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');

  const addChatMessage = useCallback(
    (
      type: ChatMessageData['type'],
      content: string,
      title?: string,
      service?: string,
      isExpanded = true
    ) => {
      const newMessage: ChatMessageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        content,
        title,
        service,
        subprocesses: [],
        isExpanded,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, newMessage]);
      return newMessage.id;
    },
    []
  );

  const updateChatMessage = useCallback((messageId: string, update: Partial<ChatMessageData>) => {
    setChatMessages((prev) => {
      const newMessages = [...prev];
      const messageIndex = newMessages.findIndex((msg) => msg.id === messageId);

      if (messageIndex >= 0) {
        const currentMessage = newMessages[messageIndex];

        // Handle subprocess updates
        if (update.subprocesses) {
          const existingSubprocesses = new Map(
            currentMessage.subprocesses.map((sp) => [sp.id, sp])
          );
          update.subprocesses.forEach((newSp) => {
            existingSubprocesses.set(newSp.id, newSp);
          });
          newMessages[messageIndex] = {
            ...currentMessage,
            ...update,
            subprocesses: Array.from(existingSubprocesses.values()),
          };
        } else {
          newMessages[messageIndex] = {
            ...currentMessage,
            ...update,
          };
        }
      }
      return newMessages;
    });
  }, []);

  const toggleMessageExpansion = useCallback((messageId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, isExpanded: !msg.isExpanded } : msg))
    );
  }, []);

  const createSubprocess = useCallback(
    (title: string, content: string, status: SubprocessStatus): Subprocess => ({
      id: `subprocess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      status,
      isExpanded: false,
    }),
    []
  );

  const addSubprocess = useCallback((messageId: string, subprocess: Subprocess) => {
    setChatMessages((prev) => {
      const newMessages = [...prev];
      const messageIndex = newMessages.findIndex((msg) => msg.id === messageId);

      if (messageIndex >= 0) {
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          subprocesses: [...newMessages[messageIndex].subprocesses, subprocess],
        };
      }
      return newMessages;
    });
  }, []);

  const updateSubprocess = useCallback(
    (messageId: string, subprocessId: string, updater: SubprocessUpdater) => {
      setChatMessages((prev) => {
        const newMessages = [...prev];
        const messageIndex = newMessages.findIndex((msg) => msg.id === messageId);

        if (messageIndex >= 0) {
          const message = newMessages[messageIndex];
          const subprocessIndex = message.subprocesses.findIndex((sp) => sp.id === subprocessId);

          if (subprocessIndex >= 0) {
            const newSubprocesses = [...message.subprocesses];
            newSubprocesses[subprocessIndex] = updater(newSubprocesses[subprocessIndex]);

            newMessages[messageIndex] = {
              ...message,
              subprocesses: newSubprocesses,
            };
          }
        }
        return newMessages;
      });
    },
    []
  );

  const toggleSubprocessExpansion = useCallback((messageId: string, subprocessId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              subprocesses: msg.subprocesses.map((sp) =>
                sp.id === subprocessId ? { ...sp, isExpanded: !sp.isExpanded } : sp
              ),
            }
          : msg
      )
    );
  }, []);

  return {
    chatMessages,
    inputMessage,
    setInputMessage,
    addChatMessage,
    updateChatMessage,
    updateSubprocess,
    addSubprocess,
    createSubprocess,
    toggleMessageExpansion,
    toggleSubprocessExpansion,
  } as const;
};
