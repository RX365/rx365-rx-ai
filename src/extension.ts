import * as vscode from 'vscode';
import { AIPanel } from './views/AIPanel';
import { SettingsPanel } from './views/SettingsPanel';
import { AIConfiguration, AIProvider, AIModel } from './types';
import { DeepSeekClient } from './providers/DeepSeekClient';
import { OpenAIClient } from './providers/OpenAIClient';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  // Initialize configuration
  const config: AIConfiguration = {
    currentProvider: undefined,
    currentModel: undefined,
    providers: {
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    apiKey: '',
    baseUrl: 'http://localhost:11434',
    isLocal: true,
    models: [
      { id: 'deepseek-coder:1.3b', name: 'DeepSeek Coder 1.3B', provider: 'ollama' },
      { id: 'qwen2.5-coder:3b', name: 'Qwen2.5 Coder 3B', provider: 'ollama' },
      { id: 'codellama', name: 'CodeLlama', provider: 'ollama' },
      { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B', provider: 'ollama' },
      { id: 'llama2', name: 'Llama 2', provider: 'ollama' },
      { id: 'mistral', name: 'Mistral', provider: 'ollama' }
    ]
      },
      deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        apiKey: '',
        baseUrl: 'https://api.deepseek.com',
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek' },
          { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek' }
        ]
      },
      openai: {
        id: 'openai',
        name: 'OpenAI',
        apiKey: '',
        baseUrl: 'https://api.openai.com',
        models: [
          { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' }
        ]
      }
    }
  };

  // Load saved configuration
  const loadConfig = () => {
  const savedConfig = context.globalState.get<AIConfiguration>('aiConfig');
  if (savedConfig) {
    // 错误做法：直接覆盖整个 providers
    // config.providers = savedConfig.providers; // 这会删除 deepseek 模型

    // 正确做法：仅合并必要的字段（如 apiKey）
    Object.keys(savedConfig.providers).forEach((key) => {
      if (config.providers[key]) {
        config.providers[key].apiKey = savedConfig.providers[key].apiKey || '';
      }
    });
  }
};

  // Save configuration
  const saveConfig = () => {
    context.globalState.update('aiConfig', config);
  };

  loadConfig();

  let aiPanel: AIPanel | undefined;
  let settingsPanel: SettingsPanel | undefined;

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-code-assistant.openPanel', () => {
      if (!aiPanel) {
        aiPanel = new AIPanel(context, config);
        aiPanel.onDidDispose(() => {
          aiPanel = undefined;
        });

        if (config.currentProvider && config.currentModel) {
          aiPanel.setAIClient(config.currentProvider, config.currentModel);
        }
      } else {
        aiPanel.reveal();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ai-code-assistant.selectProvider', () => {
      if (!settingsPanel) {
        settingsPanel = new SettingsPanel(context, config);
        settingsPanel.onDidDispose(() => {
          settingsPanel = undefined;
          saveConfig();

          if (aiPanel && config.currentProvider && config.currentModel) {
            aiPanel.setAIClient(config.currentProvider, config.currentModel);
          }
        });
      } else {
        settingsPanel.reveal();
      }
    })
  );

  // Show welcome view when the panel is first opened
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ai-code-assistant.panel', {
      resolveWebviewView(webviewView: vscode.WebviewView) {
        webviewView.webview.html = `
          <!DOCTYPE html>
          <html>
          <head>
              <style>
                  body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', system-ui, 'Ubuntu', 'Droid Sans', sans-serif;
                      padding: 16px;
                      color: var(--vscode-editor-foreground);
                  }
                  .welcome-message {
                      text-align: center;
                      margin-top: 20px;
                  }
                  .welcome-button {
                      display: block;
                      width: 100%;
                      padding: 10px;
                      margin-top: 20px;
                      text-align: center;
                      background-color: var(--vscode-button-background);
                      color: var(--vscode-button-foreground);
                      border: none;
                      border-radius: 4px;
                      cursor: pointer;
                      text-decoration: none;
                  }
                  .welcome-button:hover {
                      background-color: var(--vscode-button-hoverBackground);
                  }
              </style>
          </head>
          <body>
              <div class="welcome-message">
                  <h2>Welcome to AI Code Assistant</h2>
                  <p>Get AI-powered coding assistance right in your editor</p>
                  <a class="welcome-button" href="command:ai-code-assistant.selectProvider">Select AI Provider</a>
              </div>
          </body>
          </html>
        `;
      }
    })
  );
}

export function deactivate() {}