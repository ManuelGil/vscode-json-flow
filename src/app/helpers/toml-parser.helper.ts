/**
 * Parses TOML content using the toml library.
 * Throws a formatted error if parsing fails.
 *
 * @param content The TOML string to parse.
 * @returns The parsed object.
 * @throws Error if parsing fails.
 *
 * @example
 * const obj = parseToml('foo = "bar"\nbaz = 123');
 * // { foo: 'bar', baz: 123 }
 */
import * as toml from 'toml';
import { throwError } from './error-handler.helper';

export function parseToml(content: string): object {
  try {
    return toml.parse(content);
  } catch (err) {
    throwError('Failed to parse TOML', err);
  }
}
