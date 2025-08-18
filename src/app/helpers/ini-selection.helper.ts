import type { SelectionMapper, TextRange } from '../interfaces';

// Section headers like: [section]
const INI_SECTION_RE = /^\s*\[.*\]\s*$/;
// Key lines like: key = value (not starting with comment markers)
const INI_KEY_RE = /^\s*[^#;\s].*?=/;

/**
 * Selection mapper for INI/properties files with optional [sections].
 *
 * Produces node ids as:
 * - `root-<line>` when no section context is applicable
 * - `root-<sectionIndex>-<keyIndex>` when inside a section
 *
 * Notes:
 * - Sections are detected by lines like `[section]`.
 * - Keys are detected by lines that look like `key = value` and are not comments.
 */
export const iniSelectionMapper: SelectionMapper = {
  nodeIdFromOffset(text: string, offset: number): string | undefined {
    const lines = text.split(/\r?\n/);
    const newlineLen = text.includes('\r\n') ? 2 : text.includes('\n') ? 1 : 0;

    let base = 0;
    let sectionIndex = -1;
    let lineIndex = 0;
    for (; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const len = line.length + (lineIndex < lines.length - 1 ? newlineLen : 0);
      if (offset <= base + len) {
        break;
      }
      base += len;
    }

    // Count sections up to the current line to determine sectionIndex
    for (let i = 0; i <= lineIndex; i++) {
      if (INI_SECTION_RE.test(lines[i])) {
        sectionIndex++;
      }
    }
    if (sectionIndex < 0) {
      return ['root', lineIndex].join('-');
    }

    let keyIdx = 0;
    // Count keys within the current section up to the current line
    for (let i = 0, curSec = -1; i <= lineIndex; i++) {
      const line = lines[i];
      if (INI_SECTION_RE.test(line)) {
        curSec++;
        keyIdx = 0;
      } else if (INI_KEY_RE.test(line) && curSec === sectionIndex) {
        if (i === lineIndex) {
          break;
        }
        keyIdx++;
      }
    }

    return ['root', sectionIndex, keyIdx].join('-');
  },
  rangeFromNodeId(text: string, nodeId: string): TextRange | undefined {
    const lines = text.split(/\r?\n/);
    const newlineLen = text.includes('\r\n') ? 2 : text.includes('\n') ? 1 : 0;

    const parts = nodeId.split('-');
    if (!parts.length || parts[0] !== 'root') {
      return undefined;
    }

    const a = Number.parseInt(parts[1] ?? '-1', 10);
    const b = Number.parseInt(parts[2] ?? '-1', 10);
    let startLine = 0;

    if (a < 0) {
      startLine = Number.isFinite(b) && b >= 0 ? b : 0;
    } else {
      let curSec = -1;
      let keyIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (INI_SECTION_RE.test(line)) {
          curSec++;
          keyIdx = -1;
        } else if (INI_KEY_RE.test(line) && curSec === a) {
          keyIdx++;
          if (keyIdx === b) {
            startLine = i;
            break;
          }
        }
      }
    }

    if (startLine < 0 || startLine >= lines.length) {
      return undefined;
    }

    let base = 0;
    for (let i = 0; i < startLine; i++) {
      base += lines[i].length + newlineLen;
    }

    return { start: base, end: base + lines[startLine].length };
  },
};
