import * as toml from 'toml';
import { throwError } from './error-handler.helper';

export function parseToml(content: string): object {
  try {
    return toml.parse(content);
  } catch (error: unknown) {
    throwError('Failed to parse TOML', error);
  }
}
