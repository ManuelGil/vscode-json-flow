import * as dotenv from 'dotenv';
import { XMLParser } from 'fast-xml-parser';
import hcl from 'hcl-parser';
import * as ini from 'ini';
import json5 from 'json5';
import * as toml from 'toml';
import { l10n, window } from 'vscode';
import * as yaml from 'yaml';

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
 * Supports JSON, JSON5, YAML, TOML, INI, ENV, XML, HCL, CSV, TSV and more.
 * Uses appropriate parsing libraries for each format.
 *
 * @example
 * const obj = parseJSONContent('{ "foo": 1 }', 'json');
 * if (obj) { console.log(obj.foo); }
 */
export const parseJSONContent = (
  content: string,
  type: FileType,
): object | null => {
  try {
    switch (type) {
      case 'json':
      case 'jsonc':
      case 'json5':
        // Use json5 to parse JSON, JSONC, and JSON5 content
        return json5.parse(content);

      case 'dockercompose':
      case 'yaml':
      case 'yml':
        return yaml.parse(content);

      case 'toml':
        return toml.parse(content);

      case 'ini':
      case 'properties':
        return ini.parse(content);

      case 'env':
        return dotenv.parse(content);

      case 'xml': {
        const parser = new XMLParser();
        return parser.parse(content);
      }

      case 'hcl':
        return hcl.parse(content);

      case 'csv': {
        const rows = content.trim().split('\n');
        const headers = rows[0].split(',').map((row) => row.replace('\r', ''));
        return rows.slice(1).map((row) => {
          const values = row.split(',');
          return headers.reduce((acc, header, index) => {
            acc[header] = values[index];
            return acc;
          }, {});
        });
      }

      case 'tsv': {
        const rows = content
          .trim()
          .split('\n')
          .map((row) => row.replace('\r', ''));
        const headers = rows[0].split('\t');
        return rows.slice(1).map((row) => {
          const values = row.split('\t');
          return headers.reduce((acc, header, index) => {
            acc[header] = values[index];
            return acc;
          }, {});
        });
      }

      default: {
        const message = l10n.t('Invalid file type!');
        window.showErrorMessage(message);
        return null;
      }
    }
  } catch (error) {
    const message = l10n.t('Error parsing {0}: {1}', [
      type.toUpperCase(),
      error.message,
    ]);

    window.showErrorMessage(message);
    return null;
  }
};
