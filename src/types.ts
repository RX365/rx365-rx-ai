import axios from 'axios';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export interface AIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  models: AIModel[];
  defaultModel?: string;
}

export interface AIConfiguration {
  currentProvider?: string;
  currentModel?: string;
  providers: {
    [key: string]: AIProvider;
  };
}

export interface AIClient {
  sendMessage(prompt: string): Promise<string>;
  getModels(): Promise<AIModel[]>;
}

export abstract class BaseAIClient implements AIClient {
    constructor(
        protected apiKey: string,
        protected baseUrl: string,
        protected model: string
    ) {}
    
    abstract sendMessage(prompt: string): Promise<string>;
    abstract getModels(): Promise<AIModel[]>;
    
    protected async makeRequest(endpoint: string, data: any): Promise<AIResponse> {
        const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data as AIResponse;
    }
}