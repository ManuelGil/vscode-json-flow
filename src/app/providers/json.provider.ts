import {
  commands,
  Disposable,
  Event,
  EventEmitter,
  Uri,
  ViewColumn,
  Webview,
  WebviewOptions,
  WebviewPanel,
  window,
} from 'vscode';

import { EXTENSION_DISPLAY_NAME, EXTENSION_ID } from '../configs';
import { getNonce } from '../helpers';

/**
 * JSONProvider manages the JSON preview webview panel for the VSCode JSON Flow extension.
 * Responsible for rendering and updating the webview panel content.
 * Follows SOLID principles for maintainability and extensibility.
 *
 * @example
 * JSONProvider.createPanel(extensionUri);
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
   * Tracks whether the panel is currently shown in split view (i.e., created/revealed with ViewColumn.Beside).
   */
  static isSplitView: boolean = false;

  /** Tracks whether Live Sync is enabled */
  static liveSyncEnabled: boolean = false;

  /** Event fired when provider state changes (split view or live sync) */
  private static _onStateChanged = new EventEmitter<{
    isSplitView?: boolean;
    liveSyncEnabled?: boolean;
  }>();
  static readonly onStateChanged: Event<{
    isSplitView?: boolean;
    liveSyncEnabled?: boolean;
  }> = JSONProvider._onStateChanged.event;

  /**
   * Tracks all disposables for this provider to ensure proper cleanup of resources and event listeners.
   */
  private _disposables: Disposable[] = [];
  /**
   * Tracks whether the provider has been disposed to prevent double-dispose.
   */
  private _isDisposed: boolean = false;

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
        switch (message?.command ?? message?.type) {
          case 'graphSelectionChanged': {
            // TODO: Phase 1 – apply selection in the JSON editor based on route-by-indices nodeId
            // This is a scaffold; mapping from nodeId -> text range will be implemented in Phase 1
            // For now, we simply acknowledge the message when Live Sync is enabled.
            if (JSONProvider.liveSyncEnabled) {
              // placeholder: no-op
            }
            break;
          }
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
        // Recompute split state based on current view column (non-One implies split)
        const isSplit = this._panel.viewColumn !== ViewColumn.One;
        JSONProvider.isSplitView = !!isSplit;
        commands.executeCommand(
          'setContext',
          'jsonFlow.splitView',
          JSONProvider.isSplitView,
        );
        // Notify listeners
        JSONProvider._onStateChanged.fire({
          isSplitView: JSONProvider.isSplitView,
        });
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
  static createPanel(
    extensionUri: Uri,
    column: ViewColumn = ViewColumn.One,
  ): WebviewPanel {
    if (JSONProvider.currentProvider) {
      JSONProvider.currentProvider._panel.webview.postMessage({
        command: 'clear',
      });

      JSONProvider.currentProvider._panel.reveal(column);
      JSONProvider.isSplitView = column === ViewColumn.Beside;
      // Reflect split state in context for menus/UX
      commands.executeCommand(
        'setContext',
        'jsonFlow.splitView',
        JSONProvider.isSplitView,
      );
      // Notify listeners
      JSONProvider._onStateChanged.fire({
        isSplitView: JSONProvider.isSplitView,
      });
      // Also reflect current Live Sync state to the webview when revealing
      try {
        JSONProvider.postMessageToWebview({
          command: 'liveSyncState',
          enabled: JSONProvider.liveSyncEnabled,
        });
      } catch {
        // ignore
      }

      return JSONProvider.currentProvider._panel;
    }

    const panel = window.createWebviewPanel(
      JSONProvider.viewType,
      EXTENSION_DISPLAY_NAME,
      column,
      this.getWebviewOptions(extensionUri),
    );

    JSONProvider.currentProvider = new JSONProvider(panel, extensionUri);
    JSONProvider.isSplitView = column === ViewColumn.Beside;
    commands.executeCommand(
      'setContext',
      'jsonFlow.splitView',
      JSONProvider.isSplitView,
    );
    // Notify listeners
    JSONProvider._onStateChanged.fire({
      isSplitView: JSONProvider.isSplitView,
    });
    // Send initial Live Sync state
    try {
      JSONProvider.postMessageToWebview({
        command: 'liveSyncState',
        enabled: JSONProvider.liveSyncEnabled,
      });
    } catch {
      // ignore
    }

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
    // Revived panels do not imply split view; reset context to false
    JSONProvider.isSplitView = false;
    commands.executeCommand('setContext', 'jsonFlow.splitView', false);
    // Notify listeners
    JSONProvider._onStateChanged.fire({ isSplitView: false });
    // Ensure webview knows current Live Sync state after revive
    try {
      JSONProvider.postMessageToWebview({
        command: 'liveSyncState',
        enabled: JSONProvider.liveSyncEnabled,
      });
    } catch {
      // ignore
    }
  }

  /**
   * Disposes resources used by the JSON provider to prevent memory leaks.
   * This method ensures that all disposables and the webview panel are properly cleaned up.
   * It is idempotent: calling dispose multiple times is safe and has no effect after the first call.
   *
   * @remarks
   * Always call this method when the provider is no longer needed to avoid resource leaks.
   *
   * @example
   * provider.dispose();
   */
  dispose(): void {
    if (this._isDisposed) {
      // Prevent double-dispose and cyclic cleanup
      return;
    }

    this._isDisposed = true;

    // Remove reference to the current provider
    JSONProvider.currentProvider = undefined;
    JSONProvider.isSplitView = false;
    // Reflect state in context for menus/UX
    commands.executeCommand('setContext', 'jsonFlow.splitView', false);
    // Notify listeners
    JSONProvider._onStateChanged.fire({ isSplitView: false });

    // Dispose the webview panel if it exists
    if (this._panel) {
      try {
        this._panel.dispose();
      } catch (error) {
        // Ignore errors if already disposed
        console.error('Error disposing webview panel:', error);
      }
    }

    // Dispose all registered disposables safely
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable && typeof disposable.dispose === 'function') {
        try {
          disposable.dispose();
        } catch (error) {
          // Ignore errors if already disposed
          console.error('Error disposing disposable:', error);
        }
      }
    }

    this._disposables = undefined;
  }

  // -----------------------------------------------------------------
  // Live Sync helpers
  // -----------------------------------------------------------------

  /** Enable/disable Live Sync and update context + webview */
  static setLiveSyncEnabled(enabled: boolean) {
    JSONProvider.liveSyncEnabled = enabled;
    commands.executeCommand('setContext', 'jsonFlow.liveSyncEnabled', enabled);
    try {
      JSONProvider.postMessageToWebview({
        command: 'liveSyncState',
        enabled,
      });
    } catch {
      // ignore
    }
    // Notify listeners
    JSONProvider._onStateChanged.fire({ liveSyncEnabled: enabled });
  }

  /** Post a message to the active webview panel, if present */
  static postMessageToWebview(message: unknown) {
    if (JSONProvider.currentProvider) {
      JSONProvider.currentProvider._panel.webview.postMessage(message);
    }
  }

  /** Tell the webview to apply selection to a graph node by ID (route-by-indices) */
  static applyGraphSelection(nodeId?: string) {
    if (!JSONProvider.currentProvider) {
      return;
    }
    JSONProvider.postMessageToWebview({
      command: 'applyGraphSelection',
      nodeId,
    });
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
      content="default-src 'none'; font-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline';
      img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}' ${webview.cspSource}; worker-src ${webview.cspSource} blob:;"
    />

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <link href="${styleMainUri}" rel="stylesheet" />

    <title>${EXTENSION_DISPLAY_NAME}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
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
