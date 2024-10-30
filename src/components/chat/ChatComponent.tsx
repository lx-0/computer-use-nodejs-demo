import { ChatInput } from '@/components/chat/ChatInput';
import ChatMessage from '@/components/chat/ChatMessage';
import { DockerMenu } from '@/components/chat/DockerMenu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useDockerHandlers } from '@/hooks/useDockerHandlers';
import { AVAILABLE_MODELS, convertToLangchainMessage } from '@/lib/llm/types';
import { cn } from '@/lib/utils';
import { LLMApiService } from '@/services/llm-api.service';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

    const selectedModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
    const userMessageId = addChatMessage('user', inputMessage);
    setInputMessage('');

    try {
      // Convert and filter out log messages and nulls
      const history = chatMessages
        .map(convertToLangchainMessage)
        .filter((msg): msg is HumanMessage | AIMessage | SystemMessage => msg !== null);

      const response = await llmApiService.sendMessage(inputMessage, selectedModel, {
        stream: false,
        history,
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

  // effects on messages change
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const isThrottling = useRef(false);

  // Effect on messages change
  useEffect(() => {
    // automatically scroll to bottom of chat
    const scrollToBottom = () => {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (!isThrottling.current) {
      // Execute the function immediately
      scrollToBottom();

      // Set throttling flag to true
      isThrottling.current = true;

      // Set timeout to reset throttling after the desired period
      setTimeout(() => {
        isThrottling.current = false;
      }, 100); // Adjust the throttle duration as needed
    }
  }, [chatMessages]);

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
          <div ref={chatMessagesEndRef} />
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
