/**
 * Parses YAML content using the yaml library.
 * Throws a formatted error if parsing fails.
 *
 * @param content The YAML string to parse.
 * @returns The parsed object.
 * @throws Error if parsing fails.
 *
 * @example
 * const obj = parseYaml('foo: bar\nbaz: 123');
 * // { foo: 'bar', baz: 123 }
 */
import * as yaml from 'yaml';
import { throwError } from './error-handler.helper';

export function parseYaml(content: string): object {
  try {
    return yaml.parse(content);
  } catch (error: unknown) {
    throwError('Failed to parse YAML', error);
  }
}
