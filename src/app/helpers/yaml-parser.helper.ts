import * as yaml from 'yaml';
import { throwError } from './error-handler.helper';

export function parseYaml(content: string): object {
  try {
    return yaml.parse(content);
  } catch (error: unknown) {
    throwError('Failed to parse YAML', error);
  }
}
