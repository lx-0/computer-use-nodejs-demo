import { BaseMessage } from '@langchain/core/messages';

export interface ContextWindow {
  maxTokens: number;
  currentTokens: number;
  messages: BaseMessage[];
}

export interface Tokenizer {
  countTokens(text: string): Promise<number>;
  countMessageTokens(messages: BaseMessage[]): Promise<number>;
}

export type Message = BaseMessage;
