import { buildPointer, parsePointer, POINTER_ROOT } from 'shared/node-pointer';
import type { SelectionMapper, TextRange } from '../interfaces';
import { detectDelimiter } from './detect-delimiter.helper';

/**
 * Selection mapper for CSV-like delimited files.
 *
 * Heuristically detects the delimiter, then maps:
 * - editor offsets → node ids as JSON Pointers (`/<row>/<col>`)
 * - node ids → `TextRange` covering the cell content
 */
export const csvSelectionMapper: SelectionMapper = {
  nodeIdFromOffset(text: string, offset: number): string | undefined {
    try {
      const delimiter = detectDelimiter(text, [',', ';', '|', '\t']);
      const lines = text.split(/\r?\n/);
      const newlineLen = text.includes('\r\n')
        ? 2
        : text.includes('\n')
          ? 1
          : 0;

      let running = 0;
      let rowIndex = 0;
      for (; rowIndex < lines.length; rowIndex++) {
        const lineLen =
          lines[rowIndex].length +
          (rowIndex < lines.length - 1 ? newlineLen : 0);
        if (offset <= running + lineLen) {
          break;
        }
        running += lineLen;
      }

      if (rowIndex >= lines.length) {
        return POINTER_ROOT;
      }

      const colIndex = columnIndexAtOffset(
        lines[rowIndex],
        delimiter,
        offset - running,
      );

      const rowPointer = buildPointer(POINTER_ROOT, String(rowIndex));
      return buildPointer(rowPointer, String(colIndex));
    } catch {
      return undefined;
    }
  },
  rangeFromNodeId(text: string, nodeId: string): TextRange | undefined {
    try {
      const delimiter = detectDelimiter(text, [',', ';', '|', '\t']);
      let segments: string[];
      try {
        segments = parsePointer(nodeId);
      } catch {
        return undefined;
      }
      const row = Number.parseInt(segments[0] ?? '0', 10);
      const col = Number.parseInt(segments[1] ?? '0', 10);
      const lines = text.split(/\r?\n/);
      const newlineLen = text.includes('\r\n')
        ? 2
        : text.includes('\n')
          ? 1
          : 0;

      if (row < 0 || row >= lines.length) {
        return undefined;
      }

      const { start, end } = columnRange(lines[row], delimiter, col);

      let base = 0;
      for (let i = 0; i < row; i++) {
        base += lines[i].length + newlineLen;
      }

      return { start: base + start, end: base + end };
    } catch {
      return undefined;
    }
  },
};

/**
 * Returns the zero-based column index at a character offset within a CSV line.
 */
function columnIndexAtOffset(
  line: string,
  delimiter: string,
  offsetInLine: number,
): number {
  let col = 0;

  for (let i = 0; i <= line.length; i++) {
    if (i === line.length || line[i] === delimiter) {
      const nextPos = i + 1;
      if (offsetInLine <= i) {
        return col;
      }
      col++;
      i = nextPos - 1;
    }
  }

  return Math.max(0, col - 1);
}

/**
 * Returns the character range for the specified column index within a CSV line.
 */
function columnRange(
  line: string,
  delimiter: string,
  columnIndex: number,
): TextRange {
  let start = 0;
  let col = 0;

  for (let i = 0; i <= line.length; i++) {
    if (i === line.length || line[i] === delimiter) {
      if (col === columnIndex) {
        return { start, end: i };
      }
      start = i + 1;
      col++;
    }
  }

  return { start: 0, end: line.length };
}
