import { detectDelimiter } from './detect-delimiter.helper';
import { throwError } from './error-handler.helper';

export function parseCsv(content: string): object[] {
  try {
    const rows = content
      .trim()
      .split('\n')
      .map((r) => r.replace('\r', ''));

    if (rows.length === 0) {
      return [];
    }

    // Prefer common CSV delimiters; include tab/pipe to be robust with mislabeled files
    const delimiter = detectDelimiter(content, [',', ';', '|', '\t']);

    const headers = rows[0].split(delimiter);

    return rows.slice(1).map((row) => {
      const values = row.split(delimiter);
      return headers.reduce(
        (acc, header, index) => {
          acc[header] = values[index];
          return acc;
        },
        {} as Record<string, string>,
      );
    });
  } catch (error: unknown) {
    throwError('Failed to parse CSV', error);
  }
}
