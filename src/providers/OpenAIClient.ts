import { BaseAIClient, AIModel,AIResponse } from '../types';

export class OpenAIClient extends BaseAIClient {
  async sendMessage(prompt: string): Promise<string> {
    const data = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    };

    const response: AIResponse = await this.makeRequest('/v1/chat/completions', data);
    return response.choices[0].message.content;
  }

  async getModels(): Promise<AIModel[]> {
    // For simplicity, we'll return some default models
    // In a real implementation, you might call an API endpoint
    return [
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' }
    ];
  }
}