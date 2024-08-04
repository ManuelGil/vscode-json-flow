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
import { FilesController } from '../controllers';
import { getNonce } from '../helpers';
import { NodeModel } from '../models';

/**
 * The JSONProvider class.
 *
 * @class
 * @classdesc The class that represents the json provider.
 * @export
 * @public
 * @property {string} static viewType - The view type
 * @property {WebviewView} [_view] - The view
 * @property {OpenAIService} [openAISservice] - The OpenAI service
 * @example
 * const provider = new JSONProvider(extensionUri);
 */
export class JSONProvider {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  // Public properties
  /**
   * The current provider.
   *
   * @public
   * @static
   * @memberof JSONProvider
   * @type {JSONProvider | undefined}
   */
  static currentProvider: JSONProvider | undefined;

  /**
   * The view type.
   *
   * @public
   * @static
   * @memberof JSONProvider
   * @type {string}
   */
  static readonly viewType: string = `${EXTENSION_ID}.jsonView`;

  // Private properties
  /**
   * The disposables.
   *
   * @private
   * @memberof JSONProvider
   * @type {Disposable[]}
   */
  private _disposables: Disposable[] = [];

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Constructor for the JSONProvider class.
   *
   * @constructor
   * @param {WebviewPanel} _panel - The webview panel
   * @param {Uri} _extensionUri - The extension URI
   * @public
   * @memberof JSONProvider
   */
  private constructor(
    private readonly _panel: WebviewPanel,
    private readonly _extensionUri: Uri,
  ) {
    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables,
    );

    this._panel.webview.onDidReceiveMessage(
      (command) => {
        switch (command.type) {
          case 'gotoLine':
            FilesController.gotoLine(command.uri, command.line);
            return;
        }
      },
      null,
      this._disposables,
    );
  }

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  // Public methods
  /**
   * The openPreview method.
   *
   * @function openPreview
   * @param {Uri} extensionUri - The extension URI
   * @param {NodeModel} json - The JSON URI
   * @public
   * @static
   * @memberof JSONProvider
   * @example
   * JSONProvider.openPreview(extensionUri);
   *
   * @returns {void}
   */
  static openPreview(extensionUri: Uri, json: NodeModel): void {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.One;

    if (JSONProvider.currentProvider) {
      JSONProvider.currentProvider._panel.reveal(column);
    } else {
      const panel = window.createWebviewPanel(
        JSONProvider.viewType,
        'JSON Preview',
        ViewColumn.Beside,
        this.getWebviewOptions(extensionUri),
      );

      JSONProvider.currentProvider = new JSONProvider(panel, extensionUri);
    }

    JSONProvider.currentProvider._panel.webview.postMessage({
      json: json.resourceUri,
    });
  }

  /**
   * The getWebviewOptions method.
   *
   * @function getWebviewOptions
   * @param {Uri} extensionUri - The extension URI
   * @public
   * @static
   * @memberof JSONProvider
   * @example
   * const options = JSONProvider.getWebviewOptions(extensionUri);
   *
   * @returns {WebviewOptions} - The webview options
   */
  static getWebviewOptions(extensionUri: Uri): WebviewOptions {
    return {
      enableScripts: true,
      localResourceRoots: [Uri.joinPath(extensionUri, './out/webview')],
    };
  }

  /**
   * The revive method.
   *
   * @function revive
   * @param {WebviewPanel} panel - The webview panel
   * @param {Uri} extensionUri - The extension URI
   * @public
   * @static
   * @memberof JSONProvider
   * @example
   * JSONProvider.revive(panel, extensionUri);
   *
   * @returns {void}
   */
  static revive(panel: WebviewPanel, extensionUri: Uri): void {
    JSONProvider.currentProvider = new JSONProvider(panel, extensionUri);
  }

  /**
   * The dispose method.
   *
   * @function dispose
   * @public
   * @memberof JSONProvider
   * @example
   * provider.dispose();
   *
   * @returns {void}
   */
  dispose() {
    JSONProvider.currentProvider = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  // Private methods
  /**
   * The _update method.
   *
   * @function _update
   * @private
   * @memberof JSONProvider
   * @example
   * provider._update();
   *
   * @returns {void}
   */
  private _update(): void {
    const webview = this._panel.webview;

    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  /**
   * The _getHtmlForWebview method.
   *
   * @function _getHtmlForWebview
   * @param {Webview} webview - The webview
   * @private
   * @memberof JSONProvider
   * @example
   * const html = provider._getHtmlForWebview(webview);
   *
   * @returns {string} - The HTML for the webview
   */
  private _getHtmlForWebview(webview: Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, './out/webview', 'main.js'),
    );

    // Do the same for the stylesheet.
    const styleMainUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, './out/webview', 'main.css'),
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
      script-src 'nonce-${nonce}';"
    />

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <link href="${styleMainUri}" rel="stylesheet" />

    <title>JSON Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>
`;
  }
}
