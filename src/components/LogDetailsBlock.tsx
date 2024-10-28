import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';
import React from 'react';

interface LogDetailsBlockProps {
  content: string;
}

const LogDetailsBlock: React.FC<LogDetailsBlockProps> = ({ content }) => {
  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        toast({
          title: 'Copied to clipboard',
          description: 'The log details have been copied to your clipboard.',
        });
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        toast({
          title: 'Copy failed',
          description: 'Failed to copy the log details to clipboard.',
          variant: 'destructive',
        });
      });
  };

  return (
    <div className="mt-2 bg-gray-100 rounded relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10"
        onClick={copyToClipboard}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <div className="p-2 pt-10 pb-10">
        <pre className="whitespace-pre-wrap font-mono text-xs break-words">{content}</pre>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute bottom-2 right-2 z-10"
        onClick={copyToClipboard}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default LogDetailsBlock;
