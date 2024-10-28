import { ChatInput } from '@/components/chat/ChatInput';
import ChatMessage from '@/components/chat/ChatMessage';
import { DockerMenu } from '@/components/chat/DockerMenu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useDockerHandlers } from '@/hooks/useDockerHandlers';
import { cn } from '@/lib/utils';
import { Settings as SettingsIcon } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import ChatCopyButton from './ChatCopyButton';

interface ChatComponentProps {
  isLocalMode: boolean;
  setIsLocalMode: (value: boolean) => void;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  onVncReady: (ready: boolean) => void;
}

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

const ChatComponent: React.FC<ChatComponentProps> = ({
  isLocalMode,
  setIsLocalMode,
  isSettingsOpen,
  toggleSettings,
  onVncReady,
}) => {
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
    if (inputMessage.trim()) {
      addChatMessage('user', inputMessage);
      setInputMessage('');
      // Simulated response
      setTimeout(() => {
        addChatMessage('assistant', `I received your message: "${inputMessage}"`);
      }, 1000);
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
        <ChatInput value={inputMessage} onChange={setInputMessage} onSend={handleSendMessage} />
      </CardContent>
    </Card>
  );
};

export default ChatComponent;
