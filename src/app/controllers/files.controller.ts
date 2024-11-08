import { readdirSync } from 'fs';
import { minimatch } from 'minimatch';
import { join } from 'path';
import { env, l10n, Range, ThemeIcon, Uri, window, workspace } from 'vscode';

import { EXTENSION_ID, ExtensionConfig } from '../configs';
import { FileType, isFileTypeSupported, parseJSONContent } from '../helpers';
import { NodeModel } from '../models';

/**
 * The FilesController class.
 *
 * @class
 * @classdesc The class that represents the list files controller.
 * @export
 * @public
 * @property {ExtensionConfig} config - The configuration object
 * @example
 * const controller = new FilesController(config);
 */
export class FilesController {
  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Constructor for the FilesController class
   *
   * @constructor
   * @param {ExtensionConfig} config - The configuration object
   * @public
   * @memberof FilesController
   */
  constructor(readonly config: ExtensionConfig) {}

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  // Public methods
  /**
   * The getFiles method.
   *
   * @function getFiles
   * @public
   * @async
   * @memberof FilesController
   * @example
   * controller.getFiles();
   *
   * @returns {Promise<NodeModel[] | void>} - The list of files
   */
  async getFiles(): Promise<NodeModel[] | void> {
    // Get the files in the folder
    let folders: string[] = [];
    let files: Uri[] = [];

    if (!workspace.workspaceFolders) return;

    folders = workspace.workspaceFolders.map((folder) => folder.uri.fsPath);

    const { include, exclude } = this.config;

    const includedFilePatterns = `**/*.{${include.join(',')}}`;
    const excludedFilePatterns = Array.isArray(exclude) ? exclude : [exclude];

    for (const folder of folders) {
      const result = await this.findFiles(
        folder,
        [includedFilePatterns],
        excludedFilePatterns,
      );

      files.push(...result);
    }

    if (files.length !== 0) {
      const nodes: NodeModel[] = [];

      files.sort((a, b) => a.path.localeCompare(b.path));

      for (const file of files) {
        const document = await workspace.openTextDocument(file);

        const path = workspace.asRelativePath(document.fileName);
        let filename = path.split('/').pop();

        if (filename && this.config.showPath) {
          const folder = path.split('/').slice(0, -1).join('/');

          filename += folder ? ` (${folder})` : ' (root)';
        }

        nodes.push(
          new NodeModel(
            filename ?? 'Untitled',
            new ThemeIcon('file'),
            {
              command: `${EXTENSION_ID}.json.showPreview`,
              title: 'Open Preview',
              arguments: [document.uri],
            },
            document.uri,
            'file',
          ),
        );
      }

      return nodes;
    }

    return;
  }

  /**
   * The openFile method.
   *
   * @function openFile
   * @param {NodeModel} node - The node model
   * @public
   * @memberof FilesController
   * @example
   * controller.openFile('file:///path/to/file');
   *
   * @returns {Promise<void>} - The promise
   */
  openFile(node: NodeModel) {
    if (node.resourceUri) {
      workspace.openTextDocument(node.resourceUri).then((filename) => {
        window.showTextDocument(filename);
      });
    }
  }

  /**
   * The convertToJson method.
   *
   * @function convertToJson
   * @param {NodeModel} node - The node model
   * @public
   * @memberof FilesController
   * @example
   * controller.convertToJson('file:///path/to/file');
   *
   * @returns {void} - The promise
   */
  convertToJson(node: NodeModel) {
    if (node.resourceUri) {
      workspace.openTextDocument(node.resourceUri).then(async (document) => {
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

        // Check if the content is null
        if (jsonContent === null) {
          return;
        }

        // Open the JSON document
        const jsonDocument = await workspace.openTextDocument({
          language: 'json',
          content: JSON.stringify(jsonContent, null, 2),
        });

        // Show the JSON document
        window.showTextDocument(jsonDocument);
      });
    }
  }

  /**
   * The convertPartialToJson method.
   *
   * @function convertPartialToJson
   * @public
   * @memberof FilesController
   * @example
   * controller.convertPartialToJson();
   *
   * @returns {void} - The promise
   */
  async convertPartialToJson() {
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
      fileType = 'jsonc';

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

    // Open the JSON document
    const jsonDocument = await workspace.openTextDocument({
      language: 'json',
      content: JSON.stringify(jsonContent, null, 2),
    });

    // Show the JSON document
    window.showTextDocument(jsonDocument);
  }

  /**
   * The copyContent method.
   *
   * @function copyContent
   * @param {NodeModel} node - The node model
   * @public
   * @memberof FilesController
   * @example
   * controller.copyContent('file:///path/to/file');
   *
   * @returns {void} - The promise
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
   * The copyContentAsJson method.
   *
   * @function copyContentAsJson
   * @param {NodeModel} node - The node model
   * @public
   * @memberof FilesController
   * @example
   * controller.copyContentAsJson('file:///path/to/file');
   *
   * @returns {void} - The promise
   */
  copyContentAsJson(node: NodeModel) {
    if (node.resourceUri) {
      workspace.openTextDocument(node.resourceUri).then(async (document) => {
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
   * The copyContentPartialAsJson method.
   *
   * @function copyContentPartialAsJson
   * @public
   * @memberof FilesController
   * @example
   * controller.copyContentPartialAsJson();
   *
   * @returns {void} - The promise
   */
  copyContentPartialAsJson() {
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

    // Copy the JSON content to the clipboard
    env.clipboard.writeText(JSON.stringify(jsonContent, null, 2));

    // Show the message
    const message = l10n.t('Content copied as JSON to clipboard');
    window.showInformationMessage(message);
  }

  /**
   * The getFileProperties method.
   *
   * @function getFileProperties
   * @param {NodeModel} node - The node model
   * @public
   * @memberof FilesController
   * @example
   * controller.getFileProperties('file:///path/to/file');
   *
   * @returns {void} - The promise
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

  // Private methods
  /**
   * The getFilePropertiesPartial method.
   *
   * @function getFilePropertiesPartial
   * @public
   * @memberof FilesController
   * @example
   * controller.getFilePropertiesPartial();
   *
   * @returns {void} - The promise
   */
  private async findFiles(
    baseDir: string, // Base directory to start searching from
    include: string[], // Include pattern(s) as a single string or an array
    exclude: string[],
    allowRecursion: boolean = true, // Exclude pattern(s) as a single string or an array
  ): Promise<Uri[]> {
    const includePatterns = Array.isArray(include) ? include : [include];
    const excludePatterns = Array.isArray(exclude) ? exclude : [exclude];

    const result: Uri[] = [];
    const stack: string[] = [baseDir]; // Stack for directories to explore

    while (stack.length > 0) {
      const currentDir = stack.pop(); // Get the next directory from the stack

      if (currentDir) {
        const entries = readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(currentDir, entry.name);

          if (entry.isDirectory() && allowRecursion) {
            // Push the directory onto the stack to explore it later
            stack.push(fullPath);
          } else if (entry.isFile()) {
            // Check if the file matches include and exclude patterns
            const isIncluded = includePatterns.some((pattern) =>
              minimatch(fullPath, pattern),
            );
            const isExcluded = excludePatterns.some((pattern) =>
              minimatch(fullPath, pattern),
            );

            if (isIncluded && !isExcluded) {
              result.push(Uri.file(fullPath));
            }
          }
        }
      }
    }

    return result;
  }
}
