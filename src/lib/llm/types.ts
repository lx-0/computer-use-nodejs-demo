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
