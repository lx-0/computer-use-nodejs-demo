import { LLMService } from '@/services/llm.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message, options } = await req.json();

    const llmService = LLMService.getInstance();
    const response = await llmService.sendMessage(message, options);

    return NextResponse.json(response);
  } catch (error) {
    console.error('LLM API error:', error);
    return NextResponse.json({ error: 'Failed to process LLM request' }, { status: 500 });
  }
}
