import { ChatMessageData } from '@/components/chat/ChatMessage';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

// Core LLM types
export type LLMProvider = 'openai' | 'anthropic' | 'local';

// Add Ollama-specific types
export interface OllamaConfig {
  baseUrl: string;
  numGpu?: number;
  threads?: number;
  contextSize?: number;
  // Ollama-specific parameters
  parameters?: {
    numPredict?: number;
    topK?: number;
    topP?: number;
    temperature?: number;
    repeatPenalty?: number;
  };
}

// Update LLMConfig to include Ollama settings
export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string; // Optional now as local models don't need it
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  ollamaConfig?: OllamaConfig; // Add Ollama configuration
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

// Base model information interface that all providers should implement
export interface BaseModelInfo {
  id: string;
  name: string;
  provider: LLMProvider;
  size?: number; // in MB
  status: 'not_downloaded' | 'downloading' | 'ready' | 'error';
  modified_at?: string;
  contextLength: number;
  quantization?: string;
  description?: string;
}

// Ollama-specific model information
export interface OllamaModelInfo extends BaseModelInfo {
  provider: 'local';
  digest: string; // Ollama-specific
  modified_at: string; // Required for Ollama
}

// Update the LLMModel interface to extend BaseModelInfo
export interface LLMModel extends BaseModelInfo {
  maxOutputTokens: number;
  trainingCutOffDate?: string;
}

const createModel = (
  id: string,
  name: string,
  provider: LLMProvider,
  contextLength: number,
  maxOutputTokens: number,
  description: string,
  trainingCutOffDate?: string
): LLMModel => ({
  id,
  name,
  provider,
  contextLength,
  maxOutputTokens,
  description,
  trainingCutOffDate,
  status: 'not_downloaded', // Default status
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

  // Local Models (via Ollama)
  createModel(
    'nemotron:latest',
    'Nemotron 70B',
    'local',
    32768,
    4096,
    "NVIDIA's latest open model. Optimized for enterprise use, strong at reasoning and coding. 70B parameters.",
    'Oct 2024'
  ),
  createModel(
    'nemotron-mini:latest',
    'Nemotron Mini 4B',
    'local',
    16384,
    4096,
    'Lightweight version of Nemotron. 4B parameters, efficient for everyday tasks.',
    'Oct 2024'
  ),
  createModel(
    'llama3.2:3b',
    'Llama 3.2 3B',
    'local',
    4096,
    2048,
    'Latest Llama model optimized for efficiency. Good balance of performance and resource usage.',
    'Oct 2024'
  ),
];

// Sort models by provider and capability
export const AVAILABLE_MODELS_SORTED = AVAILABLE_MODELS.sort((a, b) => {
  // First sort by provider
  if (a.provider !== b.provider) {
    return a.provider.localeCompare(b.provider);
  }
  // Then by context window size (larger first)
  return b.contextLength - a.contextLength;
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

// Update OllamaModelStatus to include timestamp
export interface OllamaModelStatus {
  name: string;
  status: 'checking' | 'ready' | 'downloading' | 'error';
  progress?: number;
  error?: string;
  downloadedSize?: number;
  totalSize?: number;
  lastUpdated: Date;
  timestamp?: string; // Add timestamp for event stream messages
  metrics?: ModelResourceMetrics;
}

// Generic model types that can be used across providers
export interface ModelResourceMetrics {
  memoryUsage: number; // in MB
  gpuMemoryUsage?: number; // in MB
  gpuUtilization?: number; // percentage
  temperature?: number; // in Celsius
}

// Add API response types for better type safety
export interface OllamaHealthResponse {
  healthy: boolean;
}

export interface OllamaListResponse {
  models: OllamaModelInfo[];
}

export interface OllamaMetricsResponse {
  memoryUsage: number;
  gpuMemoryUsage?: number;
  gpuUtilization?: number;
  temperature?: number;
}

export interface OllamaPullResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}
