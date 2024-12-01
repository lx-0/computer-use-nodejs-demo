import { FunctionDefinition } from '@/lib/functions/types';
import { OllamaService } from '@/lib/llm/api/ollama';
import { LLMProvider } from '@/lib/llm/provider';
import { FunctionRegistry } from '@/lib/llm/registry';
import { AVAILABLE_MODELS, LLMConfig, LLMRequestOptions, OllamaModelInfo } from '@/lib/llm/types';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

/**
 * LLM Service
 *
 * This service is responsible for managing LLM providers and functions.
 * Used by backend only.
 */
export class LLMService {
  private static instance: LLMService;
  private providers: Map<string, LLMProvider>;
  private registry: FunctionRegistry;
  private ollamaService: OllamaService;

  private constructor() {
    this.providers = new Map();
    this.registry = FunctionRegistry.getInstance();
    this.ollamaService = OllamaService.getInstance();
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  private async setupLocalProvider(modelId: string): Promise<LLMProvider> {
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Check if Ollama is healthy
    const isHealthy = await this.ollamaService.checkHealth();
    if (!isHealthy) {
      throw new Error('Ollama service is not available');
    }

    // Check if model is available locally
    const availableModels = await this.ollamaService.listModels();
    const modelExists = availableModels.some((m) => m.name === modelConfig.id);

    // Pull model if not available
    if (!modelExists) {
      const pulled = await this.ollamaService.pullModel(modelConfig.id);
      if (!pulled) {
        throw new Error(`Failed to pull model ${modelConfig.id}`);
      }
    }

    const config: LLMConfig = {
      provider: 'local',
      model: modelConfig.id,
      temperature: 0.7,
      maxTokens: modelConfig.maxOutputTokens,
      ollamaConfig: {
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        parameters: {
          temperature: 0.7,
          numPredict: modelConfig.maxOutputTokens,
          topK: 40,
          topP: 0.9,
          repeatPenalty: 1.1,
        },
      },
    };

    return new LLMProvider(config);
  }

  private async getProvider(modelId: string): Promise<LLMProvider> {
    const provider = this.providers.get(modelId);
    if (provider) {
      return provider;
    }

    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (modelConfig.provider === 'local') {
      const provider = await this.setupLocalProvider(modelId);
      this.providers.set(modelId, provider);
      return provider;
    } else {
      const config: LLMConfig = {
        provider: modelConfig.provider,
        model: modelConfig.id,
        apiKey: this.getApiKey(modelConfig.provider),
        temperature: 0.7,
        maxTokens: modelConfig.maxOutputTokens,
      };
      const provider = new LLMProvider(config);
      this.providers.set(modelId, provider);
      return provider;
    }
  }

  private getApiKey(provider: string): string {
    const key =
      provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;

    if (!key) {
      throw new Error(`No API key found for provider ${provider}`);
    }

    return key;
  }

  public async getLocalModels(): Promise<OllamaModelInfo[]> {
    return this.ollamaService.listModels();
  }

  public async sendMessage(message: string, modelId: string, options?: LLMRequestOptions) {
    try {
      const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (!modelConfig) {
        throw new Error(`Model ${modelId} not found`);
      }

      // Ensure history contains valid Langchain message types
      const history = options?.history?.filter(
        (msg) =>
          msg instanceof HumanMessage || msg instanceof AIMessage || msg instanceof SystemMessage
      );

      const provider = await this.getProvider(modelId);
      return await provider.generateResponse(message, {
        ...options,
        history,
        maxTokens: modelConfig.maxOutputTokens,
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
