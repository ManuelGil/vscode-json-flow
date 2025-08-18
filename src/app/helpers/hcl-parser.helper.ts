import hcl from 'hcl-parser';
import { throwError } from './error-handler.helper';

export function parseHcl(content: string): object {
  try {
    return hcl.parse(content);
  } catch (error: unknown) {
    throwError('Failed to parse HCL', error);
  }
}
