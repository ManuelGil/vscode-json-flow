/**
 * Parses TSV content into an array of objects.
 * Throws a formatted error if parsing fails.
 *
 * @param content The TSV string to parse.
 * @returns The parsed array of objects.
 * @throws Error if parsing fails.
 *
 * @example
 * const data = parseTsv('name\tage\nAlice\t30\nBob\t25');
 * // [{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }]
 */
import { throwError } from './error-handler.helper';

export function parseTsv(content: string): object[] {
  try {
    const rows = content
      .trim()
      .split('\n')
      .map((row) => row.replace('\r', ''));
    const headers = rows[0].split('\t');
    return rows.slice(1).map((row) => {
      const values = row.split('\t');
      return headers.reduce(
        (acc, header, index) => {
          acc[header] = values[index];
          return acc;
        },
        {} as Record<string, string>,
      );
    });
  } catch (error) {
    throwError('Failed to parse TSV', error);
  }
}
