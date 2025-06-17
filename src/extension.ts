import * as vscode from 'vscode';
import { AIPanel } from './views/AIPanel';
import { SettingsPanel } from './views/SettingsPanel';
import { AIConfiguration, AIProvider, AIModel } from './types';
import { SimpleVectorStore } from './providers/SimpleVectorStore';
import { CodeFileLoader } from './providers/CodeFileLoader';
import * as path from 'path';
import * as fs from 'fs';

export let vectorStore: SimpleVectorStore;
export let codeLoader: CodeFileLoader;

export async function activate(context: vscode.ExtensionContext) {
  try {
    // Initialize with error handling
    await initializeServices(context);

    // Initialize configuration with network resilience
    const config = await initializeConfig(context);

    // Register commands with telemetry error handling
    registerCommands(context, config);

    // Show welcome view with fallback
    showWelcomeView(context);

  } catch (error) {
    handleActivationError(error);
  }
}

async function initializeServices(context: vscode.ExtensionContext) {
  try {
    vectorStore = new SimpleVectorStore(context);
    codeLoader = new CodeFileLoader();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to initialize services: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error; // Re-throw to prevent further execution
  }
}

async function initializeConfig(context: vscode.ExtensionContext): Promise<AIConfiguration> {
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

  try {
    const savedConfig = context.globalState.get<AIConfiguration>('aiConfig');
    if (savedConfig) {
      Object.keys(savedConfig.providers).forEach((key) => {
        if (config.providers[key]) {
          config.providers[key].apiKey = savedConfig.providers[key].apiKey || '';
        }
      });
    }
  } catch (error) {
    vscode.window.showWarningMessage(
      `Failed to load saved configuration: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return config;
}

function registerCommands(context: vscode.ExtensionContext, config: AIConfiguration) {
  let aiPanel: AIPanel | undefined;
  let settingsPanel: SettingsPanel | undefined;

  const saveConfig = () => {
    try {
      context.globalState.update('aiConfig', config);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('ai-code-assistant.openPanel', () => {
      if (aiPanel) {
            aiPanel.reveal();
        }
      try {
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
      } catch (error) {
        handleCommandError('openPanel', error);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ai-code-assistant.selectProvider', () => {
      try {
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
      } catch (error) {
        handleCommandError('selectProvider', error);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ai-code-assistant.loadCodeFiles', async () => {
      try {
        const uris = await vscode.window.showOpenDialog({
          canSelectMany: true,
          filters: { 
            'Code Files': ['py', 'js', 'ts', 'java', 'go', 'rs', 'cpp', 'h'],
            'All Files': ['*'] 
          }
        });
        
        if (uris && uris.length > 0) {
          await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Processing code files",
            cancellable: false
          }, async (progress) => {
            try {
              progress.report({ message: "Generating embeddings..." });
              
              const filePaths = uris.map(uri => uri.fsPath);
              const chunks = await codeLoader.loadFiles(filePaths);
              await vectorStore.addChunks(chunks);
              
              const message = `Loaded ${chunks.length} code files with embeddings`;
              vscode.window.showInformationMessage(message);
              
              if (settingsPanel) {
                settingsPanel.reveal();
                settingsPanel.sendMessageToWebview({
                  command: 'fileLoadResult',
                  text: message,
                  success: true
                });
              }
            } catch (error) {
              throw error;
            }
          });
        }
      } catch (error) {
        handleCommandError('loadCodeFiles', error);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ai-code-assistant.clearVectorStore', async () => {
      try {
        await vectorStore.clear();
        const message = 'Vector store cleared successfully';
        vscode.window.showInformationMessage(message);
        
        if (settingsPanel) {
          settingsPanel.reveal();
          settingsPanel.sendMessageToWebview({
            command: 'fileLoadResult',
            text: message,
            success: true
          });
        }
      } catch (error) {
        handleCommandError('clearVectorStore', error);
      }
    })
  );
}

function showWelcomeView(context: vscode.ExtensionContext) {
  try {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider('ai-code-assistant.panel', {
        resolveWebviewView(webviewView: vscode.WebviewView) {
          webviewView.webview.html = getWelcomeHtml();
        }
      })
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to show welcome view: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function getWelcomeHtml(): string {
  return `
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
            .error-message {
                color: var(--vscode-errorForeground);
                margin-top: 10px;
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="welcome-message">
            <h2>Welcome to AI Code Assistant</h2>
            <p>Get AI-powered coding assistance with context awareness</p>
            <a class="welcome-button" href="command:ai-code-assistant.selectProvider">Select AI Provider</a>
            <a class="welcome-button" href="command:ai-code-assistant.loadCodeFiles">Load Code Context</a>
            <div class="error-message" id="error-message"></div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            document.addEventListener('click', (event) => {
                if (event.target.classList.contains('welcome-button')) {
                    document.getElementById('error-message').style.display = 'none';
                }
            });
        </script>
    </body>
    </html>
  `;
}

function handleCommandError(command: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  vscode.window.showErrorMessage(
    `Command '${command}' failed: ${errorMessage}`
  );
  console.error(`[rx365-rx-ai] Command error (${command}):`, error);
}

function handleActivationError(error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  vscode.window.showErrorMessage(
    `Failed to activate rx365-rx-ai extension: ${errorMessage}`
  );
  console.error('[rx365-rx-ai] Activation error:', error);
}

export function deactivate() {
  // Cleanup if needed
}