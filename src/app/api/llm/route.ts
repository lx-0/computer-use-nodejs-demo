import { LLMService } from '@/lib/llm/llm.service';
import {
  AIMessage,
  AIMessageFields,
  BaseMessageFields,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { message, modelId, options } = await req.json();

    // Validate required fields
    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Reconstruct Langchain message instances if history exists
    const history = options?.history
      ?.map((msg: { type: string; id: string[]; kwargs: Record<string, unknown> }) => {
        if (msg.type === 'constructor') {
          switch (msg.id[2]) {
            case 'HumanMessage':
              return new HumanMessage(msg.kwargs as BaseMessageFields);
            case 'AIMessage':
              return new AIMessage(msg.kwargs as AIMessageFields);
            case 'SystemMessage':
              return new SystemMessage(msg.kwargs as BaseMessageFields);
            default:
              return null;
          }
        }
        return null;
      })
      .filter(Boolean);

    // Send message through LLM service
    const llmService = LLMService.getInstance();
    const response = await llmService.sendMessage(message, modelId, {
      ...options,
      history,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('LLM API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process LLM request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
