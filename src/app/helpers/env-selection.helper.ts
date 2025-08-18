import type { SelectionMapper, TextRange } from '../interfaces';

/**
 * Selection mapper for .env-like files (one key/value per line).
 *
 * Maps:
 * - editor offsets → node ids in the form `root-<row>`
 * - node ids → `TextRange` covering the entire line for that row
 */
export const envSelectionMapper: SelectionMapper = {
  nodeIdFromOffset(text: string, offset: number): string | undefined {
    const lines = text.split(/\r?\n/);
    const newlineLen = text.includes('\r\n') ? 2 : text.includes('\n') ? 1 : 0;

    let base = 0;
    for (let i = 0; i < lines.length; i++) {
      const len = lines[i].length + (i < lines.length - 1 ? newlineLen : 0);
      if (offset <= base + len) {
        return ['root', i].join('-');
      }
      base += len;
    }

    return 'root';
  },
  rangeFromNodeId(text: string, nodeId: string): TextRange | undefined {
    const parts = nodeId.split('-');
    if (!parts.length || parts[0] !== 'root') {
      return undefined;
    }

    const row = Number.parseInt(parts[1] ?? '0', 10);
    const lines = text.split(/\r?\n/);
    const newlineLen = text.includes('\r\n') ? 2 : text.includes('\n') ? 1 : 0;

    if (row < 0 || row >= lines.length) {
      return undefined;
    }

    let base = 0;
    for (let i = 0; i < row; i++) {
      base += lines[i].length + newlineLen;
    }

    const start = base;
    const end = base + lines[row].length;
    return { start, end };
  },
};
