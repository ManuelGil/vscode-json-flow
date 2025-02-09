import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { ExtensionContext, Range, Uri, l10n, window, workspace } from 'vscode';
import { ExtensionConfig } from '../configs';
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

  // Public properties
  /**
   * The image folder.
   *
   * @public
   * @memberof JsonController
   * @type {string}
   */
  static imageFolder: string;

  // Private properties
  /**
   * The preview delay constant.
   * @type {number}
   * @private
   * @memberof JsonController
   * @example
   * private _processingDelay: number = 1000;
   */
  private _processingDelay: number = 1000; // Delay constant for preview initialization

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
  constructor(
    readonly context: ExtensionContext,
    readonly config: ExtensionConfig,
  ) {
    JSONProvider.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'updateConfig':
          try {
            await workspace
              .getConfiguration('jsonFlow')
              .update('graph.layoutOrientation', message.orientation, false);
          } catch (error) {
            console.error('Error updating config:', error);
          }
          break;
      }
    });
  }

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
      const { graphLayoutOrientation } = this.config;
      // Get the language ID and file name
      const { languageId, fileName } = document;

      // Determine the file type, defaulting to 'json' if unsupported
      let fileType = languageId;

      if (!isFileTypeSupported(fileType)) {
        const fileExtension = fileName.split('.').pop();

        fileType = fileExtension;
      }

      // Parse JSON content
      const parsedJsonData = parseJSONContent(
        document.getText(),
        fileType as FileType,
      );

      // Check if the JSON content is null
      if (parsedJsonData === null) {
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
          command: 'update',
          data: parsedJsonData,
          orientation: graphLayoutOrientation,
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
    const { graphLayoutOrientation } = this.config;
    // Get the active text editor
    const editor = window.activeTextEditor;

    // Check if there is an active editor
    if (!editor) {
      const message = l10n.t('No active editor!');
      window.showErrorMessage(message);
      return;
    }

    // Check if there is a selection
    const selection = editor.selection;

    if (selection.isEmpty) {
      const message = l10n.t('No selection!');
      window.showErrorMessage(message);
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

    let fileType = languageId;

    let text = editor.document.getText(selectionRange);

    if (
      [
        'javascript',
        'javascriptreact',
        'typescript',
        'typescriptreact',
      ].includes(fileType)
    ) {
      fileType = 'json';

      text = text
        .replace(/'([^']+)'/g, '"$1"')
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/,*\s*\n*\]/g, ']')
        .replace(/{\s*\n*/g, '{')
        .replace(/,*\s*\n*};*/g, '}');
    }

    if (!isFileTypeSupported(fileType)) {
      const fileExtension = fileName.split('.').pop();

      fileType = isFileTypeSupported(fileExtension) ? fileExtension : 'jsonc';
    }

    // Parse JSON content
    const parsedJsonData = parseJSONContent(text, fileType as FileType);

    // Check if the JSON content is null
    if (parsedJsonData === null) {
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
        command: 'update',
        data: parsedJsonData,
        orientation: graphLayoutOrientation,
      });
    }, this._processingDelay);
  }
}
