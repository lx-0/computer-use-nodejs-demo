import { FunctionDefinition } from '../llm/types';

interface FunctionRegistry {
  functions: Map<string, FunctionDefinition>;

  register(def: FunctionDefinition): void;
  validate(name: string, params: unknown): boolean;
  execute(name: string, params: unknown): Promise<unknown>;
}
