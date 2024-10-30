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
    const models = await ollama.listModels();
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to list models:', error);
    return NextResponse.json({ models: [] });
  }
}
