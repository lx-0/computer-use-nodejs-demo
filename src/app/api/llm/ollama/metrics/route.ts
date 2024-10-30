import { OllamaService } from '@/lib/llm/api/ollama';
import { ModelResourceMetrics } from '@/lib/llm/types';
import { NextApiRequest, NextApiResponse } from 'next';

type MetricsResponse = ModelResourceMetrics | { message: string };

export async function GET(req: NextApiRequest, res: NextApiResponse<MetricsResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { modelId } = req.query;

  if (typeof modelId !== 'string') {
    return res.status(400).json({ message: 'Model ID is required' });
  }

  try {
    const ollama = OllamaService.getInstance();
    const metrics = await ollama.getModelMetrics(modelId);
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Failed to fetch model metrics:', error);
    res.status(500).json({ message: 'Failed to fetch model metrics' });
  }
}
