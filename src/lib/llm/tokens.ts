import { getMessageContent } from '@/lib/llm/utils/langchain';
import { BaseMessage } from '@langchain/core/messages';
import { getEncoding, Tiktoken } from 'js-tiktoken';
import { LLMProvider } from './types';

export class TokenCounter {
  private static instance: TokenCounter;
  private encoders: Map<string, Tiktoken>;

  private constructor() {
    this.encoders = new Map();
  }

  public static getInstance(): TokenCounter {
    if (!TokenCounter.instance) {
      TokenCounter.instance = new TokenCounter();
    }
    return TokenCounter.instance;
  }

  public async countTokens(text: string, provider: LLMProvider): Promise<number | undefined> {
    if (provider === 'anthropic') {
      // Use Claude's token counting approximation
      return Math.ceil(text.length / 4);
    }

    // OpenAI uses tiktoken
    const encoder = await this.getEncoder(provider);
    return encoder?.encode(text).length;
  }

  public async countMessageTokens(messages: BaseMessage[], provider: LLMProvider): Promise<number> {
    let totalTokens = 0;
    for (const message of messages) {
      totalTokens += (await this.countTokens(getMessageContent(message), provider)) ?? 0;
    }
    return totalTokens;
  }

  private async getEncoder(provider: LLMProvider) {
    if (!this.encoders.has(provider)) {
      this.encoders.set(provider, await getEncoding('cl100k_base'));
    }
    return this.encoders.get(provider);
  }
}
