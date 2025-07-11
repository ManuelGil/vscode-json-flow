/**
 * Parses JSON, JSONC, or JSON5 content using the json5 library.
 * Throws a formatted error if parsing fails.
 *
 * @param content The JSON string to parse.
 * @returns The parsed object.
 * @throws Error if parsing fails.
 *
 * @example
 * const obj = parseJson('{ "foo": 123 }');
 * // { foo: 123 }
 */
import json5 from 'json5';
import { throwError } from './error-handler.helper';

export function parseJson(content: string): object {
  try {
    return json5.parse(content);
  } catch (error) {
    throwError('Failed to parse JSON', error);
  }
}
