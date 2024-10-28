import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AVAILABLE_MODELS } from '@/lib/llm/types';
import React, { KeyboardEvent } from 'react';
import { ModelSelector } from './ModelSelector';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  selectedModel,
  onModelSelect,
}) => {
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <ModelSelector
          models={AVAILABLE_MODELS}
          selectedModel={selectedModel}
          onModelSelect={onModelSelect}
        />
      </div>
      <div className="flex">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          className="flex-grow mr-2"
        />
        <Button onClick={onSend}>Send</Button>
      </div>
    </div>
  );
};
