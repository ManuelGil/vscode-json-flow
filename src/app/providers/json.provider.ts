import {
  Disposable,
  Uri,
  ViewColumn,
  Webview,
  WebviewOptions,
  WebviewPanel,
  window,
} from 'vscode';

import { EXTENSION_ID } from '../configs';
import { getNonce } from '../helpers';

/**
 * Manages the JSON preview webview panel.
 */
export class JSONProvider {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  /**
   * The current JSONProvider instance for the webview panel.
   * @static
   */
  static currentProvider: JSONProvider | undefined;

  /**
   * Unique identifier for the JSON Flow webview type.
   */
  static readonly viewType: string = `${EXTENSION_ID}.jsonView`;

  /**
   * Tracks all disposables for this provider to ensure proper cleanup of resources and event listeners.
   */
  private _disposables: Disposable[] = [];

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Creates a new JSONProvider instance for managing the JSON preview webview panel.
   * @param _panel The webview panel instance to manage.
   * @param _extensionUri The extension URI for resource resolution.
   */
  private constructor(
    private readonly _panel: WebviewPanel,
    private readonly _extensionUri: Uri,
  ) {
    this._update();

    // Dispose resources when the panel is closed.
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Listen for messages from the webview (extend as needed for interactivity).
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          default:
            break;
        }
      },
      null,
      this._disposables,
    );

    // Update the webview when the panel becomes visible again.
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables,
    );
  }

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  /**
   * Creates and returns a new webview panel for JSON preview.
   * If a panel is already open, it will be revealed instead of creating a new one.
   * @param extensionUri The extension URI for resource resolution.
   * @returns The created or revealed webview panel.
   */
  static createPanel(extensionUri: Uri): WebviewPanel {
    if (JSONProvider.currentProvider) {
      JSONProvider.currentProvider._panel.webview.postMessage({
        command: 'clear',
      });

      JSONProvider.currentProvider._panel.reveal(ViewColumn.One);

      return JSONProvider.currentProvider._panel;
    }

    const panel = window.createWebviewPanel(
      JSONProvider.viewType,
      'JSON Flow',
      ViewColumn.One,
      this.getWebviewOptions(extensionUri),
    );

    JSONProvider.currentProvider = new JSONProvider(panel, extensionUri);

    return panel;
  }

  /**
   * Gets the webview options for the JSON provider.
   * @param extensionUri The extension URI for resource resolution.
   * @returns The webview options.
   */
  static getWebviewOptions(extensionUri: Uri): WebviewOptions {
    return {
      enableScripts: true,
      localResourceRoots: [Uri.joinPath(extensionUri, './dist')],
    };
  }

  /**
   * Revives the JSON provider.
   * @param panel The webview panel.
   * @param extensionUri The extension URI for resource resolution.
   */
  static revive(panel: WebviewPanel, extensionUri: Uri): void {
    JSONProvider.currentProvider = new JSONProvider(panel, extensionUri);
  }

  /**
   * Disposes resources used by the JSON provider to prevent memory leaks.
   * This method ensures that all disposables and the webview panel are properly cleaned up.
   *
   * @remarks
   * Always call this method when the provider is no longer needed to avoid resource leaks.
   *
   * @example
   * provider.dispose();
   */
  dispose(): void {
    // Remove reference to the current provider
    JSONProvider.currentProvider = undefined;

    // Dispose the webview panel if it exists
    if (this._panel) {
      this._panel.dispose();
    }

    // Dispose all registered disposables safely
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable && typeof disposable.dispose === 'function') {
        disposable.dispose();
      }
    }
  }

  /**
   * Updates the webview HTML content for the panel.
   * Called internally after state or data changes, or when the panel is shown.
   */
  private _update(): void {
    const webview = this._panel.webview;

    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  /**
   * Generates and returns the HTML content for the JSON preview webview panel.
   * Includes security policies and links to bundled scripts/styles.
   * @param webview The webview instance to generate HTML for.
   * @returns HTML string for the webview content.
   */
  private _getHtmlForWebview(webview: Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, './dist', 'main.js'),
    );

    // Do the same for the stylesheet.
    const styleMainUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, './dist', 'main.css'),
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />

    <!--
      Use a content security policy to only allow loading styles from our extension directory,
      and only allow scripts that have a specific nonce.
      (See the 'webview-sample' extension sample for img-src content security policy examples)
    -->
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource};
      img-src data:; script-src 'nonce-${nonce}';"
    />

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <link href="${styleMainUri}" rel="stylesheet" />

    <title>JSON Flow</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}" defer></script>
    <script nonce="${nonce}">
      window.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      }, { capture: true });
    </script>
  </body>
</html>
`;
  }
}
