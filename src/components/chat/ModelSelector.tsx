import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OllamaClient } from '@/lib/llm/ollama-client';
import { AVAILABLE_MODELS, LLMModel } from '@/lib/llm/types';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelSelect }) => {
  const [installedLocalModels, setInstalledLocalModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch installed local models
  useEffect(() => {
    const fetchLocalModels = async () => {
      try {
        const client = OllamaClient.getInstance();
        const models = await client.listModels();
        setInstalledLocalModels(models.map((m) => m.id));
      } catch (error) {
        console.error('Failed to fetch local models:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocalModels();
  }, []);

  const selectedModelInfo = AVAILABLE_MODELS.find((model) => model.id === selectedModel);

  // Filter models based on installation status
  const modelsByProvider = AVAILABLE_MODELS.reduce(
    (acc, model) => {
      // Include non-local models and installed local models
      if (model.provider !== 'local' || installedLocalModels.includes(model.id)) {
        const provider = model.provider;
        if (!acc[provider]) acc[provider] = [];
        acc[provider].push(model);
      }
      return acc;
    },
    {} as Record<string, LLMModel[]>
  );

  // Get local models that need to be downloaded
  const downloadableModels = AVAILABLE_MODELS.filter(
    (model) => model.provider === 'local' && !installedLocalModels.includes(model.id)
  );

  return (
    <Select value={selectedModel} onValueChange={onModelSelect}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Select model">{selectedModelInfo?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[300px]">
        {/* Available Models */}
        {Object.entries(modelsByProvider).map(([provider, models]) => (
          <SelectGroup key={provider}>
            <SelectLabel className="px-6 text-sm font-semibold capitalize">{provider}</SelectLabel>
            {models.map((model) => (
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
                    <span>{(model.contextLength / 1000).toFixed(0)}k ctx</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}

        {/* Downloadable Local Models */}
        {downloadableModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="px-6 text-sm font-semibold text-muted-foreground">
              Available for Download
            </SelectLabel>
            {downloadableModels.map((model) => (
              <div
                key={model.id}
                className="py-3 px-6 opacity-50 cursor-not-allowed hover:bg-accent/50"
              >
                <div className="grid gap-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Download className="h-3 w-3" />
                      {model.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Download this model in Settings to use it
                  </span>
                </div>
              </div>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
};
