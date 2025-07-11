/**
 * Parses .env content using the dotenv library.
 * Throws a formatted error if parsing fails.
 *
 * @param content The ENV string to parse.
 * @returns The parsed object.
 * @throws Error if parsing fails.
 *
 * @example
 * const obj = parseEnv('FOO=bar\nBAZ=qux');
 * // { FOO: 'bar', BAZ: 'qux' }
 */
import * as dotenv from 'dotenv';
import { throwError } from './error-handler.helper';

export function parseEnv(content: string): object {
  try {
    return dotenv.parse(content);
  } catch (error) {
    throwError('Failed to parse ENV', error);
  }
}
