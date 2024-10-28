import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { FunctionDefinition, LLMConfig, LLMRequestOptions, LLMResponse } from './types';

export interface GenerateOptions {
  functions?: string[];
  stream?: boolean;
  maxTokens?: number;
  history?: Array<HumanMessage | AIMessage | SystemMessage>;
}

export class LLMProvider {
  private config: LLMConfig;
  private model: BaseChatModel;
  private functions: Map<string, FunctionDefinition>;

  constructor(config: LLMConfig) {
    this.config = config;
    this.functions = new Map();
    this.model = this.initializeModel();
  }

  private initializeModel(): BaseChatModel {
    switch (this.config.provider) {
      case 'openai':
        return new ChatOpenAI({
          modelName: this.config.model,
          openAIApiKey: this.config.apiKey,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });
      case 'anthropic':
        return new ChatAnthropic({
          modelName: this.config.model,
          anthropicApiKey: this.config.apiKey,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  public registerFunction(definition: FunctionDefinition) {
    this.functions.set(definition.name, definition);
  }

  public async generateResponse(prompt: string, options?: LLMRequestOptions): Promise<LLMResponse> {
    try {
      const messages = [
        ...(Array.isArray(options?.history) ? options.history : []),
        new HumanMessage({ content: prompt }),
      ];

      const response = await this.model.invoke(messages);

      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      return {
        content,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      console.error('Provider error:', error);
      throw new Error(
        `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
