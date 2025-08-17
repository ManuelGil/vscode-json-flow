/**
 * Parses HCL content using the hcl-parser library.
 * Throws a formatted error if parsing fails.
 *
 * @param content The HCL string to parse.
 * @returns The parsed object.
 * @throws Error if parsing fails.
 *
 * @example
 * const obj = parseHcl('variable \"foo\" { default = \"bar\" }');
 * // { variable: { foo: { default: "bar" } } }
 */
import hcl from 'hcl-parser';
import { throwError } from './error-handler.helper';

export function parseHcl(content: string): object {
  try {
    return hcl.parse(content);
  } catch (error: unknown) {
    throwError('Failed to parse HCL', error);
  }
}
