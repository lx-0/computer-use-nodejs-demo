import { FunctionDefinition } from '@/lib/functions/types';

export class FunctionRegistry {
  private static instance: FunctionRegistry;
  private functions: Map<string, FunctionDefinition>;

  private constructor() {
    this.functions = new Map();
  }

  public static getInstance(): FunctionRegistry {
    if (!FunctionRegistry.instance) {
      FunctionRegistry.instance = new FunctionRegistry();
    }
    return FunctionRegistry.instance;
  }

  public register(definition: FunctionDefinition): void {
    // Validate schema
    this.functions.set(definition.name, definition);
  }

  public get(name: string): FunctionDefinition | undefined {
    return this.functions.get(name);
  }

  public list(): FunctionDefinition[] {
    return Array.from(this.functions.values());
  }
}
