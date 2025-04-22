import { BaseAIClient, AIModel, AIResponse } from '../types';

export class DeepSeekClient extends BaseAIClient {
  async sendMessage(prompt: string): Promise<string> {
    const data = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    };

    const response:AIResponse = await this.makeRequest('/v1/chat/completions', data);
    return response.choices[0].message.content;
  }

  async getModels(): Promise<AIModel[]> {
    // For simplicity, we'll return some default models
    // In a real implementation, you might call an API endpoint
    return [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek' }
    ];
  }
}