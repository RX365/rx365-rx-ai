import * as vscode from 'vscode';
import { AIConfiguration, AIProvider, AIModel } from '../types';

export class SettingsPanel {
  public onDidDispose(callback: () => void): void {
    this.panel.onDidDispose(callback);
	}

public reveal(): void {
    this.panel.reveal();
	}
  private readonly panel: vscode.WebviewPanel;
  private config: AIConfiguration;

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
              .save-button {
                  margin-top: 16px;
                  padding: 8px 16px;
                  background-color: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
              }
              .save-button:hover {
                  background-color: var(--vscode-button-hoverBackground);
              }
          </style>
      </head>
      <body>
          <h2>Select AI Provider and Model</h2>
          ${providers.map(provider => `
              <div class="provider ${currentProvider === provider.id ? 'provider-selected' : ''}" data-provider="${provider.id}">
                  <div class="provider-header">
                      <span class="provider-name">${provider.name}</span>
                      <input type="radio" name="provider" ${currentProvider === provider.id ? 'checked' : ''}>
                  </div>
                  <input type="text" class="api-key-input" placeholder="Enter API key" value="${provider.apiKey || ''}" data-provider="${provider.id}">
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
          <button class="save-button" id="save-button">Save Settings</button>
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
              
              document.getElementById('save-button').addEventListener('click', () => {
                  const providers = {};
                  document.querySelectorAll('.provider').forEach(providerEl => {
                      const providerId = providerEl.dataset.provider;
                      const apiKey = providerEl.querySelector('.api-key-input').value;
                      providers[providerId] = { apiKey };
                  });
                  
                  vscode.postMessage({
                      command: 'saveSettings',
                      providers
                  });
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
          case 'saveSettings':
            Object.keys(message.providers).forEach(providerId => {
              if (this.config.providers[providerId]) {
                this.config.providers[providerId].apiKey = message.providers[providerId].apiKey;
              }
            });
            vscode.window.showInformationMessage('Settings saved successfully');
            this.panel.dispose();
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