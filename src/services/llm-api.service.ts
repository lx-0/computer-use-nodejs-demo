'use client';

import { LLMResponse } from '@/lib/llm/types';

export class LLMApiService {
  private static instance: LLMApiService;

  public static getInstance(): LLMApiService {
    if (!LLMApiService.instance) {
      LLMApiService.instance = new LLMApiService();
    }
    return LLMApiService.instance;
  }

  public async sendMessage(
    message: string,
    modelId: string,
    options?: {
      stream?: boolean;
      functions?: string[];
    }
  ): Promise<LLMResponse> {
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '', // Ensure this is set
      },
      body: JSON.stringify({ message, modelId, options }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message to LLM');
    }

    return response.json();
  }
}
