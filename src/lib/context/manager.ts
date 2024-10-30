import { ContextWindow, Message, Tokenizer } from './types';

interface ContextManager {
  window: ContextWindow;
  tokenizer: Tokenizer;

  addMessage(msg: Message): void;
  pruneHistory(): void;
  getContextForModel(modelId: string): Message[];
}
