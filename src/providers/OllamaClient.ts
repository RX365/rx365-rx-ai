import axios from 'axios';
import { BaseAIClient, AIModel, AIResponse } from '../types';
import { execSync } from 'child_process';
import { vectorStore } from '../extension';

export class OllamaClient extends BaseAIClient {
  private systemPrompt = `你是一个极简风格的代码助手。任务只生成纯代码，不包含解释或注释。**规则**：

1. 不生成英文注释  
2. 不添加行内注释  
3. 函数/类上方最多一句中文注释  
4. 不要输出"这是代码"等提示语  
5. 只输出纯代码，保留格式  
6. 默认Python代码，格式如下：

\`\`\`python
# 单行注释(可选)
def function():
    pass
\`\`\`

仅输出符合规则的代码：`;

  async sendMessage(prompt: string): Promise<string> {
    const relevantChunks = await vectorStore.search(prompt, 3);
    
    let context = '';
    if (relevantChunks.length > 0) {
      context = 'Relevant code context:\n';
      relevantChunks.forEach((chunk, i) => {
        const ext = chunk.filePath.split('.').pop() || '';
        context += `\n// From ${chunk.filePath}\n\`\`\`${ext}\n${chunk.content}\n\`\`\`\n`;
      });
      context += '\n';
    }

    const fullPrompt = `${this.systemPrompt}\n${context}\nUser request: ${prompt}`;
    
    const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model: this.model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_ctx: 2048
      }
    });
  
    return this.ensureCodeFormat(response.data.response || response.data.message?.content || "");
  }

  private ensureCodeFormat(raw: string): string {
    if (/```[\s\S]+?```/.test(raw)) {
      return raw;
    }
    
    const codeContent = raw.replace(/```/g, '').trim();
    return `\`\`\`python\n${codeContent}\n\`\`\``;
  }

  async getModels(): Promise<AIModel[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        provider: 'ollama'
      }));
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return [
        { id: 'deepseek-coder:1.3b', name: 'DeepSeek Coder 1.3B', provider: 'ollama' },
        { id: 'qwen2.5-coder:3b', name: 'Qwen2.5 Coder 3B', provider: 'ollama' },
        { id: 'deepseek-r1:1.5b', name: 'DeepSeek R1 1.5B', provider: 'ollama' },
        { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B', provider: 'ollama' },
        { id: 'llama2', name: 'Llama 2', provider: 'ollama' },
        { id: 'codellama', name: 'CodeLlama', provider: 'ollama' },
        { id: 'mistral', name: 'Mistral', provider: 'ollama' }
      ];
    }
  }
}