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
  description?: string;
}

const createModel = (
  id: string,
  name: string,
  provider: LLMProvider,
  contextWindow: number,
  description: string
): LLMModel => ({
  id,
  name,
  provider,
  contextWindow,
  description,
});

export const AVAILABLE_MODELS: LLMModel[] = [
  createModel(
    'claude-3-sonnet-20240229',
    'Claude 3 Sonnet',
    'anthropic',
    200000,
    'Balanced model for most tasks'
  ),
  createModel('claude-3-opus-20240229', 'Claude 3 Opus', 'anthropic', 200000, 'Most capable model'),
  createModel('gpt-4-turbo-preview', 'GPT-4 Turbo', 'openai', 128000, 'Latest GPT-4 model'),
];
