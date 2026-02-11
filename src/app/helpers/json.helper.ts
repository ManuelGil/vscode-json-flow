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
 * Returns an object representation or null if parsing fails.
 *
 * @param content The string content to parse.
 * @param type The type of file format to parse as.
 * @returns The parsed object or null if parsing fails.
 *
 * @remarks
 * Delegates parsing to modular helpers. Centralizes error handling for consistency.
 *
 * @example
 * const obj = parseJsonContent('{ "foo": 1 }', 'json');
 * if (obj) { console.log(obj.foo); }
 */
export const parseJsonContent = (
  content: string,
  type: FileType,
): object | null => {
  try {
    // Delegates parsing based on file type to modular helpers.
    switch (type) {
      case 'json':
      case 'jsonc':
      case 'json5':
        return parseJson(content);
      case 'dockercompose':
      case 'yaml':
      case 'yml':
        return parseYaml(content);
      case 'toml':
        return parseToml(content);
      case 'ini':
      case 'properties':
        return parseIni(content);
      case 'env':
        return parseEnv(content);
      case 'xml':
        return parseXml(content);
      case 'hcl':
        return parseHcl(content);
      case 'csv':
        return parseCsv(content);
      case 'tsv':
        return parseTsv(content);
      default: {
        // Show a localized error for unsupported file types
        const message = l10n.t('Invalid file type');
        window.showErrorMessage(message);
        return null;
      }
    }
  } catch (error: unknown) {
    const message = l10n.t(
      'Error parsing {0}: {1}',
      type.toUpperCase(),
      error instanceof Error ? error.message : String(error),
    );

    window.showErrorMessage(message);
    return null;
  }
};
