import { ChatInput } from '@/components/chat/ChatInput';
import ChatMessage from '@/components/chat/ChatMessage';
import { DockerMenu } from '@/components/chat/DockerMenu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useDockerHandlers } from '@/hooks/useDockerHandlers';
import { AVAILABLE_MODELS } from '@/lib/llm/types';
import { cn } from '@/lib/utils';
import { LLMApiService } from '@/services/llm-api.service';
import { Settings as SettingsIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ChatCopyButton from './ChatCopyButton';

interface ChatComponentProps {
  isLocalMode: boolean;
  setIsLocalMode: (value: boolean) => void;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  onVncReady: (ready: boolean) => void;
}

const ChatComponent: React.FC<ChatComponentProps> = ({
  isLocalMode,
  setIsLocalMode,
  isSettingsOpen,
  toggleSettings,
  onVncReady,
}) => {
  const llmApiService = LLMApiService.getInstance();
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);

  const {
    chatMessages,
    inputMessage,
    setInputMessage,
    addChatMessage,
    updateChatMessage,
    toggleMessageExpansion,
    toggleSubprocessExpansion,
    createSubprocess,
    updateSubprocess,
    addSubprocess,
  } = useChatMessages();

  const {
    containerId,
    containerStatus,
    containerDetails,
    buildProgress,
    buildSuccessful,
    dockerfiles,
    vncReady,
    handleBuildImage,
    handleStartContainer,
    handleStopContainer,
    handleDeleteContainer,
    startDefaultContainer,
  } = useDockerHandlers({
    createSubprocess,
    addChatMessage,
    updateChatMessage,
    updateSubprocess,
    addSubprocess,
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize container on mount
  useEffect(() => {
    startDefaultContainer();
  }, [startDefaultContainer]);

  // Add effect to propagate VNC ready state
  useEffect(() => {
    onVncReady(vncReady);
  }, [vncReady, onVncReady]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Find the selected model info
    const selectedModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

    const userMessageId = addChatMessage('user', inputMessage);
    setInputMessage('');

    try {
      const response = await llmApiService.sendMessage(inputMessage, selectedModel, {
        stream: false,
      });
      addChatMessage('assistant', response.content, undefined, undefined, selectedModelInfo);
    } catch (error) {
      console.error('API error:', error);
      addChatMessage(
        'system',
        'Failed to get response from API. Please try again.',
        'Error',
        'API'
      );
    }
  };

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  return (
    <Card className={cn('flex flex-col h-full')}>
      <CardHeader className="flex-shrink-0 flex justify-between items-center">
        <CardTitle>LLM-Controlled Computer</CardTitle>
        <div className="ml-auto flex items-center space-x-2">
          <DockerMenu
            containerStatus={containerStatus}
            containerDetails={containerDetails}
            dockerfiles={dockerfiles}
            onStartContainer={handleStartContainer}
            onStopContainer={handleStopContainer}
            onDeleteContainer={handleDeleteContainer}
            onBuildImage={handleBuildImage}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSettings}
            aria-label={isSettingsOpen ? 'Close Settings' : 'Open Settings'}
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden flex flex-col">
        <div className="flex-grow overflow-hidden relative">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            {chatMessages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                index={index}
                buildProgress={buildProgress}
                toggleMessageExpansion={toggleMessageExpansion}
                toggleSubprocessExpansion={toggleSubprocessExpansion}
              />
            ))}
          </ScrollArea>
          <ChatCopyButton messages={chatMessages} />
        </div>
        <ChatInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={handleSendMessage}
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
        />
      </CardContent>
    </Card>
  );
};

export default ChatComponent;
