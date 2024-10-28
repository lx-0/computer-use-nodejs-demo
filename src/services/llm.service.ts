import { defaultLLMConfig } from '@/config/llm.config';
import { LLMProvider } from '@/lib/llm/provider';
import { FunctionRegistry } from '@/lib/llm/registry';
import { FunctionDefinition, LLMConfig } from '@/lib/llm/types';

export class LLMService {
  private static instance: LLMService;
  private provider: LLMProvider;
  private registry: FunctionRegistry;

  private constructor() {
    // Get API keys from environment
    const config: LLMConfig = {
      ...defaultLLMConfig,
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '',
    };

    if (!config.apiKey) {
      throw new Error('No API key found in environment variables');
    }

    this.provider = new LLMProvider(config);
    this.registry = FunctionRegistry.getInstance();
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  public async sendMessage(
    message: string,
    options?: {
      stream?: boolean;
      functions?: string[];
    }
  ) {
    try {
      return await this.provider.generateResponse(message, options);
    } catch (error) {
      throw new Error(
        `LLM Service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public registerFunction(definition: FunctionDefinition): void {
    this.registry.register(definition);
    this.provider.registerFunction(definition);
  }

  public listFunctions(): FunctionDefinition[] {
    return this.registry.list();
  }

  public getFunction(name: string): FunctionDefinition | undefined {
    return this.registry.get(name);
  }
}
