import { buildPointer, parsePointer, POINTER_ROOT } from 'shared/node-pointer';
import type { SelectionMapper, TextRange } from '../interfaces';

// Pattern for an identifier at the start of a line (after optional whitespace)
const HCL_IDENTIFIER_AT_LINE_START = '^[\\s\\t]*[A-Za-z_][\\w\\-]*';

/**
 * Selection mapper for HCL files.
 *
 * Uses a simple heuristic: counts identifier-like tokens at the beginning of lines
 * up to the current position. Produces node ids as JSON Pointers (`/<index>`) and
 * resolves them back to the line range where the N-th identifier appears.
 */
export const hclSelectionMapper: SelectionMapper = {
  nodeIdFromOffset(text: string, offset: number): string | undefined {
    const start = Math.max(0, text.lastIndexOf('\n', offset - 1) + 1);
    const before = text.slice(0, start);
    const regex = new RegExp(HCL_IDENTIFIER_AT_LINE_START, 'gm');
    let idx = 0;

    while (true) {
      const match = regex.exec(before);
      if (!match) {
        break;
      }
      idx++;
    }

    return buildPointer(POINTER_ROOT, String(idx));
  },
  rangeFromNodeId(text: string, nodeId: string): TextRange | undefined {
    let segments: string[];
    try {
      segments = parsePointer(nodeId);
    } catch {
      return undefined;
    }
    const index = Number.parseInt(segments[0] ?? '0', 10);
    // Find the N-th identifier at the start of a line
    const regex = new RegExp(HCL_IDENTIFIER_AT_LINE_START, 'gm');
    let count = -1;

    while (true) {
      const match = regex.exec(text);
      if (!match) {
        break;
      }
      count++;
      if (count === index) {
        const lineStart = match.index;
        const lineEnd = text.indexOf('\n', lineStart);
        return { start: lineStart, end: lineEnd > 0 ? lineEnd : text.length };
      }
    }

    return undefined;
  },
};
