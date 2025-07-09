/**
 * Parses INI or properties content using the ini library.
 * Throws a formatted error if parsing fails.
 *
 * @param content The INI string to parse.
 * @returns The parsed object.
 * @throws Error if parsing fails.
 *
 * @example
 * const obj = parseIni('foo=bar\nbaz=qux');
 * // { foo: 'bar', baz: 'qux' }
 */
import * as ini from 'ini';
import { throwError } from './error-handler.helper';

export function parseIni(content: string): object {
  try {
    return ini.parse(content);
  } catch (err) {
    throwError('Failed to parse INI/Properties', err);
  }
}
