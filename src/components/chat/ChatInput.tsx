import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend }) => {
  return (
    <div className="flex">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your message..."
        className="flex-grow mr-2"
      />
      <Button onClick={onSend}>Send</Button>
    </div>
  );
};
