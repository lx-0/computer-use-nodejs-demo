import { EventEmitter } from 'events';
import {
  OllamaHealthResponse,
  OllamaListResponse,
  OllamaMetricsResponse,
  OllamaModelInfo,
  OllamaModelStatus,
} from './types';

export class OllamaClient {
  private static instance: OllamaClient;
  private modelStatusEmitter: EventEmitter;
  private modelStatuses: Map<string, OllamaModelStatus>;
  private apiKey: string;

  private constructor() {
    this.modelStatusEmitter = new EventEmitter();
    this.modelStatuses = new Map();
    this.apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
  }

  public static getInstance(): OllamaClient {
    if (!OllamaClient.instance) {
      OllamaClient.instance = new OllamaClient();
    }
    return OllamaClient.instance;
  }

  public async listModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await fetch(`/api/llm/ollama/list?apiKey=${this.apiKey}`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = (await response.json()) as OllamaListResponse;
      return data.models;
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`/api/llm/ollama/health?apiKey=${this.apiKey}`);
      if (!response.ok) return false;
      const data = (await response.json()) as OllamaHealthResponse;
      return data.healthy;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  public async getModelMetrics(modelId: string): Promise<OllamaMetricsResponse> {
    try {
      const response = await fetch(
        `/api/llm/ollama/metrics?modelId=${modelId}&apiKey=${this.apiKey}`
      );
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch model metrics:', error);
      return { memoryUsage: 0 };
    }
  }

  public setupModelStatusStream(modelId: string): EventSource {
    const eventSource = new EventSource(
      `/api/llm/ollama/status?modelId=${modelId}&apiKey=${this.apiKey}`
    );

    eventSource.onmessage = (event) => {
      try {
        const status = JSON.parse(event.data) as OllamaModelStatus;
        this.updateModelStatus(modelId, status);
      } catch (error) {
        console.error('Failed to parse status update:', error);
      }
    };

    return eventSource;
  }

  public setupPullStream(modelId: string): EventSource {
    return new EventSource(`/api/llm/ollama/pull?modelId=${modelId}&apiKey=${this.apiKey}`);
  }

  public subscribeToModelStatus(
    modelId: string,
    callback: (status: OllamaModelStatus) => void
  ): () => void {
    const handleStatusUpdate = (_modelId: string, status: OllamaModelStatus) => {
      if (_modelId === modelId) {
        callback(status);
      }
    };

    this.modelStatusEmitter.on('statusUpdate', handleStatusUpdate);
    return () => {
      this.modelStatusEmitter.off('statusUpdate', handleStatusUpdate);
    };
  }

  private updateModelStatus(modelId: string, status: Partial<OllamaModelStatus>): void {
    const currentStatus = this.modelStatuses.get(modelId) || {
      name: modelId,
      status: 'checking',
      lastUpdated: new Date(),
    };

    const newStatus: OllamaModelStatus = {
      ...currentStatus,
      ...status,
      lastUpdated: new Date(),
    };

    this.modelStatuses.set(modelId, newStatus);
    this.modelStatusEmitter.emit('statusUpdate', modelId, newStatus);
  }

  public getModelStatus(modelId: string): OllamaModelStatus | undefined {
    return this.modelStatuses.get(modelId);
  }
}
