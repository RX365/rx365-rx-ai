import * as vscode from 'vscode';
import { AIConfiguration, AIProvider, AIModel } from '../types';

export class SettingsPanel {
  

  private readonly panel: vscode.WebviewPanel;
  private config: AIConfiguration;

  // 添加公开方法
    public sendMessageToWebview(message: any) {
        this.panel.webview.postMessage(message);
    }

    public onDidDispose(callback: () => void): void {
        this.panel.onDidDispose(callback);
    }

    public reveal(): void {
        this.panel.reveal();
    }

  constructor(context: vscode.ExtensionContext, config: AIConfiguration) {
    this.config = config;

    this.panel = vscode.window.createWebviewPanel(
      'aiCodeAssistantSettings',
      'AI Assistant Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );

    this.updateWebview();
    this.setupMessageHandlers(context);
  }

  private updateWebview() {
    this.panel.webview.html = this.getWebviewContent();
  }

  private getWebviewContent(): string {
    const providers = Object.values(this.config.providers);
    const currentProvider = this.config.currentProvider;
    const currentModel = this.config.currentModel;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AI Assistant Settings</title>
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
                  
              .local-provider {
                  border-left: 4px solid var(--vscode-gitDecoration-addedResourceForeground);
              }
              
              .provider-badge {
                  display: inline-block;
                  padding: 2px 6px;
                  font-size: 0.8em;
                  border-radius: 4px;
                  margin-left: 8px;
              }
              
              .local-badge {
                  background-color: var(--vscode-gitDecoration-addedResourceForeground);
                  color: white;
              }
              
              .cloud-badge {
                  background-color: var(--vscode-gitDecoration-modifiedResourceForeground);
                  color: white;
              }
              
              .api-key-note {
                  font-size: 0.8em;
                  color: var(--vscode-descriptionForeground);
                  margin-top: 4px;
              }

              .provider {
                  margin-bottom: 16px;
                  padding: 12px;
                  border: 1px solid var(--vscode-input-border);
                  border-radius: 4px;
              }
              .provider-header {
                  display: flex;
                  align-items: center;
                  margin-bottom: 8px;
              }
              .provider-name {
                  font-weight: bold;
                  margin-right: 8px;
              }
              .provider-selected {
                  background-color: var(--vscode-inputOption-activeBackground);
                  border-color: var(--vscode-inputOption-activeBorder);
              }
              .model {
                  margin: 4px 0;
                  padding: 4px 8px;
                  border-radius: 4px;
                  cursor: pointer;
              }
              .model:hover {
                  background-color: var(--vscode-list-hoverBackground);
              }
              .model-selected {
                  background-color: var(--vscode-list-activeSelectionBackground);
                  color: var(--vscode-list-activeSelectionForeground);
              }
              .api-key-input {
                  width: 100%;
                  padding: 8px;
                  margin-top: 8px;
                  border: 1px solid var(--vscode-input-border);
                  background-color: var(--vscode-input-background);
                  color: var(--vscode-input-foreground);
                  border-radius: 4px;
              }
              .action-button {
                  padding: 8px 16px;
                  margin-right: 8px;
                  background-color: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
              }
              .action-button:hover {
                  background-color: var(--vscode-button-hoverBackground);
              }
              .section-title {
                  margin-top: 24px;
                  margin-bottom: 8px;
                  font-weight: bold;
                  border-bottom: 1px solid var(--vscode-input-border);
                  padding-bottom: 4px;
              }
              .status-message {
                  margin-top: 12px;
                  padding: 8px;
                  border-radius: 4px;
                  background-color: var(--vscode-input-background);
                  display: none;
              }
              .controls-container {
                  display: flex;
                  gap: 8px;
                  margin-top: 12px;
              }
          </style>
      </head>
      <body>
          <h2>AI Provider Settings</h2>
          ${providers.map(provider => `
              <div class="provider ${currentProvider === provider.id ? 'provider-selected' : ''} ${provider.isLocal ? 'local-provider' : ''}" 
                   data-provider="${provider.id}">
                  <div class="provider-header">
                      <span class="provider-name">${provider.name}</span>
                      <span class="provider-badge ${provider.isLocal ? 'local-badge' : 'cloud-badge'}">
                          ${provider.isLocal ? 'Local' : 'Cloud'}
                      </span>
                      <input type="radio" name="provider" ${currentProvider === provider.id ? 'checked' : ''}>
                  </div>
            
                  ${!provider.isLocal ? `
                      <input type="text" class="api-key-input" placeholder="Enter API key" value="${provider.apiKey || ''}" 
                             data-provider="${provider.id}">
                      <div class="api-key-note">Required for cloud providers</div>
                  ` : `
                      <div class="api-key-note">No API key needed for local provider</div>
                  `}
            
                  <div class="models">
                      ${provider.models.map(model => `
                          <div class="model ${currentModel === model.id && currentProvider === provider.id ? 'model-selected' : ''}" 
                               data-provider="${provider.id}" 
                               data-model="${model.id}">
                              ${model.name}
                          </div>
                      `).join('')}
                  </div>
              </div>
          `).join('')}

          <div class="section-title">Code Context Settings</div>
          <p>Load your local code files to provide context-aware AI assistance:</p>
          
          <div class="controls-container">
              <button class="action-button" id="load-files-button">Load Code Files</button>
              <button class="action-button" id="clear-store-button">Clear Vector Store</button>
          </div>
          
          <div id="status-message" class="status-message"></div>

          <script>
              const vscode = acquireVsCodeApi();
              
              document.querySelectorAll('.provider').forEach(providerEl => {
                  providerEl.addEventListener('click', (e) => {
                      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                          const providerId = providerEl.dataset.provider;
                          vscode.postMessage({
                              command: 'selectProvider',
                              providerId
                          });
                      }
                  });
              });
              
              document.querySelectorAll('.model').forEach(modelEl => {
                  modelEl.addEventListener('click', (e) => {
                      const providerId = modelEl.dataset.provider;
                      const modelId = modelEl.dataset.model;
                      vscode.postMessage({
                          command: 'selectModel',
                          providerId,
                          modelId
                      });
                  });
              });
              
              document.getElementById('load-files-button').addEventListener('click', () => {
                  const status = document.getElementById('status-message');
                  status.style.display = 'block';
                  status.textContent = 'Loading and processing code files...';
                  status.style.backgroundColor = 'var(--vscode-input-background)';
                  
                  vscode.postMessage({
                      command: 'loadCodeFiles'
                  });
              });
              
              document.getElementById('clear-store-button').addEventListener('click', () => {
                  if (confirm('Are you sure you want to clear all stored code embeddings?')) {
                      const status = document.getElementById('status-message');
                      status.style.display = 'block';
                      status.textContent = 'Clearing vector store...';
                      
                      vscode.postMessage({
                          command: 'clearVectorStore'
                      });
                  }
              });

              // Handle messages from extension
              window.addEventListener('message', event => {
                  const message = event.data;
                  const status = document.getElementById('status-message');
                  
                  switch (message.command) {
                      case 'fileLoadResult':
                          status.textContent = message.text;
                          status.style.backgroundColor = message.success 
                              ? 'var(--vscode-input-background)' 
                              : 'var(--vscode-inputValidation-errorBackground)';
                          setTimeout(() => status.style.display = 'none', 5000);
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
          case 'selectProvider':
            this.config.currentProvider = message.providerId;
            this.updateWebview();
            break;
          case 'selectModel':
            this.config.currentProvider = message.providerId;
            this.config.currentModel = message.modelId;
            this.updateWebview();
            break;
          case 'loadCodeFiles':
            await vscode.commands.executeCommand('ai-code-assistant.loadCodeFiles');
            break;
          case 'clearVectorStore':
            await vscode.commands.executeCommand('ai-code-assistant.clearVectorStore');
            this.panel.webview.postMessage({
              command: 'fileLoadResult',
              text: 'Vector store cleared successfully',
              success: true
            });
            break;
        }
      },
      undefined,
      context.subscriptions
    );
  }

  public dispose() {
    this.panel.dispose();
  }
}