import { AIClient, AIModel } from '../types';
import axios from 'axios';

export abstract class BaseAIClient implements AIClient {
  protected apiKey: string;
  protected baseUrl: string;
  protected model: string;

  constructor(apiKey: string, baseUrl: string, model: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  abstract sendMessage(prompt: string): Promise<string>;
  abstract getModels(): Promise<AIModel[]>;

  protected async makeRequest(endpoint: string, data: any) {
    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('AI request failed:', error);
      throw error;
    }
  }
}