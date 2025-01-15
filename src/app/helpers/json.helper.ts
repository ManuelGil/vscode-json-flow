import * as dotenv from 'dotenv';
import { XMLParser } from 'fast-xml-parser';
import hcl from 'hcl-parser';
import * as ini from 'ini';
import json5 from 'json5';
import * as toml from 'toml';
import { l10n, window } from 'vscode';
import * as yaml from 'yaml';

/**
 * The FileType type.
 *
 * @type {FileType}
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
 * Type guard to verify if a value is a valid FileType.
 *
 * @param value - The value to check.
 * @returns {value is FileType} - True if the value is a valid FileType, false otherwise.
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
 * The parseJSONContent function.
 *
 * @function parseJSONContent
 * @param {string} content - The content to parse
 * @param {FileType} type - The type of content
 * @returns {object | null} - The parsed content
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
