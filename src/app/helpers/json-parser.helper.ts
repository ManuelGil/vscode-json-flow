import json5 from 'json5';
import { throwError } from './error-handler.helper';

export function parseJson(content: string): unknown {
  try {
    return json5.parse(content);
  } catch (error: unknown) {
    throwError('Failed to parse JSON', error);
  }
}
