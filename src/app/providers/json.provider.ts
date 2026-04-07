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
  workspace,
} from 'vscode';

import {
  ContextKeys,
  EXTENSION_DISPLAY_NAME,
  EXTENSION_ID,
  ViewIds,
} from '../configs';
import {
  applyNodeEdit,
  getNonce,
  logger,
  type MutationResult,
  type NodeEditIntent,
} from '../helpers';

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
  static readonly viewType: string = `${EXTENSION_ID}.${ViewIds.JsonView}`;

  /**
   * Tracks whether the panel is currently shown in split view (i.e., created/revealed with ViewColumn.Beside).
   */
  static isSplitView: boolean = false;

  /**
   * Tracks whether Live Sync is enabled
   */
  static liveSyncEnabled: boolean = false;

  /**
   * Tracks whether Live Sync is paused due to an error
   */
  static liveSyncPaused: boolean = false;

  /**
   * Optional pause reason to display in the webview
   */
  static liveSyncPauseReason: string | undefined;

  /**
   * Guard to prevent feedback loop when applying selection from webview
   */
  static suppressEditorSelectionEvent: boolean = false;

  /**
   * Optional throttle duration from host to align webview batching
   */
  static hostThrottleMs: number | undefined;

  /**
   * Last applied nodeId from inbound message to de-duplicate
   */
  static lastAppliedNodeId: string | undefined;

  /**
   * Path of the document currently previewed in the webview (fsPath)
   */
  static previewedPath: string | undefined;

  /**
   * Event fired when provider state changes (split view or live sync)
   */
  private static _onStateChanged = new EventEmitter<{
    isSplitView?: boolean;
    liveSyncEnabled?: boolean;
  }>();

  /**
   * Tracks all disposables for this provider to ensure proper cleanup of resources and event listeners.
   */
  private _disposables: Disposable[] = [];

  /**
   * Tracks whether the provider has been disposed to prevent double-dispose.
   */
  private _isDisposed: boolean = false;

  /**
   * URI of the document currently associated with the preview panel.
   */
  private _documentUri: Uri | undefined;

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
        if (message?.type === 'nodeEditIntent') {
          const { payload: intent, requestId } = message;

          (async () => {
            try {
              if (!this._documentUri) {
                this._panel.webview.postMessage({
                  type: 'mutationDiagnostics',
                  requestId,
                  success: false,
                  error: 'DOCUMENT_NOT_FOUND',
                });
                return;
              }

              let document;
              try {
                document = await workspace.openTextDocument(this._documentUri);
              } catch {
                this._panel.webview.postMessage({
                  type: 'mutationDiagnostics',
                  requestId,
                  success: false,
                  error: 'DOCUMENT_NOT_FOUND',
                });
                return;
              }

              const result = await applyNodeEdit(intent, document);

              const isSuccess =
                result === undefined ||
                result === null ||
                result.success === true;

              if (!isSuccess) {
                const failedResult = result as {
                  success: false;
                  error: string;
                };
                this._panel.webview.postMessage({
                  type: 'mutationDiagnostics',
                  requestId,
                  success: false,
                  error: failedResult.error,
                });
                return;
              }

              const successWarnings =
                result && result.success === true
                  ? (result.warnings ?? [])
                  : [];

              this._panel.webview.postMessage({
                type: 'mutationDiagnostics',
                requestId,
                success: true,
                warnings: successWarnings,
              });
            } catch (error) {
              this._panel.webview.postMessage({
                type: 'mutationDiagnostics',
                requestId,
                success: false,
                error: String(error),
              });
            }
          })();

          return;
        }

        switch (message?.command ?? message?.type) {
          case 'graphSelectionChanged': {
            if (!JSONProvider.liveSyncEnabled) {
              break;
            }
            if (message?.origin && message.origin !== 'webview') {
              break;
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
  }

  /**
   * Event fired when provider split/live-sync state changes.
   */
  static get onStateChanged(): Event<{
    isSplitView?: boolean;
    liveSyncEnabled?: boolean;
  }> {
    return JSONProvider._onStateChanged.event;
  }

  /**
   * Registers the host handler for webview node edit intents.
   */
  static setNodeEditIntentHandler(
    _handler: ((intent: NodeEditIntent) => Promise<MutationResult>) | undefined,
  ): void {
    // Mutation intents are handled directly by applyNodeEdit using resolved URI.
  }

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
    const payload = {
      nodes: [],
      edges: [],
      metadata: {
        languageId: 'plaintext',
        canEdit: false,
      },
    };

    if (JSONProvider.currentProvider) {
      JSONProvider.currentProvider._panel.reveal(column);
      JSONProvider.isSplitView = column === ViewColumn.Beside;
      // Reflect split state in context for menus/UX
      commands.executeCommand(
        'setContext',
        `${EXTENSION_ID}.${ContextKeys.IsSplitView}`,
        JSONProvider.isSplitView,
      );
      // Notify listeners
      JSONProvider._onStateChanged.fire({
        isSplitView: JSONProvider.isSplitView,
      });
      JSONProvider.currentProvider._panel.webview.postMessage({
        type: 'graphData',
        payload,
      });
      // Also reflect current Live Sync state to the webview when revealing
      try {
        JSONProvider.postMessageToWebview({
          command: 'liveSyncState',
          enabled: JSONProvider.liveSyncEnabled,
          paused: JSONProvider.liveSyncPaused,
          reason: JSONProvider.liveSyncPauseReason,
          throttleMs: JSONProvider.hostThrottleMs,
          origin: 'extension',
          nonce: getNonce(),
        });
      } catch (error: unknown) {
        logger.error('Failed to post live sync state to webview', error);
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
    panel.webview.postMessage({
      type: 'graphData',
      payload,
    });
    JSONProvider.isSplitView = column === ViewColumn.Beside;
    commands.executeCommand(
      'setContext',
      `${EXTENSION_ID}.${ContextKeys.IsSplitView}`,
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
        paused: JSONProvider.liveSyncPaused,
        reason: JSONProvider.liveSyncPauseReason,
        throttleMs: JSONProvider.hostThrottleMs,
        origin: 'extension',
        nonce: getNonce(),
      });
    } catch (error: unknown) {
      logger.error('Failed to post initial live sync state to webview', error);
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
    commands.executeCommand(
      'setContext',
      `${EXTENSION_ID}.${ContextKeys.IsSplitView}`,
      false,
    );
    // Notify listeners
    JSONProvider._onStateChanged.fire({ isSplitView: false });
    // Ensure webview knows current Live Sync state after revive
    try {
      JSONProvider.postMessageToWebview({
        command: 'liveSyncState',
        enabled: JSONProvider.liveSyncEnabled,
        paused: JSONProvider.liveSyncPaused,
        reason: JSONProvider.liveSyncPauseReason,
        throttleMs: JSONProvider.hostThrottleMs,
        origin: 'extension',
        nonce: getNonce(),
      });
    } catch (error: unknown) {
      logger.error('Failed to post initial live sync state to webview', error);
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
    JSONProvider.previewedPath = undefined;
    // Reflect state in context for menus/UX
    commands.executeCommand(
      'setContext',
      `${EXTENSION_ID}.${ContextKeys.IsSplitView}`,
      false,
    );
    // Notify listeners
    JSONProvider._onStateChanged.fire({ isSplitView: false });

    // Dispose the webview panel if it exists
    if (this._panel) {
      try {
        this._panel.dispose();
      } catch (error: unknown) {
        // Log disposal error for debugging but continue cleanup
        logger.error('Failed to dispose webview panel', error, {
          panelTitle: this._panel?.title,
          viewType: JSONProvider.viewType,
        });
      }
    }

    // Dispose all registered disposables safely
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable && typeof disposable.dispose === 'function') {
        try {
          disposable.dispose();
        } catch (error: unknown) {
          // Log disposal error but continue with remaining disposables
          logger.error('Failed to dispose resource', error, {
            remainingDisposables: this._disposables.length,
          });
        }
      }
    }
    // Keep a valid array reference to avoid undefined access after disposal.
    this._disposables = [];
  }

  // -----------------------------------------------------------------
  // Live Sync helpers
  // -----------------------------------------------------------------

  /** Enable/disable Live Sync and update context + webview */
  static setLiveSyncEnabled(enabled: boolean) {
    JSONProvider.liveSyncEnabled = enabled;
    commands.executeCommand(
      'setContext',
      `${EXTENSION_ID}.${ContextKeys.LiveSyncEnabled}`,
      enabled,
    );
    try {
      JSONProvider.postMessageToWebview({
        command: 'liveSyncState',
        enabled,
        paused: JSONProvider.liveSyncPaused,
        reason: JSONProvider.liveSyncPauseReason,
        throttleMs: JSONProvider.hostThrottleMs,
        origin: 'extension',
        nonce: getNonce(),
      });
    } catch (error: unknown) {
      logger.error('Failed to post live sync state to webview', error);
    }
    // Notify listeners
    JSONProvider._onStateChanged.fire({ liveSyncEnabled: enabled });
  }

  /** Pause or resume Live Sync selection state and notify webview */
  static setLiveSyncPaused(paused: boolean, reason?: string) {
    JSONProvider.liveSyncPaused = paused;
    JSONProvider.liveSyncPauseReason = paused ? reason : undefined;
    try {
      JSONProvider.postMessageToWebview({
        command: 'liveSyncState',
        enabled: JSONProvider.liveSyncEnabled,
        paused: JSONProvider.liveSyncPaused,
        reason: JSONProvider.liveSyncPauseReason,
        throttleMs: JSONProvider.hostThrottleMs,
        origin: 'extension',
        nonce: getNonce(),
      });
    } catch (error: unknown) {
      logger.error('Failed to post live sync state to webview', error);
    }
  }

  /**
   * Attempts to recover from a failed Live Sync state by resetting the paused state
   * and notifying the webview. Can be called periodically or in response to user actions.
   *
   * @returns True if recovery was attempted, false if not needed (not in paused state)
   */
  static tryRecoverLiveSync(): boolean {
    // If not paused, no recovery needed
    if (!JSONProvider.liveSyncPaused) {
      return false;
    }

    try {
      // Reset the pause state
      JSONProvider.liveSyncPaused = false;
      JSONProvider.liveSyncPauseReason = undefined;

      // Notify webview of recovered state
      JSONProvider.postMessageToWebview({
        command: 'liveSyncState',
        enabled: JSONProvider.liveSyncEnabled,
        paused: false,
        reason: undefined,
        throttleMs: JSONProvider.hostThrottleMs,
        origin: 'extension',
        nonce: getNonce(),
      });

      return true;
    } catch {
      // If recovery fails, restore paused state
      JSONProvider.liveSyncPaused = true;
      return false;
    }
  }

  /** Post a message to the active webview panel, if present */
  static postMessageToWebview(message: unknown) {
    if (JSONProvider.currentProvider) {
      JSONProvider.currentProvider._panel.webview.postMessage(message);
    }
  }

  /**
   * Cleans up static resources used by JSONProvider to avoid leaks across
   * activation/deactivation cycles. Resets flags and reinitializes the
   * state change emitter to a fresh instance.
   */
  static shutdown(): void {
    try {
      JSONProvider._onStateChanged.dispose();
    } catch (error: unknown) {
      logger.error('Failed to dispose state change emitter', error);
    }
    // Reinitialize to ensure a valid emitter on next activation
    JSONProvider._onStateChanged = new EventEmitter<{
      isSplitView?: boolean;
      liveSyncEnabled?: boolean;
    }>();
    // Reset flags
    JSONProvider.liveSyncEnabled = false;
    JSONProvider.isSplitView = false;
    JSONProvider.previewedPath = undefined;
    JSONProvider.liveSyncPaused = false;
    JSONProvider.liveSyncPauseReason = undefined;
    JSONProvider.hostThrottleMs = undefined;
    JSONProvider.lastAppliedNodeId = undefined;
  }

  /** Tell the webview to apply selection to a graph node by ID (route-by-indices) */
  static applyGraphSelection(nodeId?: string) {
    if (!JSONProvider.currentProvider) {
      return;
    }
    JSONProvider.postMessageToWebview({
      command: 'applyGraphSelection',
      nodeId,
      origin: 'extension',
      nonce: getNonce(),
    });
  }

  /** Update the path of the document currently previewed (used for sync filtering) */
  static setPreviewedPath(path?: string) {
    // If the previewed path changes, clear lastAppliedNodeId so we don't suppress
    // the first selection on the new document due to de-duplication.
    const prev = JSONProvider.previewedPath;
    JSONProvider.previewedPath = path;
    if (JSONProvider.currentProvider) {
      JSONProvider.currentProvider._documentUri = path
        ? Uri.file(path)
        : undefined;
    }
    if (prev !== path) {
      JSONProvider.lastAppliedNodeId = undefined;
    }
  }

  /**
   * Updates the webview HTML content for the panel.
   * Called internally after state or data changes, or when the panel is shown.
   */
  private _update(): void {
    const webview = this._panel.webview;
    const html = this._getHtmlForWebview(webview);
    this._panel.webview.html = html;
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

    // Base URI for resolving relative paths (e.g., workers) to the dist/ folder
    const baseUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, './dist'),
    );

    // Resolve the JsonLayoutWorker script within the built assets folder using a stable name
    const jsonLayoutWorkerUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, './dist', 'JsonLayoutWorker.js'),
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
      content="
        default-src 'none';
        font-src ${webview.cspSource} data:;
        style-src ${webview.cspSource} 'unsafe-inline';
        img-src ${webview.cspSource} data:;
        script-src 'nonce-${nonce}' ${webview.cspSource};
        worker-src blob: ${webview.cspSource};
        connect-src ${webview.cspSource};
        frame-ancestors 'none';
        form-action 'none';
        base-uri ${webview.cspSource};
        manifest-src 'none';
      "
    />

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <base href="${baseUri}/" />

    <link href="${styleMainUri}" rel="stylesheet" />

    <title>${EXTENSION_DISPLAY_NAME}</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      // Make the worker URL available to the webview JS (read-only exposure)
      window.__jsonFlowWorkerUrl = ${JSON.stringify(jsonLayoutWorkerUri.toString())};
    </script>
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
