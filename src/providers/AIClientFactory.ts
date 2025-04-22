import { AIClient } from '../types';
import { DeepSeekClient } from './DeepSeekClient';
import { OpenAIClient } from './OpenAIClient';

export class AIClientFactory {
  static createClient(providerId: string, apiKey: string, baseUrl: string, model: string): AIClient {
    switch (providerId) {
      case 'deepseek':
        return new DeepSeekClient(apiKey, baseUrl, model);
      case 'openai':
        return new OpenAIClient(apiKey, baseUrl, model);
      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }
}