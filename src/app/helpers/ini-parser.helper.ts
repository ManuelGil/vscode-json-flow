import * as ini from 'ini';
import { throwError } from './error-handler.helper';

export function parseIni(content: string): object {
  try {
    return ini.parse(content);
  } catch (error: unknown) {
    throwError('Failed to parse INI/Properties', error);
  }
}
