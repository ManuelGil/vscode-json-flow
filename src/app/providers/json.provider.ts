import {
  commands,
  Disposable,
  Event,
  EventEmitter,
  Range,
  Selection,
  TextEditorRevealType,
  Uri,
  ViewColumn,
  Webview,
  WebviewOptions,
  WebviewPanel,
  window,
} from 'vscode';

import { EXTENSION_DISPLAY_NAME, EXTENSION_ID } from '../configs';
import { getNonce, getSelectionMapper } from '../helpers';

/**
 * JSONProvider manages the JSON preview webview panel for the VSCode JSON Flow extension.
 * Responsible for rendering and updating the webview panel content.
 * Follows SOLID principles for maintainability and extensibility.
 *
 * @example
 * JSONProvider.createPanel(extensionUri);
 */
/* biome-ignore lint/style/useNamingConvention: Allow acronym class name used across extension APIs */
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
   * Tracks the last time a worker health check was successful
   * Used to detect and recover from worker failures
   */
  static lastWorkerHealthCheckTime: number | undefined;

  /**
   * Number of consecutive worker health check failures
   */
  static workerHealthCheckFailures: number = 0;

  /**
   * Maximum allowed time (ms) between successful worker health checks
   * If exceeded, will trigger recovery actions
   */
  static workerHealthCheckThresholdMs: number = 10000; // 10 seconds default

  /**
   * Guard to prevent feedback loop when applying selection from webview
   */
  static suppressEditorSelectionEvent: boolean = false;

  /**
   * Optional throttle duration from host to align webview batching
   */
  static hostThrottleMs: number | undefined;

  /**
   * Extension configuration that should be synchronized with the webview
   */
  static configState: Record<string, unknown> = {};

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
   * Tracks whether the webview HTML has been initialized to avoid reloading
   * the entire webview on reveal/focus changes, which causes flicker.
   */
  private _htmlInitialized: boolean = false;

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

    // Start health check monitoring system
    this._initializeHealthCheckSystem();

    // Listen for messages from the webview (extend as needed for interactivity).
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message?.command ?? message?.type) {
          case 'healthCheck': {
            // Immediately respond to health check pings with a pong
            if (message.type === 'ping') {
              // Record successful health check
              JSONProvider.lastWorkerHealthCheckTime = Date.now();
              JSONProvider.workerHealthCheckFailures = 0;

              this._panel.webview.postMessage({
                command: 'healthCheck',
                type: 'pong',
                timestamp: JSONProvider.lastWorkerHealthCheckTime,
                id: message.id,
                origin: 'extension',
              });
            }
            break;
          }
          case 'graphSelectionChanged': {
            if (!JSONProvider.liveSyncEnabled) {
              break;
            }
            // Inbound guards: only accept messages from webview origin.
            // For backward compatibility with 2.2.1, we still accept messages when origin is omitted,
            // but we log a warning to encourage explicit origin usage going forward.
            if (message?.origin && message.origin !== 'webview') {
              break;
            }
            if (!message?.origin) {
              console.warn(
                '[JSON Flow] Inbound selection message without origin; accepting for compatibility',
              );
            }
            // If message includes a path, it must match the previewedPath, with Windows-insensitive comparison.
            const maybePath = (message as { path?: string } | undefined)?.path;
            if (typeof maybePath === 'string' && JSONProvider.previewedPath) {
              const a = maybePath;
              const b = JSONProvider.previewedPath;
              const samePath =
                process.platform === 'win32'
                  ? a.toLowerCase() === b.toLowerCase()
                  : a === b;
              if (!samePath) {
                break;
              }
            }
            try {
              const nodeId = message?.nodeId as string | undefined;
              if (!nodeId) {
                break;
              }
              // De-duplication: ignore if the same nodeId was just applied from a previous inbound message.
              if (JSONProvider.lastAppliedNodeId === nodeId) {
                break;
              }
              const editor = window.activeTextEditor;
              if (!editor) {
                break;
              }
              const doc = editor.document;
              // Active editor guard: only apply selection if it matches the previewed file
              const previewPath = JSONProvider.previewedPath;
              if (!previewPath) {
                break;
              }
              if (doc.uri.fsPath !== previewPath) {
                break;
              }
              const text = doc.getText();
              const mapper = getSelectionMapper(doc.languageId, doc.fileName);
              const byteRange = mapper?.rangeFromNodeId(text, nodeId);
              if (!byteRange) {
                break;
              }
              const start = doc.positionAt(byteRange.start);
              const end = doc.positionAt(byteRange.end);
              JSONProvider.suppressEditorSelectionEvent = true;
              editor.selection = new Selection(start, end);
              editor.revealRange(
                new Range(start, end),
                TextEditorRevealType.InCenterIfOutsideViewport,
              );
              JSONProvider.lastAppliedNodeId = nodeId;
            } finally {
              // Release suppression on next tick to avoid immediate event
              setTimeout(() => {
                JSONProvider.suppressEditorSelectionEvent = false;
              }, 0);
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

        // BUGFIX v2.3.2: Ensure worker health check is performed when panel becomes visible
        // This helps recover from potential worker issues when the panel is hidden/shown
        if (this._panel.visible) {
          // Schedule a health check ping
          this._scheduleWorkerHealthCheck();
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
   * Gets the event emitter for state changes (split view or live sync).
   * @returns The event emitter for state changes.
   */
  static get onStateChanged(): Event<{
    isSplitView?: boolean;
    liveSyncEnabled?: boolean;
  }> {
    return JSONProvider._onStateChanged.event;
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
    if (JSONProvider.currentProvider) {
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
          paused: JSONProvider.liveSyncPaused,
          reason: JSONProvider.liveSyncPauseReason,
          throttleMs: JSONProvider.hostThrottleMs,
          origin: 'extension',
          nonce: getNonce(),
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

    // Sync initial configuration state with the new webview
    JSONProvider.syncConfigState();
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
        paused: JSONProvider.liveSyncPaused,
        reason: JSONProvider.liveSyncPauseReason,
        throttleMs: JSONProvider.hostThrottleMs,
        origin: 'extension',
        nonce: getNonce(),
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
    JSONProvider.previewedPath = undefined;
    // Reflect state in context for menus/UX
    commands.executeCommand('setContext', 'jsonFlow.splitView', false);
    // Notify listeners
    JSONProvider._onStateChanged.fire({ isSplitView: false });

    // Dispose the webview panel if it exists
    if (this._panel) {
      try {
        this._panel.dispose();
      } catch (error: unknown) {
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
        } catch (error: unknown) {
          // Ignore errors if already disposed
          console.error('Error disposing disposable:', error);
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
    commands.executeCommand('setContext', 'jsonFlow.liveSyncEnabled', enabled);
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
    } catch {
      // ignore
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
    } catch {
      // ignore
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
   * Updates the configuration state and synchronizes it with the webview
   * This should be called whenever relevant extension configuration changes
   *
   * @param config Configuration object with settings to synchronize
   * @param broadcast Whether to broadcast to the webview immediately
   */
  static updateConfigState(
    config: Record<string, unknown>,
    broadcast = true,
  ): void {
    // Merge the new config with existing state
    JSONProvider.configState = { ...JSONProvider.configState, ...config };

    if (broadcast && JSONProvider.currentProvider) {
      try {
        JSONProvider.postMessageToWebview({
          command: 'configUpdate',
          config: JSONProvider.configState,
          origin: 'extension',
          nonce: getNonce(),
        });
      } catch {
        // ignore transmission errors
      }
    }
  }

  /**
   * Sends the full current configuration state to the webview
   * Useful when a webview is first created or reconnected
   */
  static syncConfigState(): void {
    if (JSONProvider.currentProvider) {
      try {
        JSONProvider.postMessageToWebview({
          command: 'configSync',
          config: JSONProvider.configState,
          origin: 'extension',
          nonce: getNonce(),
        });
      } catch {
        // ignore transmission errors
      }
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
    } catch {
      // ignore
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
    JSONProvider.lastWorkerHealthCheckTime = undefined;
    JSONProvider.workerHealthCheckFailures = 0;
    JSONProvider.configState = {};
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
    if (prev !== path) {
      JSONProvider.lastAppliedNodeId = undefined;
    }
  }

  /**
   * Initializes the health check monitoring system for the worker
   * Sets up periodic health checks and recovery mechanisms
   */
  private _initializeHealthCheckSystem(): void {
    // Initialize last health check time to now
    JSONProvider.lastWorkerHealthCheckTime = Date.now();
    JSONProvider.workerHealthCheckFailures = 0;

    // Schedule first health check
    this._scheduleWorkerHealthCheck();

    // Set up periodic health check monitoring (every 5 seconds)
    const healthMonitorId = setInterval(() => {
      // Check if panel is still active
      if (!this._panel || this._isDisposed) {
        clearInterval(healthMonitorId);
        return;
      }

      // If visible, verify worker health
      if (this._panel.visible) {
        this._verifyWorkerHealth();
      }
    }, 5000);

    // Ensure health monitor is disposed with provider
    this._disposables.push({
      dispose: () => clearInterval(healthMonitorId),
    });
  }

  /**
   * Schedules a worker health check by sending a ping message
   * This proactively checks if the worker is responsive
   */
  private _scheduleWorkerHealthCheck(): void {
    // Only send if panel is active and visible
    if (!this._panel || !this._panel.visible || this._isDisposed) {
      return;
    }

    try {
      // Send ping with unique ID to verify worker responsiveness
      this._panel.webview.postMessage({
        command: 'healthCheck',
        type: 'ping',
        timestamp: Date.now(),
        id: `hc-${Date.now()}`,
        origin: 'extension',
      });
    } catch (error) {
      console.warn('Worker health check failed:', error);
      // Record failure
      JSONProvider.workerHealthCheckFailures += 1;
    }
  }

  /**
   * Verifies worker health by checking time since last successful health check
   * Triggers recovery actions if necessary
   */
  private _verifyWorkerHealth(): void {
    const now = Date.now();
    const lastCheck = JSONProvider.lastWorkerHealthCheckTime || 0;

    // If last check is too old, worker might be unresponsive
    if (now - lastCheck > JSONProvider.workerHealthCheckThresholdMs) {
      console.warn(
        `Worker health check threshold exceeded: ${now - lastCheck}ms since last response`,
      );

      // Increment failure count
      JSONProvider.workerHealthCheckFailures += 1;

      // Recovery actions based on failure count
      if (JSONProvider.workerHealthCheckFailures >= 3) {
        // After multiple failures, try more aggressive recovery
        this._attemptWorkerRecovery();
      } else {
        // First attempt: just try another health check
        this._scheduleWorkerHealthCheck();
      }
    } else {
      // Worker seems healthy, schedule next check
      this._scheduleWorkerHealthCheck();
    }
  }

  /**
   * Attempts to recover from worker failures using increasingly aggressive strategies
   */
  private _attemptWorkerRecovery(): void {
    console.warn(
      `Attempting worker recovery after ${JSONProvider.workerHealthCheckFailures} failures`,
    );

    try {
      // First, try to reset the worker state with a reset message
      this._panel.webview.postMessage({
        command: 'resetWorker',
        origin: 'extension',
      });

      // If failures persist beyond a threshold, try refreshing the webview
      if (JSONProvider.workerHealthCheckFailures >= 5) {
        console.warn('Worker recovery: refreshing webview HTML...');

        // Force HTML reload
        this._htmlInitialized = false;
        this._update();

        // Reset failure counter
        JSONProvider.workerHealthCheckFailures = 0;
        JSONProvider.lastWorkerHealthCheckTime = Date.now();
      }
    } catch (error) {
      console.error('Worker recovery attempt failed:', error);
    }
  }

  /**
   * Updates the webview HTML content for the panel.
   * Called internally after state or data changes, or when the panel is shown.
   */
  private _update(): void {
    const webview = this._panel.webview;
    // Only set the HTML once per panel lifecycle to prevent full reloads
    // when the panel gains focus or is revealed again.
    if (this._htmlInitialized) {
      return;
    }
    this._panel.webview.html = this._getHtmlForWebview(webview);
    this._htmlInitialized = true;
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
    // Vite is configured to emit worker assets under assets/[name].js
    const jsonLayoutWorkerUri = webview.asWebviewUri(
      Uri.joinPath(
        this._extensionUri,
        './dist',
        'assets',
        'JsonLayoutWorker-worker.js',
      ),
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
        worker-src ${webview.cspSource};
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
    <!-- Expose worker URL for safe instantiation inside the webview -->
    <script nonce="${nonce}">
      // Make the worker URL available to the webview JS (read-only exposure)
      window.__jsonFlowWorkerUrl = ${JSON.stringify(jsonLayoutWorkerUri.toString())};
      
      // Add health check handler to listen for extension health check requests
      window.addEventListener('message', (event) => {
        const message = event.data;
        // Handle health check pings from extension
        if (message && (message.command === 'healthCheck' || message.type === 'ping')) {
          // Respond immediately to confirm worker connectivity
          const vscode = acquireVsCodeApi();
          vscode.postMessage({
            command: 'healthCheck',
            type: 'pong',
            timestamp: Date.now(),
            id: message.id,
            origin: 'webview'
          });
        }
        // Handle worker reset requests
        if (message && message.command === 'resetWorker') {
          try {
            // Tell any active worker instances to clean up
            window.dispatchEvent(new CustomEvent('json-worker-reset', {
              detail: { reason: 'extension-requested-reset' }
            }));
          } catch (e) {
            console.error('Worker reset failed:', e);
          }
        }
      });
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
