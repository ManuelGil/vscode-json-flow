/**
 * Parses XML content using the fast-xml-parser library.
 * Throws a formatted error if parsing fails.
 *
 * @param content The XML string to parse.
 * @returns The parsed object.
 * @throws Error if parsing fails.
 *
 * @example
 * const obj = parseXml('<foo><bar>baz</bar></foo>');
 * // { foo: { bar: 'baz' } }
 */
import { XMLParser } from 'fast-xml-parser';
import { throwError } from './error-handler.helper';

export function parseXml(content: string): object {
  try {
    const parser = new XMLParser();
    return parser.parse(content);
  } catch (err) {
    throwError('Failed to parse XML', err);
  }
}
