import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LLMModel } from '@/lib/llm/types';
import React from 'react';

interface ModelSelectorProps {
  models: LLMModel[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelSelect,
}) => {
  const selectedModelInfo = models.find((model) => model.id === selectedModel);

  return (
    <Select value={selectedModel} onValueChange={onModelSelect}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Select model">{selectedModelInfo?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(
          models.reduce(
            (acc, model) => ({
              ...acc,
              [model.provider]: [...(acc[model.provider] || []), model],
            }),
            {} as Record<string, LLMModel[]>
          )
        ).map(([provider, providerModels]) => (
          <SelectGroup key={provider}>
            <SelectLabel className="capitalize">{provider}</SelectLabel>
            {providerModels.map((model) => (
              <SelectItem key={model.id} value={model.id} className="pl-6">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                  <span className="text-xs font-mono text-muted-foreground/70">{model.id}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
