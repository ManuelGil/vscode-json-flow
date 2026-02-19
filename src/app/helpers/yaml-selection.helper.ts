import * as yaml from 'yaml';
import { GRAPH_ROOT_ID } from '../../shared/graph-identity';
import {
  buildPointer,
  POINTER_ROOT,
  parsePointer,
} from '../../shared/node-pointer';
import type { SelectionMapper, TextRange } from '../interfaces';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type PathSegment = string | number;

type LineInfo = {
  start: number;
  end: number;
  indent: number;
  trimmed: string;
  raw: string;
};

type StackEntry = {
  indent: number;
  segment: PathSegment;
};

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildLineInfos(text: string): LineInfo[] {
  const lines = text.split(/\r?\n/);
  const infos: LineInfo[] = [];
  let offset = 0;

  for (const line of lines) {
    const match = line.match(/^[ \t]*/);
    const indent = match ? match[0].length : 0;
    const trimmed = line.trim();
    infos.push({
      start: offset,
      end: offset + line.length,
      indent,
      trimmed,
      raw: line,
    });
    offset += line.length + 1;
  }

  return infos;
}

function getLineIndexForOffset(lines: LineInfo[], offset: number): number {
  for (let index = 0; index < lines.length; index++) {
    if (offset >= lines[index].start && offset <= lines[index].end) {
      return index;
    }
  }
  return lines.length - 1;
}

function parseKeyFromLine(line: string): string | undefined {
  const colonIndex = line.indexOf(':');
  if (colonIndex <= 0) {
    return undefined;
  }
  const key = line.slice(0, colonIndex).trim();
  return key.length > 0 ? key : undefined;
}

function parseInlineKeyFromDash(line: string): string | undefined {
  const withoutDash = line.replace(/^-+\s*/, '');
  return parseKeyFromLine(withoutDash);
}

function updateStackForLine(
  line: LineInfo,
  stack: StackEntry[],
  seqCounters: Map<number, number>,
): void {
  if (!line.trimmed || line.trimmed.startsWith('#')) {
    return;
  }

  while (stack.length > 0 && line.indent <= stack[stack.length - 1].indent) {
    stack.pop();
  }

  if (line.trimmed.startsWith('-')) {
    const currentIndex = (seqCounters.get(line.indent) ?? -1) + 1;
    seqCounters.set(line.indent, currentIndex);
    stack.push({ indent: line.indent, segment: currentIndex });

    const inlineKey = parseInlineKeyFromDash(line.trimmed);
    if (inlineKey) {
      stack.push({ indent: line.indent + 1, segment: inlineKey });
    }
    return;
  }

  const key = parseKeyFromLine(line.trimmed);
  if (key) {
    stack.push({ indent: line.indent, segment: key });
  }
}

function resolvePathAtOffset(
  text: string,
  offset: number,
): PathSegment[] | undefined {
  if (!text) {
    return undefined;
  }
  const lines = buildLineInfos(text);
  if (lines.length === 0) {
    return undefined;
  }
  const targetLineIndex = getLineIndexForOffset(lines, offset);
  const stack: StackEntry[] = [];
  const seqCounters = new Map<number, number>();

  for (let index = 0; index <= targetLineIndex; index++) {
    updateStackForLine(lines[index], stack, seqCounters);
  }

  return stack.map((entry) => entry.segment);
}

function resolvePathAgainstParsed(
  root: JsonValue,
  path: PathSegment[],
): PathSegment[] | undefined {
  let current: JsonValue = root;
  const resolved: PathSegment[] = [];

  for (const segment of path) {
    if (Array.isArray(current) && typeof segment === 'number') {
      if (segment < 0 || segment >= current.length) {
        break;
      }
      current = current[segment] as JsonValue;
      resolved.push(segment);
      continue;
    }

    if (isRecord(current) && typeof segment === 'string') {
      if (!Object.hasOwn(current, segment)) {
        break;
      }
      current = current[segment] as JsonValue;
      resolved.push(segment);
      continue;
    }

    break;
  }

  return resolved.length > 0 ? resolved : undefined;
}

function buildPointerFromPath(path: PathSegment[]): string {
  let pointer: string = POINTER_ROOT;
  for (const segment of path) {
    pointer = buildPointer(pointer, String(segment));
  }
  return pointer;
}

function normalizePointerSegments(segments: string[]): PathSegment[] {
  return segments.map((segment) => {
    const index = Number.parseInt(segment, 10);
    if (Number.isInteger(index) && String(index) === segment) {
      return index;
    }
    return segment;
  });
}

function pathsEqual(left: PathSegment[], right: PathSegment[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function findRangeForPath(
  text: string,
  targetPath: PathSegment[],
): TextRange | undefined {
  if (!text || targetPath.length === 0) {
    return undefined;
  }
  const lines = buildLineInfos(text);
  const stack: StackEntry[] = [];
  const seqCounters = new Map<number, number>();

  for (const line of lines) {
    updateStackForLine(line, stack, seqCounters);
    const currentPath = stack.map((entry) => entry.segment);
    if (pathsEqual(currentPath, targetPath)) {
      return { start: line.start, end: line.end };
    }
  }

  return undefined;
}

/**
 * Returns a JSON-style path (keys and indexes) for the YAML value covering the offset.
 */
function findYamlJsonPathAtOffset(
  text: string,
  root: JsonValue,
  offset: number,
): PathSegment[] | undefined {
  const pathCandidate = resolvePathAtOffset(text, offset) ?? [];
  const resolved = resolvePathAgainstParsed(root, pathCandidate);
  return resolved ?? undefined;
}

/**
 * Selection mapper for YAML/Docker Compose files.
 * Uses yaml.parse() output with line-based traversal to map offsets to JSON Pointer IDs.
 */
export const yamlSelectionMapper: SelectionMapper = {
  nodeIdFromOffset(text: string, offset: number): string | undefined {
    try {
      const clampedOffset = Math.max(0, Math.min(offset, text.length));
      const parsed = yaml.parse(text) as JsonValue;
      if (parsed === undefined) {
        return GRAPH_ROOT_ID;
      }

      const resolvedPath = findYamlJsonPathAtOffset(
        text,
        parsed,
        clampedOffset,
      );
      const pointer = resolvedPath
        ? buildPointerFromPath(resolvedPath)
        : GRAPH_ROOT_ID;

      return pointer;
    } catch {
      return undefined;
    }
  },
  rangeFromNodeId(text: string, nodeId: string): TextRange | undefined {
    try {
      const segments = parsePointer(nodeId);
      const normalizedPath = normalizePointerSegments(segments);
      return findRangeForPath(text, normalizedPath);
    } catch {
      return undefined;
    }
  },
};
