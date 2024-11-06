import * as dotenv from 'dotenv';
import { XMLParser } from 'fast-xml-parser';
import hcl from 'hcl-parser';
import * as ini from 'ini';
import json5 from 'json5';
import jsonc, { parse, ParseError } from 'jsonc-parser';
import * as toml from 'toml';
import { window } from 'vscode';
import * as yaml from 'yaml';

/**
 * The FileType type.
 *
 * @type {FileType}
 */
export type FileType =
  | 'json'
  | 'jsonc'
  | 'json5'
  | 'dockercompose'
  | 'yaml'
  | 'toml'
  | 'ini'
  | 'properties'
  | 'env'
  | 'xml'
  | 'hcl';

/**
 * Type guard to verify if a value is a valid FileType.
 *
 * @param value - The value to check.
 * @returns {value is FileType} - True if the value is a valid FileType, false otherwise.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isFileTypeSupported = (value: any): value is FileType => {
  const validFileTypes: FileType[] = [
    'json',
    'jsonc',
    'json5',
    'dockercompose',
    'yaml',
    'toml',
    'ini',
    'properties',
    'env',
    'xml',
    'hcl',
  ];

  return validFileTypes.includes(value);
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
        return JSON.parse(content);

      case 'jsonc': {
        const errors: ParseError[] = [];
        const parsed = parse(content, errors);

        if (errors.length > 0) {
          handleJsoncErrors(errors);
        }

        return errors.length === 0 ? parsed : null;
      }

      case 'json5':
        return json5.parse(content);

      case 'dockercompose':
      case 'yaml':
        return yaml.parse(content);

      case 'toml':
        return toml.parse(content);

      case 'ini':
      case 'properties':
        return ini.parse(content);

      case 'env':
        return dotenv.parse(content);

      case 'xml':
        // eslint-disable-next-line no-case-declarations
        const parser = new XMLParser();
        return parser.parse(content);

      case 'hcl':
        return hcl.parse(content);

      default:
        window.showErrorMessage('Invalid file type');
        return null;
    }
  } catch (error) {
    window.showErrorMessage(
      `Error parsing ${type.toUpperCase()}: ${error.message}`,
    );
    return null;
  }
};

/**
 * Handle JSONC parsing errors.
 *
 * @param {ParseError[]} errors - Array of JSONC parse errors
 */
const handleJsoncErrors = (errors: ParseError[]) => {
  const errorMessages = {
    [jsonc.ParseErrorCode.InvalidSymbol]: 'Invalid symbol',
    [jsonc.ParseErrorCode.InvalidNumberFormat]: 'Invalid number format',
    [jsonc.ParseErrorCode.PropertyNameExpected]: 'Property name expected',
    [jsonc.ParseErrorCode.ValueExpected]: 'Value expected',
    [jsonc.ParseErrorCode.ColonExpected]: 'Colon expected',
    [jsonc.ParseErrorCode.CommaExpected]: 'Comma expected',
    [jsonc.ParseErrorCode.CloseBraceExpected]: 'Close brace expected',
    [jsonc.ParseErrorCode.CloseBracketExpected]: 'Close bracket expected',
    [jsonc.ParseErrorCode.EndOfFileExpected]: 'End of file expected',
    [jsonc.ParseErrorCode.InvalidCommentToken]: 'Invalid comment token',
    [jsonc.ParseErrorCode.UnexpectedEndOfComment]: 'Unexpected end of comment',
    [jsonc.ParseErrorCode.UnexpectedEndOfString]: 'Unexpected end of string',
    [jsonc.ParseErrorCode.UnexpectedEndOfNumber]: 'Unexpected end of number',
    [jsonc.ParseErrorCode.InvalidUnicode]: 'Invalid unicode',
    [jsonc.ParseErrorCode.InvalidEscapeCharacter]: 'Invalid escape character',
    [jsonc.ParseErrorCode.InvalidCharacter]: 'Invalid character',
  };

  errors.forEach((error) => {
    const message = errorMessages[error.error] || 'Unknown error';
    window.showErrorMessage(`Error parsing JSONC: ${message}`);
  });
};
