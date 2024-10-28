import { LLMConfig } from '@/lib/llm/types';

export const defaultLLMConfig: Omit<LLMConfig, 'apiKey'> = {
  provider: 'anthropic',
  model: 'claude-3-sonnet-20240229',
  temperature: 0.7,
  maxTokens: 4096,
};
