export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  required?: string[];
}
