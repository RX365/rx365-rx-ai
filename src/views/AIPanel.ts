import { AIClient } from '../types';
import * as vscode from 'vscode';
import { AIConfiguration, AIModel } from '../types';
import { AIClientFactory } from '../providers/AIClientFactory';

export class AIPanel {
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

    public onDidDispose(callback: () => void): void {
        this.panel.onDidDispose(callback);
    }

    public reveal(): void {
        this.panel.reveal();
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
                        height: 100vh;
                        box-sizing: border-box;
                    }
                    .chat-container {
                        display: flex;
                        flex-direction: column;
                        height: calc(100% - 40px);
                    }
                    .chat-messages {
                        flex: 1;
                        overflow-y: auto;
                        margin-bottom: 16px;
                        padding-right: 8px;
                    }
                    .message {
                        margin-bottom: 12px;
                        padding: 8px 12px;
                        border-radius: 4px;
                        word-wrap: break-word;
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
                        margin-top: auto;
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
                        font-size: 16px;
                    }
                    pre {
                        background-color: var(--vscode-textBlockQuote-background);
                        border-radius: 4px;
                        padding: 12px;
                        overflow-x: auto;
                        margin: 8px 0;
                        border: 1px solid var(--vscode-editorWidget-border);
                    }
                    code {
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                        color: var(--vscode-editor-foreground);
                        white-space: pre-wrap;
                    }
                    .code-block {
                        position: relative;
                        margin: 12px 0;
                    }
                    .code-language {
                        position: absolute;
                        top: 0;
                        right: 0;
                        padding: 2px 8px;
                        background-color: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        font-size: 0.8em;
                        border-radius: 0 0 0 4px;
                    }
                    .copy-button {
                        position: absolute;
                        top: 0;
                        right: 0;
                        padding: 2px 6px;
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border: none;
                        border-radius: 0 4px 0 0;
                        font-size: 0.7em;
                        cursor: pointer;
                        opacity: 0;
                        transition: opacity 0.2s;
                    }
                    .code-block:hover .copy-button {
                        opacity: 1;
                    }
                </style>
            </head>
            <body>
                <button class="settings-button" id="settings-button" title="Settings">⚙️</button>
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
                    // 初始化后请求聚焦输入框
                    window.addEventListener('load', () => {
                        vscode.postMessage({
                            command: 'focusInput'
                        });
                    });
                    document.getElementById('send-button').addEventListener('click', () => {
                        const input = document.getElementById('prompt-input');
                        const message = input.value.trim();
                        if (message) {
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
                        
                        const processedText = text.replace(
                            /\\\`\\\`\\\`(\w*)([\\s\\S]*?)\\\`\\\`\\\`/g, 
                            (match, language, code) => {
                                const lang = language || '';
                                const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
                                return \`
                                    <div class="code-block">
                                        \${lang ? \`<span class="code-language">\${lang}</span>\` : ''}
                                        <button class="copy-button" onclick="copyToClipboard('\${codeId}')">Copy</button>
                                        <pre><code id="\${codeId}" class="language-\${lang}">\${escapeHtml(code.trim())}</code></pre>
                                    </div>
                                \`;
                            }
                        );
                        
                        // 处理转义后的内联代码标记（\`）
                        const finalText = processedText.replace(
                            /\\\`([^\\\`]+)\\\`/g,
                            '<code>$1</code>'
                        );
                        
                        messageElement.innerHTML = finalText;
                        messagesContainer.appendChild(messageElement);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                    
                    function escapeHtml(unsafe) {
                        return unsafe
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;");
                    }
                    
                    function copyToClipboard(id) {
                        const codeElement = document.getElementById(id);
                        if (codeElement) {
                            const range = document.createRange();
                            range.selectNode(codeElement);
                            window.getSelection()?.removeAllRanges();
                            window.getSelection()?.addRange(range);
                            document.execCommand('copy');
                            window.getSelection()?.removeAllRanges();
                            
                            const button = codeElement.parentElement?.querySelector('.copy-button');
                            if (button) {
                                button.textContent = 'Copied!';
                                setTimeout(() => {
                                    button.textContent = 'Copy';
                                }, 2000);
                            }
                        }
                    }
                    
                    // Auto-focus input on load
                    document.getElementById('prompt-input').focus();
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'addMessage':
                                addMessage(message.text, message.sender);
                                break;
                            case 'executeFocus':
                                document.getElementById('prompt-input').focus();
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
                case 'focusInput':
                    this.focusInput();
                    break;
                case 'sendMessage':
                    await this.handleSendMessage(message.text);
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

private focusInput() {
    this.panel.webview.postMessage({
        command: 'focusInput'
    });
}

private async handleSendMessage(text: string) {
    if (!this.aiClient) {
        vscode.window.showErrorMessage('No AI provider selected');
        return;
    }
<<<<<<< HEAD

    try {
        // 先显示用户消息
        this.panel.webview.postMessage({
            command: 'addMessage',
            text: text,
            sender: 'user'
        });

        // 获取AI响应
        const response = await this.aiClient.sendMessage(text);
        
        // 显示AI响应
        this.panel.webview.postMessage({
            command: 'addMessage',
            text: response,
            sender: 'ai'
        });

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.panel.webview.postMessage({
            command: 'addMessage',
            text: `Error: ${errorMsg}`,
            sender: 'ai'
        });
    }
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

        this.aiClient = AIClientFactory.createClient(providerId, provider.apiKey, provider.baseUrl || '', modelId);
        this.config.currentProvider = providerId;
        this.config.currentModel = modelId;
=======
    if (!provider.isLocal && !provider.apiKey) {
    throw new Error(`API key is required for ${provider.name}`);
    }
    const model = provider.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found for provider ${providerId}`);
>>>>>>> 255de2211eea200f0fd6e3b3fa842722ee295af3
    }

    public dispose() {
        this.panel.dispose();
    }
}