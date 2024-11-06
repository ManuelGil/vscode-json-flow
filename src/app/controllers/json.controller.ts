import { ExtensionContext, Range, Uri, window, workspace } from 'vscode';
import { FileType, isFileTypeSupported, parseJSONContent } from '../helpers';
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
  // Properties
  // -----------------------------------------------------------------

  // Private properties
  /**
   * The preview delay constant.
   * @type {number}
   * @private
   * @memberof JsonController
   * @example
   * private _processingDelay: number = 1000;
   */
  private _processingDelay: number = 500; // Delay constant for preview initialization

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
    // Open the text document
    workspace.openTextDocument(uri.fsPath).then((document) => {
      // Get the language ID and file name
      const { languageId, fileName } = document;

      // Determine the file type, defaulting to 'json' if unsupported
      let fileType = languageId;

      if (!isFileTypeSupported(fileType)) {
        const fileExtension = fileName.split('.').pop();

        fileType = fileExtension;
      }

      // Parse JSON content
      const jsonContent = parseJSONContent(
        document.getText(),
        fileType as FileType,
      );

      // Check if the JSON content is null
      if (jsonContent === null) {
        return;
      }

      // Derive the file name for the preview panel title
      const displayName = fileName.split(/[\\/]/).pop() || 'JSON Flow';

      // Initialize the webview panel
      const panel = JSONProvider.createPanel(this.context.extensionUri);

      panel.title = displayName;

      // Post the message to the webview with a delay
      setTimeout(() => {
        panel.webview.postMessage({
          data: { [displayName]: jsonContent },
        });
      }, this._processingDelay);
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
    // Get the active text editor
    const editor = window.activeTextEditor;

    // Check if there is an active editor
    if (!editor) {
      window.showErrorMessage('No active editor!');
      return;
    }

    // Check if there is a selection
    const selection = editor.selection;

    if (selection.isEmpty) {
      window.showErrorMessage('No selection!');
      return;
    }

    // Get the selection range
    const selectionRange = new Range(
      selection.start.line,
      selection.start.character,
      selection.end.line,
      selection.end.character,
    );

    // Get the language ID and file name
    const { languageId, fileName } = editor.document;

    // Determine the file type, defaulting to 'json' if unsupported
    let fileType = languageId;

    if (!isFileTypeSupported(fileType)) {
      const fileExtension = fileName.split('.').pop();

      fileType = fileExtension;
    }

    // Parse JSON content
    const jsonContent = parseJSONContent(
      editor.document.getText(selectionRange),
      fileType as FileType,
    );

    // Check if the JSON content is null
    if (jsonContent === null) {
      return;
    }

    // Derive the file name for the preview panel title
    const displayName = fileName.split(/[\\/]/).pop() || 'JSON Flow';

    // Initialize the webview panel
    const panel = JSONProvider.createPanel(this.context.extensionUri);

    panel.title = displayName;

    // Post the message to the webview with a delay
    setTimeout(() => {
      panel.webview.postMessage({
        data: { [displayName]: jsonContent },
      });
    }, this._processingDelay);
  }
}
