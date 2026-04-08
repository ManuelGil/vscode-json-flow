import {
  ExtensionContext,
  l10n,
  ProgressLocation,
  Range,
  Uri,
  ViewColumn,
  window,
  workspace,
} from 'vscode';

import { ExtensionConfig } from '../configs';
import {
  applyNodeEdit,
  FileType,
  isEditCapableFileType,
  isFileTypeSupported,
  logger,
  MutationResult,
  NodeEditIntent,
  normalizeToJsonString,
  parseJsonContent,
  parseJsonTolerant,
} from '../helpers';
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
  async showPreview(
    uri: Uri,
    column: ViewColumn = ViewColumn.One,
  ): Promise<void> {
    try {
      const document = await workspace.openTextDocument(uri.fsPath);
      const { graphLayoutOrientation } = this.config;
      // Get the language ID and file name
      const { languageId, fileName } = document;

      // Determine the file type, defaulting to 'json' if unsupported
      let fileType = languageId;

      if (!isFileTypeSupported(fileType)) {
        const baseName = fileName.split(/[\\\/]/).pop() ?? fileName;
        if (/^\.env(\..*)?$/i.test(baseName)) {
          fileType = 'env';
        } else {
          const fileExtension = fileName.split('.').pop();
          fileType = isFileTypeSupported(fileExtension)
            ? fileExtension
            : 'json';
        }
      }

      // Parse JSON content
      const result = parseJsonContent(document.getText(), fileType as FileType);

      // Guarantee fileType is always available for downstream capability checks.
      const fileTypeFromResult = (result as { fileType?: string } | undefined)
        ?.fileType;
      fileType = (fileTypeFromResult ?? 'json').toLowerCase().trim();

      const parsedJsonData = result;

      // Check if parsing failed
      if (parsedJsonData === undefined) {
        window.showErrorMessage(l10n.t('Could not parse JSON for preview'));
        return;
      }

      this.showJsonPanel(
        parsedJsonData,
        fileName,
        graphLayoutOrientation,
        uri.fsPath,
        {
          languageId,
          canEdit: isEditCapableFileType(fileType),
        },
        column,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error('Failed to open JSON preview', error, {
        uri: uri.fsPath,
        column: column,
      });

      window.showErrorMessage(
        l10n.t('Failed to open JSON preview: {0}', errorMessage),
      );
    }
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
      window.showErrorMessage(
        l10n.t('No active editor. Open a file to use this command'),
      );
      return;
    }

    // Check if there is a selection
    const selection = editor.selection;

    if (selection.isEmpty) {
      window.showErrorMessage(
        l10n.t('No selection. Select some text and try again'),
      );
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
    // Normalize JSON string and detect type
    const { normalized, detectedType } = normalizeToJsonString(text, fileType);
    fileType = detectedType;
    text = normalized;

    if (!isFileTypeSupported(fileType)) {
      const baseName = fileName.split(/[\\\/]/).pop() ?? fileName;
      if (/^\.env(\..*)?$/i.test(baseName)) {
        fileType = 'env';
      } else {
        const fileExtension = fileName.split('.').pop();
        fileType = isFileTypeSupported(fileExtension) ? fileExtension : 'jsonc';
      }
    }

    // Parse JSON content
    const result = parseJsonContent(text, fileType as FileType);

    // Guarantee fileType is always available for downstream capability checks.
    const fileTypeFromResult = (result as { fileType?: string } | undefined)
      ?.fileType;
    fileType = (fileTypeFromResult ?? 'json').toLowerCase().trim();

    const parsedJsonData = result;

    // Check if parsing failed
    if (parsedJsonData === undefined) {
      window.showErrorMessage(l10n.t('Could not parse selected JSON'));
      return;
    }

    this.showJsonPanel(
      parsedJsonData,
      fileName,
      graphLayoutOrientation,
      uri.fsPath,
      {
        languageId,
        canEdit: isEditCapableFileType(fileType),
      },
    );
  }

  /**
   * Fetches JSON data from a REST API and displays it in a webview panel.
   * Prompts the user for the API URL and handles errors during fetching.
   */
  async fetchJsonData(): Promise<void> {
    const url = await window.showInputBox({
      prompt: l10n.t('Enter the REST API URL (GET)'),
      placeHolder: l10n.t('https://api.example.com/data'),
      validateInput: (text) => {
        if (!text.trim()) {
          return l10n.t('URL cannot be empty');
        }

        try {
          new URL(text);
          return null;
        } catch {
          return l10n.t('Invalid URL format');
        }
      },
    });

    if (!url) {
      window.showWarningMessage(l10n.t('Operation canceled: No URL provided'));
      return;
    }

    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: l10n.t('Fetching JSON...'),
        cancellable: false,
      },
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: { accept: 'application/json' },
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }

          const contentType = response.headers.get('Content-Type') || '';
          const data = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

          const parsedJsonData = parseJsonContent(
            typeof data === 'string' ? data : JSON.stringify(data),
            'json',
          );

          // Check if parsing failed
          if (parsedJsonData === undefined) {
            window.showErrorMessage(l10n.t('Could not parse fetched JSON'));
            return;
          }

          // Use a generic file name and orientation for the panel
          this.showJsonPanel(
            parsedJsonData,
            'Fetched Data',
            this.config.graphLayoutOrientation,
            'json',
            {
              languageId: 'json',
              canEdit: false,
            },
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          window.showErrorMessage(l10n.t('Error fetching JSON: {0}', msg));
        } finally {
          clearTimeout(timeout);
        }
      },
    );
  }

  /**
   * Handles a node edit intent from the webview by delegating to the
   * mutation pipeline. Retrieves the active TextDocument and applies
   * the edit via full-document replace.
   *
   * @param intent - The edit intent describing what to change.
   * @returns The mutation result.
   */
  async handleNodeEditIntent(intent: NodeEditIntent): Promise<MutationResult> {
    const editor = window.activeTextEditor;

    if (!editor) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    const document = editor.document;
    const documentText = document.getText();

    // Fail fast if the active document cannot be parsed by the mutation parser.
    if (!parseJsonTolerant(documentText)) {
      return { success: false, error: 'INVALID_JSON' };
    }

    try {
      const result: MutationResult = await applyNodeEdit(intent, document);

      if (!result.success) {
        const failedResult = result as { success: false; error: string };
        logger.error('Node edit failed', undefined, {
          nodeId: intent.nodeId,
          type: intent.type,
          error: failedResult.error,
        });
      }

      return result;
    } catch (error: unknown) {
      logger.error('Unexpected error during node edit', error, {
        nodeId: intent.nodeId,
        type: intent.type,
      });
      return { success: false, error: 'UNKNOWN' };
    }
  }

  async handleNodeEdit(intent: NodeEditIntent): Promise<MutationResult> {
    return this.handleNodeEditIntent(intent);
  }

  /**
   * Helper to create and update the JSON preview panel in a modular way.
   * @param data The parsed JSON data to display.
   * @param fileName The name of the file for panel title.
   * @param orientation The orientation for the graph layout.
   * @param path The file path (optional).
   */
  private showJsonPanel(
    data: unknown,
    fileName: string,
    orientation: string,
    path?: string,
    metadata: { languageId: string; canEdit: boolean } = {
      languageId: 'plaintext',
      canEdit: false,
    },
    column: ViewColumn = ViewColumn.One,
  ): void {
    const panel = JSONProvider.createPanel(this.context.extensionUri, column);

    // Track the previewed path so selection sync can filter to the active document
    try {
      JSONProvider.setPreviewedPath(path);
    } catch (error: unknown) {
      logger.error('Failed to set previewed path', error);
    }

    setTimeout(() => {
      panel.webview.postMessage({
        command: 'update',
        data,
        orientation,
        path,
        fileName,
        metadata,
      });
    }, this._processingDelay);
  }
}
