import { env, ThemeIcon, window, workspace } from 'vscode';

import { EXTENSION_ID, ExtensionConfig } from '../configs';
import { directoryMap, getRelativePath, parseJSONContent } from '../helpers';
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
   * @param {number} maxResults - The maximum number of results
   * @public
   * @async
   * @memberof FilesController
   * @example
   * controller.getFiles();
   *
   * @returns {Promise<NodeModel[] | void>} - The list of files
   */
  async getFiles(
    maxResults: number = Number.MAX_SAFE_INTEGER,
  ): Promise<NodeModel[] | void> {
    // Get the files in the folder
    const files = await directoryMap('/', {
      extensions: this.config.include,
      ignore: this.config.exclude,
      maxResults,
    });

    if (files.length !== 0) {
      const nodes: NodeModel[] = [];

      files.sort((a, b) => a.path.localeCompare(b.path));

      for (const file of files) {
        const document = await workspace.openTextDocument(file);

        const path = await getRelativePath(document.fileName);
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
        const { languageId } = document;
        const json = parseJSONContent(document.getText(), languageId);

        const jsonDocument = await workspace.openTextDocument({
          language: 'json',
          content: JSON.stringify(json, null, 2),
        });

        window.showTextDocument(jsonDocument);
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
        env.clipboard.writeText(document.getText());
        window.showInformationMessage('Content copied to clipboard');
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
        const { languageId } = document;
        const json = parseJSONContent(document.getText(), languageId);

        env.clipboard.writeText(JSON.stringify(json, null, 2));
        window.showInformationMessage('Content copied as JSON to clipboard');
      });
    }
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
        await window.showInformationMessage(
          `File Name: ${fileName}\nLanguage: ${languageId}\nLines: ${lineCount}\nVersion: ${version}`,
          { modal: true },
        );
      });
    }
  }
}
