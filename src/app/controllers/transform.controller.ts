import {
  InputData,
  jsonInputForTargetLanguage,
  LanguageName,
  quicktype,
} from 'quicktype-core';
import { l10n, Range, Uri, window, workspace } from 'vscode';

import { FileType, isFileTypeSupported, parseJSONContent } from '../helpers';
import { normalizeToJsonString } from '../helpers/normalize.helper';
import { NodeModel } from '../models';

/**
 * Handles transformation of files and editor selections to JSON or other types for the VSCode JSON Flow extension.
 */
export class TransformController {
  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  /**
   * Converts the content of a file or node to JSON and opens it in a new document.
   * Validates arguments and ensures supported file types.
   * @param node NodeModel or Uri representing the file.
   */
  async convertToJson(node: NodeModel | Uri): Promise<void> {
    if (!node) {
      const message = l10n.t('Operation cancelled!');
      window.showErrorMessage(message);
      return;
    }

    const resourceUri = node instanceof NodeModel ? node.resourceUri : node;
    await this.convertResourceToJson(resourceUri);
  }

  /**
   * Opens a resource URI, parses its content as JSON, and displays it in a new document.
   * @param resourceUri The URI of the resource to convert.
   */
  private async convertResourceToJson(resourceUri?: Uri): Promise<void> {
    if (!resourceUri) {
      const message = l10n.t('Operation cancelled!');
      window.showErrorMessage(message);
      return;
    }

    const document = await workspace.openTextDocument(resourceUri);
    const { languageId, fileName } = document;
    let fileType = languageId;

    if (!isFileTypeSupported(fileType)) {
      const fileExtension = fileName.split('.').pop();
      fileType = fileExtension;
    }

    const jsonContent = parseJSONContent(
      document.getText(),
      fileType as FileType,
    );
    if (jsonContent === null) {
      return;
    }

    const jsonDocument = await workspace.openTextDocument({
      language: 'json',
      content: JSON.stringify(jsonContent, null, 2),
    });
    window.showTextDocument(jsonDocument);
  }

  /**
   * Converts the selected content in the active editor to JSON and opens it in a new document.
   * Validates selection and file type.
   */
  async convertPartialToJson(): Promise<void> {
    const editor = window.activeTextEditor;

    if (!editor) {
      const message = l10n.t('No active editor!');
      window.showErrorMessage(message);
      return;
    }

    const selection = editor.selection;

    if (selection.isEmpty) {
      const message = l10n.t('No selection!');
      window.showErrorMessage(message);
      return;
    }

    const selectionRange = new Range(
      selection.start.line,
      selection.start.character,
      selection.end.line,
      selection.end.character,
    );

    const { languageId, fileName } = editor.document;
    let fileType = languageId;
    let text = editor.document.getText(selectionRange);

    // Centralized normalization
    const { normalized, detectedType } = normalizeToJsonString(text, fileType);
    fileType = detectedType;
    text = normalized;

    if (!isFileTypeSupported(fileType)) {
      const fileExtension = fileName.split('.').pop();
      fileType = isFileTypeSupported(fileExtension) ? fileExtension : 'jsonc';
    }

    const jsonContent = parseJSONContent(text, fileType as FileType);

    if (jsonContent === null) {
      return;
    }

    const jsonDocument = await workspace.openTextDocument({
      language: 'json',
      content: JSON.stringify(jsonContent, null, 2),
    });

    window.showTextDocument(jsonDocument);
  }

  /**
   * Converts a file to the specified target language type.
   * Validates arguments and ensures supported file types.
   * @param fileUri URI of the file to convert.
   * @param targetLanguage Target language for conversion.
   */
  async convertFileToType(fileUri: Uri, targetLanguage: string): Promise<void> {
    if (!fileUri) {
      const message = l10n.t('Operation cancelled!');
      window.showErrorMessage(message);
      return;
    }

    const document = await workspace.openTextDocument(fileUri);
    const { languageId, fileName } = document;
    let fileType = languageId;

    if (!isFileTypeSupported(fileType)) {
      const fileExtension = fileName.split('.').pop();

      fileType = isFileTypeSupported(fileExtension) ? fileExtension : 'json';
    }

    const jsonContent = parseJSONContent(
      document.getText(),
      fileType as FileType,
    );

    if (jsonContent === null) {
      return;
    }

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

    const jsonInput = jsonInputForTargetLanguage(
      targetLanguage as LanguageName,
    );
    await jsonInput.addSource({
      name: typeName,
      samples: [JSON.stringify(jsonContent)],
    });

    const inputData = new InputData();
    inputData.addInput(jsonInput);

    const { lines } = await quicktype({
      inputData,
      lang: targetLanguage as LanguageName,
    });

    const jsonDocument = await workspace.openTextDocument({
      language: this.mapLanguageId(targetLanguage),
      content: lines.join('\n'),
    });

    window.showTextDocument(jsonDocument);
  }

  /**
   * Converts the selected content in the active editor to a target language type and opens it in a new document.
   * @param targetLanguage Target language for conversion.
   */
  async convertPartialToType(targetLanguage: string): Promise<void> {
    const editor = window.activeTextEditor;

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
    const jsonInput = jsonInputForTargetLanguage(
      targetLanguage as LanguageName,
    );

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
      lang: targetLanguage as LanguageName,
    });

    // Open the JSON document
    const jsonDocument = await workspace.openTextDocument({
      language: this.mapLanguageId(targetLanguage),
      content: lines.join('\n'),
    });

    // Show the JSON document
    window.showTextDocument(jsonDocument);
  }

  /**
   * Maps the target language to the corresponding language ID.
   * @param targetLanguage The target language.
   * @returns The language ID.
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
