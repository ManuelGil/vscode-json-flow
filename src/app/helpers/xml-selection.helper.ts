import {
  buildPointer,
  POINTER_ROOT,
  parsePointer,
} from '../../shared/node-pointer';
import type { SelectionMapper, TextRange } from '../interfaces';

// Pattern string for an XML start tag name capture
const XML_START_TAG_PATTERN = '<([A-Za-z_][\\w\\-\\.:]*)(\\s|>)';

/**
 * Selection mapper for XML-like documents.
 *
 * Heuristic approach:
 * - Count start tags of the same name before the cursor to build `/<index>`
 * - Resolve `/<index>` to the range of the start tag `<name ...>`
 */
export const xmlSelectionMapper: SelectionMapper = {
  nodeIdFromOffset(text: string, offset: number): string | undefined {
    try {
      // Find the nearest tag start before the offset
      const start = text.lastIndexOf('<', offset);
      if (start < 0) {
        return POINTER_ROOT;
      }
      const end = text.indexOf('>', start + 1);
      if (end < 0) {
        return undefined;
      }

      // Extract tag name
      const tagMatch = text
        .slice(start, end + 1)
        .match(/^<\/?([A-Za-z_][\w\-\.:]*)/);
      const name = tagMatch?.[1] ?? 'node';
      const before = text.slice(0, start);
      const regex = new RegExp(`<${name}(\\s|>)`, 'g');
      let m: RegExpExecArray | null;
      let idx = 0;
      for (m = regex.exec(before); m; m = regex.exec(before)) {
        idx++;
      }
      return buildPointer(POINTER_ROOT, String(idx));
    } catch {
      return undefined;
    }
  },
  rangeFromNodeId(text: string, nodeId: string): TextRange | undefined {
    try {
      let segments: string[];
      try {
        segments = parsePointer(nodeId);
      } catch {
        return undefined;
      }
      const index = Number.parseInt(segments[0] ?? '0', 10);

      // Find the N-th start tag and return its span
      const regex = new RegExp(XML_START_TAG_PATTERN, 'g');
      let m: RegExpExecArray | null;
      let count = -1;
      for (m = regex.exec(text); m; m = regex.exec(text)) {
        count++;
        if (count === index) {
          const start = m.index;
          const end = text.indexOf('>', start) + 1;
          return { start, end: end > start ? end : start + m[0].length };
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  },
};
