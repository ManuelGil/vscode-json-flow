import { XMLParser } from 'fast-xml-parser';
import { throwError } from './error-handler.helper';

export function parseXml(content: string): object {
  try {
    const parser = new XMLParser();
    return parser.parse(content);
  } catch (error: unknown) {
    throwError('Failed to parse XML', error);
  }
}
