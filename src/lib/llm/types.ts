import { ChatMessageData } from '@/components/chat/ChatMessage';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

// Core LLM types
export type LLMProvider = 'openai' | 'anthropic' | 'local';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  required?: string[];
}

export interface LLMResponse {
  content: string;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  maxOutputTokens: number;
  trainingCutOffDate?: string;
  description?: string;
}

const createModel = (
  id: string,
  name: string,
  provider: LLMProvider,
  contextWindow: number,
  maxOutputTokens: number,
  description: string,
  trainingCutOffDate?: string
): LLMModel => ({
  id,
  name,
  provider,
  contextWindow,
  maxOutputTokens,
  trainingCutOffDate,
  description,
});

export const AVAILABLE_MODELS: LLMModel[] = [
  // Anthropic Models

  createModel(
    'claude-3-5-sonnet-20241022',
    'Claude 3.5 Sonnet',
    'anthropic',
    200000,
    8192,
    'Improved version of Sonnet with enhanced capabilities',
    'Apr 2024'
  ),
  // createModel(
  //   'claude-3-opus-20240229',
  //   'Claude 3 Opus',
  //   'anthropic',
  //   200000,
  //   4096,
  //   'Most powerful model, best for complex tasks and reasoning',
  //   'Aug 2023'
  // ),
  // createModel(
  //   'claude-3-sonnet-20240229',
  //   'Claude 3 Sonnet',
  //   'anthropic',
  //   200000,
  //   4096,
  //   'Balanced performance and speed',
  //   'Aug 2023'
  // ),
  createModel(
    'claude-3-haiku-20240307',
    'Claude 3 Haiku',
    'anthropic',
    200000,
    4096,
    'Fastest model, optimized for quick responses',
    'Aug 2023'
  ),

  // OpenAI Models (March 2024)
  createModel(
    'gpt-4o',
    'GPT-4o',
    'openai',
    128000,
    16384,
    'High-intelligence flagship model for complex, multi-step tasks. Multimodal.',
    'Oct 2023'
  ),
  createModel(
    'gpt-4o-mini',
    'GPT-4o-mini',
    'openai',
    128000,
    16384,
    'Affordable and intelligent small model for fast, lightweight tasks',
    'Oct 2023'
  ),
  // createModel(
  //   'o1-preview',
  //   'o1-preview',
  //   'openai',
  //   128000,
  //   32768,
  //   'Reasoning model designed to solve hard problems across domains',
  //   'Oct 2023'
  // ),
  // createModel(
  //   'o1-mini',
  //   'o1-mini',
  //   'openai',
  //   128000,
  //   65536,
  //   'Faster and cheaper reasoning model particularly good at coding, math, and science',
  //   'Oct 2023'
  // ),
];

// Sort models by provider and capability
export const AVAILABLE_MODELS_SORTED = AVAILABLE_MODELS.sort((a, b) => {
  // First sort by provider
  if (a.provider !== b.provider) {
    return a.provider.localeCompare(b.provider);
  }
  // Then by context window size (larger first)
  return b.contextWindow - a.contextWindow;
});

// Chat Memory Types
export interface ChatMemory {
  messages: BaseMessage[]; // Changed from ChatMessage[] to BaseMessage[]
  returnMessages: boolean;
  maxTokens?: number;
}

export interface ChatMessageHistory {
  addMessage(message: BaseMessage): Promise<void>;
  getMessages(): Promise<BaseMessage[]>;
  clear(): Promise<void>;
}

export interface LLMRequestOptions {
  stream?: boolean;
  functions?: string[];
  history?: Array<HumanMessage | AIMessage | SystemMessage>;
  maxTokens?: number;
}

// Convert our message types to Langchain message types
export function convertToLangchainMessage(
  message: ChatMessageData
): HumanMessage | AIMessage | SystemMessage | null {
  // Skip log messages
  if (message.type === 'log') {
    return null;
  }

  switch (message.type) {
    case 'assistant':
      return new AIMessage({ content: message.content });
    case 'system':
      return new SystemMessage({ content: message.content });
    case 'user':
      return new HumanMessage({ content: message.content });
    default:
      return null;
  }
}

// Helper type for message roles
export type MessageRole = 'human' | 'assistant' | 'system';

// Helper function to create messages with proper typing
export function createMessage(content: string, role: MessageRole): BaseMessage {
  switch (role) {
    case 'assistant':
      return new AIMessage(content);
    case 'system':
      return new SystemMessage(content);
    case 'human':
    default:
      return new HumanMessage({ content });
  }
}
