import { detectDelimiter } from './detect-delimiter.helper';
import { throwError } from './error-handler.helper';

export function parseTsv(content: string): object[] {
  try {
    const rows = content
      .trim()
      .split('\n')
      .map((row) => row.replace('\r', ''));

    if (rows.length === 0) {
      return [];
    }

    // Prefer tab for TSV, but allow fallback in case of mislabeled files
    const delimiter = detectDelimiter(content, ['\t', '|', ',', ';']);

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
    throwError('Failed to parse TSV', error);
  }
}
