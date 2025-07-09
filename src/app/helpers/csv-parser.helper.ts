/**
 * Parses CSV content into an array of objects.
 * Throws a formatted error if parsing fails.
 *
 * @param content The CSV string to parse.
 * @returns The parsed array of objects.
 * @throws Error if parsing fails.
 *
 * @example
 * const data = parseCsv('name,age\nAlice,30\nBob,25');
 * // [{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }]
 */
import { throwError } from './error-handler.helper';

export function parseCsv(content: string): object[] {
  try {
    const rows = content.trim().split('\n');
    const headers = rows[0].split(',').map((row) => row.replace('\r', ''));
    return rows.slice(1).map((row) => {
      const values = row.split(',');
      return headers.reduce(
        (acc, header, index) => {
          acc[header] = values[index];
          return acc;
        },
        {} as Record<string, string>,
      );
    });
  } catch (err) {
    throwError('Failed to parse CSV', err);
  }
}
