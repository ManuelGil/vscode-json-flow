import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { ExtensionContext, Range, Uri, l10n, window, workspace } from 'vscode';
import { ExtensionConfig } from '../configs';
import {
  FileType,
  generateTree,
  isFileTypeSupported,
  parseJSONContent,
} from '../helpers';
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
    JsonController.imageFolder = config.imageFolder;
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

      const data = generateTree(jsonContent, this.config.showValues);

      const layoutDirection = this.config.layoutDirection;

      // Post the message to the webview with a delay
      setTimeout(() => {
        panel.webview.postMessage({
          type: 'setJson',
          layoutDirection,
          data,
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
    const jsonContent = parseJSONContent(text, fileType as FileType);

    // Check if the JSON content is null
    if (jsonContent === null) {
      return;
    }

    // Derive the file name for the preview panel title
    const displayName = fileName.split(/[\\/]/).pop() || 'JSON Flow';

    // Initialize the webview panel
    const panel = JSONProvider.createPanel(this.context.extensionUri);

    panel.title = displayName;

    const data = generateTree(jsonContent, this.config.showValues);

    const layoutDirection = this.config.layoutDirection;

    // Post the message to the webview with a delay
    setTimeout(() => {
      panel.webview.postMessage({
        type: 'setJson',
        layoutDirection,
        data,
      });
    }, this._processingDelay);
  }

  /**
   * The saveImage method.
   *
   * @function saveImage
   * @param {string} dataUrl - The data URL
   * @public
   * @memberof JsonController
   * @example
   * controller.saveImage(dataUrl);
   *
   * @returns {Promise<void>}
   */
  static async saveImage(data: string): Promise<void> {
    const base64Data = data.replace(/^data:image\/png;base64,/, ''); // Remove metadata
    const buffer = Buffer.from(base64Data, 'base64'); // Convert base64 to binary

    // Generate a random filename with the date and time as a prefix and the .png extension
    // The filename won't be have a special characters or spaces to avoid issues
    const fileName = `json-flow-${new Date().toISOString().replace(/[^0-9]/g, '')}.png`;

    // Define the file path
    let filePath: string;

    // Get the workspace folders
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      window.showErrorMessage(
        l10n.t('No workspace folder available to save the image!'),
      );
      return;
    }

    // Optionally, prompt the user to select a workspace folder if multiple are available
    if (workspaceFolders.length === 1) {
      filePath = join(
        workspaceFolders[0].uri.fsPath,
        this.imageFolder,
        fileName,
      );
    } else {
      // await window.showWorkspaceFolderPick({placeHolder});
      const folder = await window.showWorkspaceFolderPick({
        placeHolder: l10n.t('Select a workspace folder to save the image'),
      });

      if (!folder) {
        return;
      }

      // Save the file in the selected workspace folder
      filePath = join(folder.uri.fsPath, this.imageFolder, fileName);
    }

    // Create the directory if it doesn't exist
    if (!existsSync(dirname(filePath))) {
      await mkdirSync(dirname(filePath), { recursive: true });
    }

    // Write the file to the disk
    writeFileSync(filePath, buffer);

    // Show a message to the user
    window.showInformationMessage(l10n.t('Image saved to: {0}', filePath));
  }
}
