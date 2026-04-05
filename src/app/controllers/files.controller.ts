import { env, l10n, Range, ThemeIcon, Uri, window, workspace } from 'vscode';

import { CommandIds, EXTENSION_ID, ExtensionConfig } from '../configs';
import {
  FileType,
  findFiles,
  isFileTypeSupported,
  normalizeToJsonString,
  parseJsonContent,
  readFileContent,
  relativePath,
  resolveFolderResource,
} from '../helpers';
import { NodeModel } from '../models';

/**
 * Handles file operations such as listing, opening, and copying files for the VSCode JSON Flow extension.
 */
export class FilesController {
  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Creates a new FilesController instance.
   * @param config Extension configuration object.
   */
  constructor(readonly config: ExtensionConfig) {}

  /**
   * Returns a list of files in the workspace as plain file objects.
   * Shows an error message if no workspace is open or operation is canceled.
   * @returns Promise resolving to an array of file info objects or void if canceled.
   */
  async getFiles(): Promise<NodeModel[] | void> {
    if (
      !workspace.workspaceFolders ||
      workspace.workspaceFolders.length === 0
    ) {
      const message = l10n.t('Operation canceled');
      window.showErrorMessage(message);
      return;
    }

    const folderUris = workspace.workspaceFolders
      .map((folder) => resolveFolderResource(folder.uri) ?? folder.uri)
      .filter((uri): uri is Uri => uri !== undefined);

    if (folderUris.length === 0) {
      const message = l10n.t('Operation canceled');
      window.showErrorMessage(message);
      return;
    }

    const files: Uri[] = [];

    const {
      includedFilePatterns,
      excludedFilePatterns,
      maxSearchRecursionDepth,
      supportsHiddenFiles,
      preserveGitignoreSettings,
      includeFilePath,
    } = this.config;

    const fileExtensionPattern = `**/*.{${includedFilePatterns.join(',')}}`;
    // Include .env and .env.* files explicitly, since they don't have a normal extension
    const includePatterns = [fileExtensionPattern];
    if (includedFilePatterns.includes('env')) {
      includePatterns.push('**/.env', '**/.env.*');
    }
    const fileExclusionPatterns = Array.isArray(excludedFilePatterns)
      ? excludedFilePatterns
      : [excludedFilePatterns];

    for (const folderUri of folderUris) {
      const result = await findFiles({
        baseDirectoryPath: folderUri.fsPath,
        includeFilePatterns: includePatterns,
        excludedPatterns: fileExclusionPatterns,
        maxRecursionDepth: maxSearchRecursionDepth,
        includeDotfiles: supportsHiddenFiles,
        enableGitignoreDetection: preserveGitignoreSettings,
      });

      files.push(...result);
    }

    if (files.length !== 0) {
      const nodes: NodeModel[] = [];

      files.sort((a, b) => a.path.localeCompare(b.path));

      for (const file of files) {
        const path = relativePath(file, false, this.config) || file.fsPath;
        let filename = path.split('/').pop();

        if (filename && includeFilePath) {
          const folder = path.split('/').slice(0, -1).join('/');

          filename += folder ? ` (${folder})` : ' (root)';
        }

        const node = new NodeModel(
          filename ?? 'Untitled',
          new ThemeIcon('file'),
          {
            command: `${EXTENSION_ID}.${CommandIds.JsonShowPreview}`,
            title: 'Open Preview',
            arguments: [file],
          },
          file,
          file.fsPath,
        );
        node.tooltip = l10n.t(
          'File: {0}\nPath: {1}\nHint: Click to open preview',
          filename ?? 'Untitled',
          path,
        );
        nodes.push(node);
      }

      return nodes;
    }

    return [];
  }

  /**
   * Opens the file associated with the given node in the editor.
   * @param node NodeModel representing the file to open.
   */
  openFile(node: NodeModel) {
    if (node.resourceUri) {
      workspace.openTextDocument(node.resourceUri).then((filename) => {
        window.showTextDocument(filename);
      });
    }
  }

  /**
   * Copies the content of the file represented by the node to the clipboard.
   * @param node NodeModel representing the file to copy.
   */
  async copyContent(node: NodeModel) {
    if (!node.resourceUri) {
      return;
    }

    const content = await readFileContent(node.resourceUri);
    const message = l10n.t('Content copied to clipboard');
    env.clipboard.writeText(content);
    window.showInformationMessage(message);
  }

  /**
   * Copies the content of the file as JSON to the clipboard.
   * @param node NodeModel or Uri representing the file.
   */
  copyContentAsJson(node: NodeModel) {
    if (node) {
      // Get the resource URI
      const resourceUri = node instanceof NodeModel ? node.resourceUri : node;

      // Check if the resource URI is valid
      if (!resourceUri) {
        const message = l10n.t('Operation canceled');
        window.showErrorMessage(message);
        return;
      }

      // Open the text document
      workspace.openTextDocument(resourceUri).then(async (document) => {
        // Get the language ID and file name
        const { languageId, fileName } = document;

        // Determine the file type, handling .env variants explicitly
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
        const jsonContent = parseJsonContent(
          document.getText(),
          fileType as FileType,
        );

        // Check if the content is null
        if (jsonContent === null) {
          return;
        }

        // Copy the JSON content to the clipboard
        env.clipboard.writeText(JSON.stringify(jsonContent, null, 2));

        // Show the message
        const message = l10n.t('Content copied as JSON to clipboard');
        window.showInformationMessage(message);
      });
    }
  }

  /**
   * Copies the selected content in the active editor as JSON to the clipboard.
   */
  copyContentPartialAsJson() {
    // Get the active text editor
    const editor = window.activeTextEditor;

    // Check if there is an active editor
    if (!editor) {
      const message = l10n.t(
        'No active editor. Open a file to use this command',
      );
      window.showErrorMessage(message);
      return;
    }

    // Check if there is a selection
    const selection = editor.selection;

    if (selection.isEmpty) {
      const message = l10n.t('No selection. Select some text and try again');
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

    // Centralized normalization
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
    const jsonContent = parseJsonContent(text, fileType as FileType);

    // Check if the JSON content is null
    if (jsonContent === null) {
      return;
    }

    // Copy the JSON content to the clipboard
    env.clipboard.writeText(JSON.stringify(jsonContent, null, 2));

    // Show the message
    const message = l10n.t('Content copied as JSON to clipboard');
    window.showInformationMessage(message);
  }

  /**
   * Shows properties of the file represented by the given node in a modal message.
   * @param node NodeModel representing the file.
   */
  getFileProperties(node: NodeModel) {
    if (node.resourceUri) {
      workspace.openTextDocument(node.resourceUri).then(async (document) => {
        const { fileName, languageId, lineCount, version } = document;

        // Show the message
        const message = l10n.t(
          'File Name: {0}\nLanguage: {1}\nLines: {2}\nVersion: {3}',
          fileName,
          languageId,
          lineCount,
          version,
        );

        await window.showInformationMessage(message, { modal: true });
      });
    }
  }

  /**
   * Searches for files in a directory matching specified patterns with optimized performance
   *
   * @param {string} baseDir - Absolute path to the base directory to search in
   * @param {string[]} includeFilePatterns - Glob patterns for files to include (e.g. ['**\/*.ts'])
   * @param {string[]} excludedPatterns - Glob patterns for files or directories to exclude
   * @param {boolean} disableRecursive - When true, limits search to the immediate directory
   * @param {number} deep - Maximum depth for recursive search (0 = unlimited)
   * @param {boolean} includeDotfiles - When true, includes files and directories starting with a dot
   * @param {boolean} enableGitignoreDetection - When true, respects rules in .gitignore files
   * @returns {Promise<Uri[]>} Array of VS Code Uri objects for matched files
   * @throws {Error} If the directory access fails or pattern matching encounters errors
   * @private
   * @async
   * @memberof FilesController
   * @example
   * // Example usage:
   * // const tsFiles = await this.findFiles('/path/to/dir', ['**\/*.ts'], ['**\/node_modules/**']);
   */
}
