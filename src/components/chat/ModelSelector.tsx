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
import { cn } from '@/lib/utils';
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
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Select model">{selectedModelInfo?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[300px]">
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
            <SelectLabel className="px-6 text-sm font-semibold capitalize">{provider}</SelectLabel>
            {providerModels.map((model) => (
              <SelectItem
                key={model.id}
                value={model.id}
                className={cn('py-3 px-6', 'focus:bg-accent', 'data-[state=checked]:bg-accent')}
              >
                <div className="grid gap-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{model.name}</span>
                    {model.trainingCutOffDate && (
                      <span className="text-xs text-muted-foreground">
                        Updated: {model.trainingCutOffDate}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/70">
                    <span>{model.id}</span>
                    <span>{(model.contextWindow / 1000).toFixed(0)}k ctx</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
