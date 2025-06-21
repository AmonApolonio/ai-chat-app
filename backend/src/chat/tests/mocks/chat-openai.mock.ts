import { jest } from '@jest/globals';

export class MockChatOpenAI {
  private readonly options: any;
  
  constructor(options: any) {
    this.options = options || {};
  }

  async invoke(messages: any[]): Promise<{ content: string }> {
    return {
      content: `Mock response for: ${JSON.stringify(messages)}`
    };
  }

  async stream(messages: any[]): Promise<AsyncIterable<{ content: string }>> {
    const messageText = typeof messages[messages.length - 1].content === 'string' 
      ? messages[messages.length - 1].content 
      : 'Mock message';
    
    const chunks = [
      { content: 'This ' },
      { content: 'is ' },
      { content: 'a ' },
      { content: 'mock ' },
      { content: 'streamed ' },
      { content: 'response ' },
      { content: 'for: ' },
      { content: messageText }
    ];
    
    return {
      [Symbol.asyncIterator]() {
        let i = 0;
        return {
          next: async () => {
            if (i < chunks.length) {
              return { value: chunks[i++], done: false };
            }
            return { done: true, value: undefined };
          }
        };
      }
    };
  }
}
