import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';
import React from 'react';
import { ChatMessageData } from './ChatMessage';

interface ChatCopyButtonProps {
  messages: ChatMessageData[];
}

const ChatCopyButton: React.FC<ChatCopyButtonProps> = ({ messages }) => {
  const handleCopy = async () => {
    try {
      const formattedChat = JSON.stringify(messages, null, 2);

      await navigator.clipboard.writeText(formattedChat);
      toast({ description: 'Chat history copied' });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        variant: 'destructive',
        description: 'Failed to copy chat history',
      });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 absolute bottom-2 right-2"
            onClick={handleCopy}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy Chat History</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ChatCopyButton;
