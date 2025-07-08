import {
  InputData,
  jsonInputForTargetLanguage,
  quicktype,
} from 'quicktype-core';
import { Range, Uri, l10n, window, workspace } from 'vscode';
import { FileType, isFileTypeSupported, parseJSONContent } from '../helpers';
import { NodeModel } from '../models';

/**
 * The TransformController class.
 *
 * @class
 * @classdesc The class that represents the example controller.
 * @export
 * @public
 * @example
 * const controller = new TransformController();
 */
export class TransformController {
  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  // Public methods

  /**
   * The convertToJson method.
   *
   * @function convertToJson
   * @param {NodeModel | Uri} node - The node model
   * @public
   * @memberof FilesController
   * @example
   * controller.convertToJson('file:///path/to/file');
   *
   * @returns {void} - The promise
   */
  convertToJson(node: NodeModel | Uri) {
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
   * The convertToType method.
   *
   * @function convertToType
   * @param {NodeModel | Uri} node - The node model
   * @param {string} targetLanguage - The target language
   * @public
   * @memberof FilesController
   * @example
   * controller.convertToType('file:///path/to/file', 'typescript');
   *
   * @returns {void} - The promise
   */
  async convertToType(node: NodeModel | Uri, targetLanguage: string) {
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

        // Get the name of the type or structure generated
        const typeName = await window.showInputBox({
          prompt: l10n.t('Enter the name of the type or structure generated'),
          placeHolder: l10n.t(
            'Enter the name of the type or structure, e.g., User, Post, etc.',
          ),
          value: undefined,
          validateInput: (value) => {
            if (!value) {
              return l10n.t('The name of the type or structure is required!');
            }

            return;
          },
        });

        if (!typeName) {
          const message = l10n.t('Operation cancelled!');
          window.showErrorMessage(message);
          return;
        }

        // Create an instance of JSONInput
        // biome-ignore lint/suspicious/noExplicitAny: this is necessary for the quicktype library
        const jsonInput = jsonInputForTargetLanguage(targetLanguage as any);

        // Add the JSON content to the JSONInput instance
        await jsonInput.addSource({
          name: typeName,
          samples: [JSON.stringify(jsonContent)],
        });

        // Create an instance of InputData
        const inputData = new InputData();
        inputData.addInput(jsonInput);

        // Generate the target language
        const { lines } = await quicktype({
          inputData,
          // biome-ignore lint/suspicious/noExplicitAny: this is necessary for the quicktype library
          lang: targetLanguage as any,
        });

        // Open the JSON document
        const jsonDocument = await workspace.openTextDocument({
          language: this.mapLanguageId(targetLanguage),
          content: lines.join('\n'),
        });

        // Show the JSON document
        window.showTextDocument(jsonDocument);
      });
    }
  }

  /**
   * The convertPartialToType method.
   *
   * @function convertPartialToType
   * @param {string} targetLanguage - The target language
   * @public
   * @memberof FilesController
   * @example
   * controller.convertPartialToType('typescript');
   *
   * @returns {void} - The promise
   */
  async convertPartialToType(targetLanguage: string) {
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

    // Get the name of the type or structure generated
    const typeName = await window.showInputBox({
      prompt: l10n.t('Enter the name of the type or structure generated'),
      placeHolder: l10n.t(
        'Enter the name of the type or structure, e.g., User, Post, etc.',
      ),
      value: undefined,
      validateInput: (value) => {
        if (!value) {
          return l10n.t('The name of the type or structure is required!');
        }

        return;
      },
    });

    if (!typeName) {
      const message = l10n.t('Operation cancelled!');
      window.showErrorMessage(message);
      return;
    }

    // Create an instance of JSONInput
    // biome-ignore lint/suspicious/noExplicitAny: this is necessary for the quicktype library
    const jsonInput = jsonInputForTargetLanguage(targetLanguage as any);

    // Add the JSON content to the JSONInput instance
    await jsonInput.addSource({
      name: typeName,
      samples: [JSON.stringify(jsonContent)],
    });

    // Create an instance of InputData
    const inputData = new InputData();
    inputData.addInput(jsonInput);

    // Generate the target language
    const { lines } = await quicktype({
      inputData,
      // biome-ignore lint/suspicious/noExplicitAny: this is necessary for the quicktype library
      lang: targetLanguage as any,
    });

    // Open the JSON document
    const jsonDocument = await workspace.openTextDocument({
      language: this.mapLanguageId(targetLanguage),
      content: lines.join('\n'),
    });

    // Show the JSON document
    window.showTextDocument(jsonDocument);
  }

  // Private methods
  /**
   * The mapLanguageId method.
   *
   * @function mapLanguageId
   * @param {string} targetLanguage - The target language
   * @private
   * @memberof TransformController
   * @example
   * const languageId = mapLanguageId('typescript');
   *
   * @returns {string} - The language ID
   */
  mapLanguageId(targetLanguage: string): string {
    switch (targetLanguage) {
      case 'ruby':
        return 'ruby';
      case 'javascript':
        return 'javascript';
      case 'flow':
        return 'javascript';
      case 'rust':
        return 'rust';
      case 'kotlin':
        return 'kotlin';
      case 'dart':
        return 'dart';
      case 'python':
        return 'python';
      case 'csharp':
        return 'csharp';
      case 'go':
        return 'go';
      case 'cpp':
        return 'cpp';
      case 'java':
        return 'java';
      case 'scala':
        return 'scala';
      case 'typescript':
        return 'typescript';
      case 'swift':
        return 'swift';
      case 'objective-c':
        return 'objective-c';
      case 'elm':
        return 'elm';
      case 'json-schema':
        return 'json';
      case 'pike':
        return 'pike';
      case 'prop-types':
        return 'javascript';
      case 'haskell':
        return 'haskell';
      case 'php':
        return 'php';
      default:
        return 'plaintext';
    }
  }
}
