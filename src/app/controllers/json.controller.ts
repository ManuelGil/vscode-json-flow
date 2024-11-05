import { ExtensionContext, Range, Uri, window, workspace } from 'vscode';
import { parseJSONContent } from '../helpers';
import { JSONProvider } from '../providers';

/**
 * The JsonController class.
 *
 * @class
 * @classdesc The class that represents the JSON controller.
 * @export
 * @public
 * @property {ExtensionContext} context - The extension context
 * @example
 * const controller = new JsonController(context);
 */
export class JsonController {
  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Constructor for the JsonController class
   *
   * @constructor
   * @param {ExtensionContext} context - The extension context
   * @public
   * @memberof JsonController
   */
  constructor(readonly context: ExtensionContext) {}

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  // Public methods
  /**
   * The showPreview method.
   *
   * @function showPreview
   * @param {Uri} uri - The URI of the file
   * @public
   * @memberof JsonController
   * @example
   * controller.showPreview(uri);
   *
   * @returns {void}
   */
  showPreview(uri: Uri): void {
    const panel = JSONProvider.createPanel(this.context.extensionUri);

    workspace.openTextDocument(uri.fsPath).then((document) => {
      const { languageId } = document;
      const json = parseJSONContent(document.getText(), languageId);
      const fileName = document.fileName.split(/[\\/]/).pop() || 'JSON Flow';

      panel.title = fileName;

      if (json === null) {
        return;
      }

      setTimeout(() => {
        panel.webview.postMessage({
          data: { [fileName]: json },
        });
      }, 500);
    });
  }

  /**
   * The showPartialPreview method.
   *
   * @function showPartialPreview
   * @public
   * @memberof JsonController
   * @example
   * controller.showPartialPreview();
   *
   * @returns {void}
   */
  showPartialPreview(): void {
    const panel = JSONProvider.createPanel(this.context.extensionUri);

    const editor = window.activeTextEditor;

    if (!editor) {
      window.showErrorMessage('No active editor!');
      return;
    }

    const selection = editor.selection;

    if (selection.isEmpty) {
      window.showErrorMessage('No selection!');
      return;
    }

    const selectionRange = new Range(
      selection.start.line,
      selection.start.character,
      selection.end.line,
      selection.end.character,
    );

    const text = editor.document.getText(selectionRange) || '';
    const { languageId } = editor.document;
    const json = parseJSONContent(text, languageId);
    const fileName =
      editor.document.fileName.split(/[\\/]/).pop() || 'JSON Flow';

    panel.title = fileName;

    if (json === null) {
      return;
    }

    setTimeout(() => {
      panel.webview.postMessage({
        data: { root: json },
      });
    }, 500);
  }
}
