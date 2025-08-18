import fg from 'fast-glob';
import ignore from 'ignore';
import { relative } from 'path';
import { env, l10n, Range, ThemeIcon, Uri, window, workspace } from 'vscode';

import { EXTENSION_ID, ExtensionConfig } from '../configs';
import {
  FileType,
  isFileTypeSupported,
  normalizeToJsonString,
  parseJSONContent,
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
    // Get the files in the folder
    let folders: string[] = [];
    let files: Uri[] = [];

    if (!workspace.workspaceFolders) {
      const message = l10n.t('Operation canceled');
      window.showErrorMessage(message);
      return;
    }

    folders = workspace.workspaceFolders.map((folder) => folder.uri.fsPath);

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

    for (const folder of folders) {
      const result = await this.findFiles(
        folder,
        includePatterns,
        fileExclusionPatterns,
        maxSearchRecursionDepth,
        supportsHiddenFiles,
        preserveGitignoreSettings,
      );

      files.push(...result);
    }

    if (files.length !== 0) {
      const nodes: NodeModel[] = [];

      files.sort((a, b) => a.path.localeCompare(b.path));

      for (const file of files) {
        const path = workspace.asRelativePath(file.fsPath);
        let filename = path.split('/').pop();

        if (filename && includeFilePath) {
          const folder = path.split('/').slice(0, -1).join('/');

          filename += folder ? ` (${folder})` : ' (root)';
        }

        const node = new NodeModel(
          filename ?? 'Untitled',
          new ThemeIcon('file'),
          {
            command: `${EXTENSION_ID}.json.showPreview`,
            title: 'Open Preview',
            arguments: [file],
          },
          file,
          file.fsPath,
        );
        node.tooltip = l10n.t(
          'File: {0}\nPath: {1}\nHint: Click to open preview',
          [filename ?? 'Untitled', path],
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
  openFile(node: { resourceUri: Uri }) {
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
  copyContent(node: NodeModel) {
    if (node.resourceUri) {
      workspace.openTextDocument(node.resourceUri).then((document) => {
        const message = l10n.t('Content copied to clipboard');
        env.clipboard.writeText(document.getText());
        window.showInformationMessage(message);
      });
    }
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
        const jsonContent = parseJSONContent(
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
    const jsonContent = parseJSONContent(text, fileType as FileType);

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
          [fileName, languageId, lineCount, version],
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
  private async findFiles(
    baseDir: string,
    includeFilePatterns: string[],
    excludedPatterns: string[] = [],
    deep: number = 0,
    includeDotfiles: boolean = true,
    enableGitignoreDetection: boolean = false,
    disableRecursive: boolean = false,
  ): Promise<Uri[]> {
    try {
      // Check if any include patterns were provided
      if (!includeFilePatterns.length) {
        return [];
      }

      // If we need to respect .gitignore, we need to load it
      let gitignore;

      if (enableGitignoreDetection) {
        const baseUri = Uri.file(baseDir);
        const gitignoreUri = Uri.joinPath(baseUri, '.gitignore');
        // Load .gitignore if it exists using VS Code workspace.fs
        try {
          const contentBytes = await workspace.fs.readFile(gitignoreUri);
          const gitignoreText = new TextDecoder().decode(contentBytes);
          gitignore = ignore().add(gitignoreText);
        } catch (error: unknown) {
          // Ignore missing file, rethrow other errors
          if ((error as { code?: string }).code !== 'FileNotFound') {
            throw error;
          }
        }
      }

      // Configure fast-glob options with optimizations for large projects
      const options = {
        cwd: baseDir, // Set the base directory for searching
        absolute: true, // Return absolute paths for files found
        onlyFiles: true, // Match only files, not directories
        dot: includeDotfiles, // Include the files and directories starting with a dot
        deep: disableRecursive ? 1 : deep === 0 ? undefined : deep, // Set the recursion depth
        ignore: excludedPatterns, // Set the patterns to ignore files and directories
        followSymbolicLinks: false, // Don't follow symlinks for better performance
        cache: true, // Enable cache for better performance in large projects
        stats: false, // Don't return stats objects for better performance
        throwErrorOnBrokenSymbolicLink: false, // Don't throw on broken symlinks
        objectMode: false, // Use string mode for better performance
      };

      // Use fast-glob to find matching files
      let foundFilePaths = await fg(includeFilePatterns, options);

      // Apply gitignore filtering if needed
      if (gitignore) {
        foundFilePaths = foundFilePaths.filter(
          (filePath) => !gitignore.ignores(relative(baseDir, filePath)),
        );
      }

      // Convert file paths to VS Code Uri objects
      return foundFilePaths.sort().map((filePath) => Uri.file(filePath));
    } catch (error: unknown) {
      const errorDetails =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { message: String(error) };

      const message = l10n.t('Error finding files: {0}', [
        errorDetails.message,
      ]);
      window.showErrorMessage(message);

      return [];
    }
  }
}
