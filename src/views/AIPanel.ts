import { AIClient } from '../types';
import * as vscode from 'vscode';
import { AIConfiguration, AIModel } from '../types';
import { AIClientFactory } from '../providers/AIClientFactory';

export class AIPanel {
  public onDidDispose(callback: () => void): void {
    this.panel.onDidDispose(callback);
	}

public reveal(): void {
    this.panel.reveal();
	}
  private readonly panel: vscode.WebviewPanel;
  private config: AIConfiguration;
  private aiClient: AIClient | null = null;

  constructor(context: vscode.ExtensionContext, config: AIConfiguration) {
    this.config = config;

    this.panel = vscode.window.createWebviewPanel(
      'aiCodeAssistant',
      'AI Code Assistant',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.updateWebview();
    this.setupMessageHandlers(context);
  }

  private updateWebview() {
    this.panel.webview.html = this.getWebviewContent();
  }

  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AI Code Assistant</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', system-ui, 'Ubuntu', 'Droid Sans', sans-serif;
                  font-size: 14px;
                  line-height: 1.6;
                  padding: 16px;
                  margin: 0;
                  background-color: var(--vscode-editor-background);
                  color: var(--vscode-editor-foreground);
              }
              .chat-container {
                  display: flex;
                  flex-direction: column;
                  height: 100%;
              }
              .chat-messages {
                  flex: 1;
                  overflow-y: auto;
                  margin-bottom: 16px;
              }
              .message {
                  margin-bottom: 12px;
                  padding: 8px 12px;
                  border-radius: 4px;
              }
              .user-message {
                  background-color: var(--vscode-input-background);
                  align-self: flex-end;
                  max-width: 80%;
              }
              .ai-message {
                  background-color: var(--vscode-sideBar-background);
                  align-self: flex-start;
                  max-width: 80%;
              }
              .input-area {
                  display: flex;
                  gap: 8px;
              }
              #prompt-input {
                  flex: 1;
                  padding: 8px;
                  border: 1px solid var(--vscode-input-border);
                  background-color: var(--vscode-input-background);
                  color: var(--vscode-input-foreground);
                  border-radius: 4px;
              }
              #send-button {
                  padding: 8px 16px;
                  background-color: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
              }
              #send-button:hover {
                  background-color: var(--vscode-button-hoverBackground);
              }
              .settings-button {
                  position: absolute;
                  top: 8px;
                  right: 8px;
                  background: none;
                  border: none;
                  color: var(--vscode-icon-foreground);
                  cursor: pointer;
              }
          </style>
      </head>
      <body>
          <button class="settings-button" id="settings-button">⚙️</button>
          <div class="chat-container">
              <div class="chat-messages" id="chat-messages">
                  <div class="message ai-message">
                      Hello! I'm your AI coding assistant. How can I help you today?
                  </div>
              </div>
              <div class="input-area">
                  <input type="text" id="prompt-input" placeholder="Ask me anything about coding...">
                  <button id="send-button">Send</button>
              </div>
          </div>
          <script>
              const vscode = acquireVsCodeApi();
              
              document.getElementById('send-button').addEventListener('click', () => {
                  const input = document.getElementById('prompt-input');
                  const message = input.value.trim();
                  if (message) {
                      addMessage(message, 'user');
                      vscode.postMessage({
                          command: 'sendMessage',
                          text: message
                      });
                      input.value = '';
                  }
              });
              
              document.getElementById('prompt-input').addEventListener('keypress', (e) => {
                  if (e.key === 'Enter') {
                      document.getElementById('send-button').click();
                  }
              });
              
              document.getElementById('settings-button').addEventListener('click', () => {
                  vscode.postMessage({
                      command: 'openSettings'
                  });
              });
              
              function addMessage(text, sender) {
                  const messagesContainer = document.getElementById('chat-messages');
                  const messageElement = document.createElement('div');
                  messageElement.className = \`message \${sender}-message\`;
                  messageElement.textContent = text;
                  messagesContainer.appendChild(messageElement);
                  messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
              
              window.addEventListener('message', event => {
                  const message = event.data;
                  switch (message.command) {
                      case 'aiResponse':
                          addMessage(message.text, 'ai');
                          break;
                  }
              });
          </script>
      </body>
      </html>
    `;
  }

  private setupMessageHandlers(context: vscode.ExtensionContext) {
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'sendMessage':
            if (this.aiClient) {
              try {
                const response = await this.aiClient.sendMessage(message.text);
                this.panel.webview.postMessage({
                  command: 'aiResponse',
                  text: response
                });
              } catch (error) {
                vscode.window.showErrorMessage('Failed to get AI response: ' + error);
              }
            } else {
              vscode.window.showErrorMessage('No AI provider selected. Please select one in settings.');
            }
            break;
          case 'openSettings':
            vscode.commands.executeCommand('ai-code-assistant.selectProvider');
            break;
        }
      },
      undefined,
      context.subscriptions
    );
  }

  public async setAIClient(providerId: string, modelId: string) {
    const provider = this.config.providers[providerId];
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    if (!provider.isLocal && !provider.apiKey) {
    throw new Error(`API key is required for ${provider.name}`);
    }
    const model = provider.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found for provider ${providerId}`);
    }

    this.aiClient = AIClientFactory.createClient(providerId, provider.apiKey, provider.baseUrl || 'https://api.deepseek.com', modelId);
    this.config.currentProvider = providerId;
    this.config.currentModel = modelId;
  }

  public dispose() {
    this.panel.dispose();
  }
}