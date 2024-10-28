import { LLMService } from '@/services/llm.service';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message, modelId, options } = await req.json();

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    // Reconstruct Langchain message instances
    const history = options?.history
      ?.map((msg: any) => {
        if (msg.type === 'constructor') {
          switch (msg.id[2]) {
            case 'HumanMessage':
              return new HumanMessage(msg.kwargs);
            case 'AIMessage':
              return new AIMessage(msg.kwargs);
            case 'SystemMessage':
              return new SystemMessage(msg.kwargs);
            default:
              return null;
          }
        }
        return null;
      })
      .filter(Boolean);

    const llmService = LLMService.getInstance();
    const response = await llmService.sendMessage(message, modelId, {
      ...options,
      history,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('LLM API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process LLM request' },
      { status: 500 }
    );
  }
}
