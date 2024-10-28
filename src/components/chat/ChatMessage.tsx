import LogDetailsBlock from '@/components/chat/LogDetailsBlock';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  XCircle,
} from 'lucide-react';
import React from 'react';

export type MessageType = 'log' | 'user' | 'assistant' | 'system';
export type SubprocessStatus = 'building' | 'completed' | 'error' | 'running' | 'stopped';

export interface Subprocess {
  id: string;
  title: string;
  content: string;
  subtitle?: string;
  status: SubprocessStatus;
  isExpanded: boolean;
}

export interface ChatMessageData {
  id: string;
  type: MessageType;
  service?: string;
  title?: string;
  content: string;
  subprocesses: Subprocess[];
  isExpanded?: boolean;
  timestamp?: Date; // Add timestamp
}

interface ChatMessageProps {
  message: ChatMessageData;
  index: number;
  buildProgress: { [key: string]: string };
  toggleMessageExpansion: (messageId: string) => void;
  toggleSubprocessExpansion: (messageId: string, subprocessId: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  buildProgress,
  toggleMessageExpansion,
  toggleSubprocessExpansion,
}) => {
  // Only render special log messages if it's a log type
  if (message.type === 'log') {
    return (
      <div className="mb-4 px-4">
        <div className="flex flex-col max-w-[80%]">
          <span className="text-xs text-muted-foreground mb-1 px-2">
            {message.type} •{' '}
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
          </span>
          <div className="rounded-lg bg-muted/50 p-4">
            <div
              className="cursor-pointer flex flex-col"
              onClick={() => toggleMessageExpansion(message.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {message.service && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {message.service}
                    </span>
                  )}
                  {message.isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {message.title && <h3 className="text-sm font-semibold mb-1">{message.title}</h3>}
            </div>

            {message.isExpanded && message.subprocesses.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.subprocesses.map((subprocess) => (
                  <div key={subprocess.id} className="pl-4 border-l-2 border-muted">
                    <div
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubprocessExpansion(message.id, subprocess.id);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {subprocess.isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">{subprocess.title}</span>
                        </div>
                        {getStatusIcon(subprocess.status)}
                      </div>
                      {subprocess.subtitle && (
                        <p className="text-sm text-muted-foreground ml-5">{subprocess.subtitle}</p>
                      )}
                    </div>
                    {subprocess.isExpanded && (
                      <div className="mt-2 ml-5">
                        <LogDetailsBlock content={subprocess.content} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render chat messages (user/assistant) in WhatsApp style
  return (
    <div
      className={cn(
        'mb-4 px-4',
        message.type === 'user' ? 'flex justify-end' : 'flex justify-start'
      )}
    >
      <div className="flex flex-col max-w-[80%]">
        <span className="text-xs text-muted-foreground mb-1 px-2">
          {message.type} •{' '}
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
        </span>
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            message.type === 'user'
              ? 'bg-primary text-primary-foreground rounded-tr-none'
              : 'bg-secondary text-secondary-foreground rounded-tl-none'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  );
};

// Helper function for subprocess status icons
const getStatusIcon = (status: SubprocessStatus) => {
  switch (status) {
    case 'building':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'stopped':
      return <XCircle className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
};

export default ChatMessage;
