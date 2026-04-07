import { l10n, window } from 'vscode';

import { parseCsv } from './csv-parser.helper';
import { parseEnv } from './env-parser.helper';
import { parseHcl } from './hcl-parser.helper';
import { parseIni } from './ini-parser.helper';
import { parseJson } from './json-parser.helper';
import { parseToml } from './toml-parser.helper';
import { parseTsv } from './tsv-parser.helper';
import { parseXml } from './xml-parser.helper';
import { parseYaml } from './yaml-parser.helper';

/**
 * List of supported file types for parsing structured data.
 *
 * @example
 * let type: FileType = 'json';
 */
export type FileType =
  | 'csv'
  | 'dockercompose'
  | 'env'
  | 'hcl'
  | 'ini'
  | 'json'
  | 'json5'
  | 'jsonc'
  | 'properties'
  | 'toml'
  | 'tsv'
  | 'xml'
  | 'yaml'
  | 'yml';

export type JsonValue = object | string | number | boolean | null;

/**
 * Checks if a value is a supported FileType.
 *
 * @param value The value to check.
 * @returns True if the value is a supported FileType, false otherwise.
 *
 * @example
 * isFileTypeSupported('json'); // true
 * isFileTypeSupported('unsupported'); // false
 */
export const isFileTypeSupported = (value: unknown): value is FileType => {
  const validFileTypes: FileType[] = [
    'csv',
    'dockercompose',
    'env',
    'hcl',
    'ini',
    'json',
    'json5',
    'jsonc',
    'properties',
    'toml',
    'tsv',
    'xml',
    'yaml',
    'yml',
  ];

  return validFileTypes.includes(value as FileType);
};

/**
 * Parses the given string content using the specified file type parser.
 * Returns a JSON-compatible value or undefined if parsing fails.
 *
 * @param content The string content to parse.
 * @param type The type of file format to parse as.
 * @returns The parsed value or undefined if parsing fails.
 *
 * @remarks
 * Delegates parsing to modular helpers. Centralizes error handling for consistency.
 *
 * @example
 * const obj = parseJsonContent('{ "foo": 1 }', 'json');
 * if (obj) { window.showInformationMessage(`Value: ${obj.foo}`); }
 */
export const parseJsonContent = (
  content: string,
  type: FileType,
): JsonValue | undefined => {
  try {
    // Delegates parsing based on file type to modular helpers.
    switch (type) {
      case 'json':
      case 'jsonc':
      case 'json5':
        return parseJson(content) as JsonValue;
      case 'dockercompose':
      case 'yaml':
      case 'yml':
        return parseYaml(content) as JsonValue;
      case 'toml':
        return parseToml(content) as JsonValue;
      case 'ini':
      case 'properties':
        return parseIni(content) as JsonValue;
      case 'env':
        return parseEnv(content) as JsonValue;
      case 'xml':
        return parseXml(content) as JsonValue;
      case 'hcl':
        return parseHcl(content) as JsonValue;
      case 'csv':
        return parseCsv(content) as JsonValue;
      case 'tsv':
        return parseTsv(content) as JsonValue;
      default: {
        // Show a localized error for unsupported file types
        const message = l10n.t('Invalid file type');
        window.showErrorMessage(message);
        return undefined;
      }
    }
  } catch (error: unknown) {
    const message = l10n.t(
      'Error parsing {0}: {1}',
      type.toUpperCase(),
      error instanceof Error ? error.message : String(error),
    );

    window.showErrorMessage(message);
    return undefined;
  }
};
