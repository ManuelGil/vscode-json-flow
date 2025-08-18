import * as dotenv from 'dotenv';
import { throwError } from './error-handler.helper';

export function parseEnv(content: string): object {
  try {
    return dotenv.parse(content);
  } catch (error: unknown) {
    throwError('Failed to parse ENV', error);
  }
}
