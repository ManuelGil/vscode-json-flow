import fg from 'fast-glob';
import { Range, ThemeIcon, Uri, env, l10n, window, workspace } from 'vscode';

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

    if (!workspace.workspaceFolders) {
      const message = l10n.t('Operation cancelled!');
      window.showErrorMessage(message);
      return;
    }

    folders = workspace.workspaceFolders.map((folder) => folder.uri.fsPath);

    const { includedFilePatterns, excludedFilePatterns, includeFilePath } =
      this.config;

    const fileExtensionPattern = `**/*.{${includedFilePatterns.join(',')}}`;
    const fileExclusionPatterns = Array.isArray(excludedFilePatterns)
      ? excludedFilePatterns
      : [excludedFilePatterns];

    for (const folder of folders) {
      const result = await this.findFiles(
        folder,
        [fileExtensionPattern],
        fileExclusionPatterns,
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

        if (filename && includeFilePath) {
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
            document.fileName,
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
   * @param {NodeModel | Uri} node - The node model
   * @public
   * @memberof FilesController
   * @example
   * controller.copyContentAsJson('file:///path/to/file');
   *
   * @returns {void} - The promise
   */
  copyContentAsJson(node: NodeModel) {
    if (node) {
      // Get the resource URI
      const resourceUri = node instanceof NodeModel ? node.resourceUri : node;

      // Check if the resource URI is valid
      if (!resourceUri) {
        const message = l10n.t('Operation cancelled!');
        window.showErrorMessage(message);
        return;
      }

      // Open the text document
      workspace.openTextDocument(resourceUri).then(async (document) => {
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
   * The findFiles method.
   *
   * @function findFiles
   * @param {string} baseDir - The base directory
   * @param {string[]} include - The include pattern
   * @param {string[]} exclude - The exclude pattern
   * @private
   * @async
   * @memberof FilesController
   * @example
   * controller.findFiles('baseDir', ['include'], ['exclude']);
   *
   * @returns {Promise<Uri[]>} - The promise with the files
   */
  private async findFiles(
    baseDir: string,
    include: string[], // Include patterns
    exclude: string[], // Exclude patterns
    allowRecursion: boolean = true, // Toggle recursive search
  ): Promise<Uri[]> {
    // Configure fast-glob options
    const options = {
      cwd: baseDir, // Set base directory for searching
      absolute: true, // Ensure paths are absolute
      onlyFiles: true, // Match only files, not directories
      dot: true, // Include files and directories starting with a dot
      deep: allowRecursion ? undefined : 1, // Toggle recursion
      ignore: exclude, // Exclude patterns
    };

    try {
      // Use fast-glob to find matching files
      const filePaths = await fg(include, options);

      // Convert file paths to VS Code Uri objects
      return filePaths.sort().map((filePath) => Uri.file(filePath));
    } catch (error) {
      const message = l10n.t('Error while finding files: {0}', [error]);
      window.showErrorMessage(message);
      return [];
    }
  }
}
