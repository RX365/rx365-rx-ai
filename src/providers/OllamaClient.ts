import axios from 'axios';
import { BaseAIClient, AIModel, AIResponse } from '../types';
import { execSync } from 'child_process';
<<<<<<< HEAD
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
=======

export class OllamaClient extends BaseAIClient {
  private systemPrompt = `按此模板生成代码，保留所有换行符和缩进：
\`\`\`python
def function_name():
    """docstring"""
    # 代码块1
    statement_1
    statement_2

    # 代码块2
    statement_3
\`\`\``;


  async sendMessage(prompt: string): Promise<string> {
  const response = await axios.post(`${this.baseUrl}/api/generate`, {
      model: this.model,
      prompt: `${this.systemPrompt}\n\n用户请求: ${prompt}`,
      stream: false,
      options: {
          temperature: 0.3,
          num_ctx: 2048
      }
  });
  
  // 确保返回的内容包含代码块标记
  return this.ensureCodeFormat(response.data.response);
}

private ensureCodeFormat(raw: string): string {
  // 如果已经是正确格式则直接返回
  if (/```python[\s\S]+?```/.test(raw)) {
      return raw;
  }
  
  // 简单格式化处理
  const codeContent = raw.replace(/```/g, '').trim();
  return `\`\`\`python\n${codeContent}\n\`\`\``;
}

  private formatCodeResponse(rawResponse: string): string {
    // 提取代码部分（去掉 ```python 和 ```）
    const codeMatch = rawResponse.match(/```python([\s\S]+?)```/);
    if (!codeMatch) return "```python\n# 错误：未检测到有效代码块\n```";

    let code = codeMatch[1].trim();
    
    // 强制换行规则（关键！）
    code = code
        .replace(/;/g, ";\n")          // 分号后换行
        .replace(/\{/g, "{\n")         // { 后换行
        .replace(/\}/g, "\n}")         // } 前换行
        .replace(/\):/g, "):\n")       // 函数定义后换行
        .replace(/# /g, "\n# ");       // 注释前加空行

    return `\`\`\`python\n${code}\n\`\`\``;
}

  private detectCodeLanguage(content: string): string {
    const languageMarkers = [
      { lang: 'javascript', markers: ['function', 'const ', 'let ', '=>'] },
      { lang: 'typescript', markers: ['interface', 'type ', 'declare '] },
      { lang: 'python', markers: ['def ', 'import ', 'lambda '] },
      { lang: 'java', markers: ['public class', 'void ', 'new '] }
    ];

    for (const { lang, markers } of languageMarkers) {
      if (markers.some(marker => content.includes(marker))) {
        return lang;
      }
    }
    return 'text'; // 默认值
>>>>>>> 255de2211eea200f0fd6e3b3fa842722ee295af3
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
<<<<<<< HEAD
=======
      // 返回包含新模型的默认列表
>>>>>>> 255de2211eea200f0fd6e3b3fa842722ee295af3
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
<<<<<<< HEAD
=======

  private isCodeRelatedRequest(prompt: string): boolean {
    const codeKeywords = ['代码', '编程', '实现', '函数', '类', '方法', '模型', 'API', '接口', '调试', '错误'];
    return codeKeywords.some(keyword => prompt.includes(keyword));
  }
>>>>>>> 255de2211eea200f0fd6e3b3fa842722ee295af3
}