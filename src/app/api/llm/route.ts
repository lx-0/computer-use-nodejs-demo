import { LLMService } from '@/services/llm.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message, modelId, options } = await req.json();

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    const llmService = LLMService.getInstance();
    const response = await llmService.sendMessage(message, modelId, options);

    return NextResponse.json(response);
  } catch (error) {
    console.error('LLM API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process LLM request' },
      { status: 500 }
    );
  }
}
