import { OllamaService } from '@/lib/llm/ollama';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest): Promise<Response> {
  const searchParams = req.nextUrl.searchParams;
  const apiKey = searchParams.get('apiKey');

  // Validate API key
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ollama = OllamaService.getInstance();
    const isHealthy = await ollama.checkHealth();
    return NextResponse.json({ healthy: isHealthy });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ healthy: false });
  }
}
