declare module '@langchain/anthropic' {
  export class ChatAnthropic {
    constructor(config: {
      modelName: string;
      anthropicApiKey: string;
      temperature?: number;
      maxTokens?: number;
    });
    invoke(messages: any[]): Promise<any>;
  }
}

declare module '@langchain/openai' {
  export class ChatOpenAI {
    constructor(config: {
      modelName: string;
      openAIApiKey: string;
      temperature?: number;
      maxTokens?: number;
    });
    invoke(messages: any[]): Promise<any>;
  }
}

declare module '@langchain/core/language_models/chat_models' {
  export class BaseChatModel {
    invoke(messages: any[]): Promise<any>;
  }
}

declare module '@langchain/core/messages' {
  export class HumanMessage {
    constructor(config: { content: string });
    content: string;
  }
}
