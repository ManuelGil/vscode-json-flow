import { ExtensionContext, l10n, Range, Uri, window, workspace } from 'vscode';

import { ExtensionConfig } from '../configs';
import { FileType, isFileTypeSupported, parseJSONContent } from '../helpers';
import { normalizeToJsonString } from '../helpers/normalize.helper';
import { JSONProvider } from '../providers';

/**
 * Controls JSON preview and parsing actions for the VSCode JSON Flow extension.
 * Handles showing JSON previews, parsing, and error handling in the editor.
 */
export class JsonController {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  /**
   * Delay in milliseconds for initializing the JSON preview panel (to ensure webview is ready).
   */
  private _processingDelay: number = 1000;

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Creates a new JsonController.
   * @param context The VSCode extension context.
   * @param config The extension configuration instance.
   */
  constructor(
    readonly context: ExtensionContext,
    readonly config: ExtensionConfig,
  ) {}

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  /**
   * Displays a JSON preview for the given file URI in a webview panel.
   * Shows error messages for invalid files or parsing errors.
   * @param uri The file URI to preview.
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
          path: uri.fsPath,
          fileName,
        });
      }, this._processingDelay);
    });
  }

  /**
   * Displays a JSON preview for the currently selected text in the active editor.
   * Shows error messages if there is no selection or if parsing fails.
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
    const { languageId, fileName, uri } = editor.document;

    let fileType = languageId;
    let text = editor.document.getText(selectionRange);

    // Normalización centralizada
    const { normalized, detectedType } = normalizeToJsonString(text, fileType);
    fileType = detectedType;
    text = normalized;

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
        path: uri.fsPath,
        fileName,
      });
    }, this._processingDelay);
  }
}
