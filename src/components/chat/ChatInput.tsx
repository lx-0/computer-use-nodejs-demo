import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React, { KeyboardEvent } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend }) => {
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
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
  );
};
