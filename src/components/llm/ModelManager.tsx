import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useModelManager } from '@/hooks/useModelManager';
import { LLMModel, OllamaModelStatus } from '@/lib/llm/types';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ModelStatusDisplayProps {
  modelId: string;
  status: OllamaModelStatus;
  debug?: string[];
}

const ModelStatusDisplay: React.FC<ModelStatusDisplayProps> = ({ modelId, status, debug }) => {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm">
        {status.status === 'checking' ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking</span>
          </div>
        ) : status.status === 'downloading' && status.progress ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Downloading: {Math.round(status.progress)}%</span>
          </div>
        ) : status.status === 'ready' ? (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="h-4 w-4" />
            <span>Ready</span>
          </div>
        ) : status.status === 'error' ? (
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="h-4 w-4" />
            <span>Error</span>
            {status.error && <span className="text-xs">({status.error})</span>}
          </div>
        ) : status.status === 'not_downloaded' ? (
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>Not Downloaded</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Unknown Status</span>
          </div>
        )}
      </div>
      {debug && debug.length > 0 && (
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 justify-start"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? (
              <ChevronDown className="h-4 w-4 mr-1" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1" />
            )}
            Debug Log ({debug.length} entries)
          </Button>
          {showDebug && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-32 overflow-y-auto">
              {debug.map((msg, i) => (
                <div key={i} className="font-mono">
                  {msg}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ModelManagerProps {
  modelId: string;
  model: LLMModel;
  isInstalled: boolean;
  onStatusChange: (status: OllamaModelStatus) => void;
}

export function ModelManager({ modelId, model, isInstalled, onStatusChange }: ModelManagerProps) {
  const [debug, setDebug] = useState<string[]>([]);
  const { status, handleDownload } = useModelManager(modelId, isInstalled);

  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  const addDebug = useCallback((message: string) => {
    setDebug((prev) => [...prev, `${new Date().toISOString()} - ${message}`].slice(-50));
  }, []);

  useEffect(() => {
    addDebug(`Status changed: ${status.status} (${status.progress || 0}%)`);
  }, [status, addDebug]);

  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{model.name}</span>
            <span className="text-xs text-muted-foreground">{model.description}</span>
          </div>
          <ModelStatusDisplay modelId={modelId} status={status} debug={debug} />
        </div>
        {!isInstalled && status.status === 'not_downloaded' && (
          <Button onClick={handleDownload}>Download Model</Button>
        )}
      </div>
    </Card>
  );
}
