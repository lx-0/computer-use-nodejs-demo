import { LLMProvider } from '@/lib/llm/provider';
import { FunctionRegistry } from '@/lib/llm/registry';
import {
  AVAILABLE_MODELS,
  FunctionDefinition,
  LLMConfig,
  LLMRequestOptions,
} from '@/lib/llm/types';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

export class LLMService {
  private static instance: LLMService;
  private providers: Map<string, LLMProvider>;
  private registry: FunctionRegistry;

  private constructor() {
    this.providers = new Map();
    this.registry = FunctionRegistry.getInstance();
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  private getProvider(modelId: string): LLMProvider {
    if (!this.providers.has(modelId)) {
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      const config: LLMConfig = {
        provider: model.provider,
        model: model.id,
        apiKey: this.getApiKey(model.provider),
        temperature: 0.7,
        maxTokens: model.maxOutputTokens,
      };

      this.providers.set(modelId, new LLMProvider(config));
    }

    return this.providers.get(modelId)!;
  }

  private getApiKey(provider: string): string {
    const key =
      provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error(`No API key found for provider ${provider}`);
    }

    return key;
  }

  public async sendMessage(message: string, modelId: string, options?: LLMRequestOptions) {
    try {
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      // Ensure history contains valid Langchain message types
      const history = options?.history?.filter(
        (msg) =>
          msg instanceof HumanMessage || msg instanceof AIMessage || msg instanceof SystemMessage
      );

      const provider = this.getProvider(modelId);
      return await provider.generateResponse(message, {
        ...options,
        history,
        maxTokens: model.maxOutputTokens,
      });
    } catch (error) {
      throw new Error(
        `LLM Service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public registerFunction(definition: FunctionDefinition): void {
    this.registry.register(definition);
    // Register function with all providers
    this.providers.forEach((provider) => {
      provider.registerFunction(definition);
    });
  }

  public listFunctions(): FunctionDefinition[] {
    return this.registry.list();
  }

  public getFunction(name: string): FunctionDefinition | undefined {
    return this.registry.get(name);
  }
}
