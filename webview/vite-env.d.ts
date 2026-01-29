/// <reference types="vite/client" />

/**
 * Global type augmentation for VS Code webview injected variables
 */
interface Window {
  /**
   * Worker URL injected by VS Code webview provider with proper vscode-webview:// scheme
   */
  __VSCODE_WORKER_URL__?: string;
}
