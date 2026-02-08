import * as yaml from 'yaml';
import { buildPointer, parsePointer, POINTER_ROOT } from 'shared/node-pointer';
import type { SelectionMapper, TextRange } from '../interfaces';

type YamlRange = [number, number, number];
type YamlWithRange = { range?: YamlRange };
type YamlWithItems = { items?: unknown[] };
type YamlWithPairs = { pairs?: unknown[] };
type YamlWithType = { type?: unknown };
type YamlWithValue = { value?: unknown };
type YamlWithKey = { key?: { value?: unknown } };

// Type predicates and safe accessors for YAML CST/AST nodes
function isMap(node: unknown): node is YamlWithType & YamlWithItems {
  return Boolean(node) && (node as YamlWithType).type === 'MAP';
}
function isSeq(node: unknown): node is YamlWithType & YamlWithItems {
  return Boolean(node) && (node as YamlWithType).type === 'SEQ';
}
function getItems(node: unknown): unknown[] | undefined {
  const items = (node as YamlWithItems | undefined)?.items;
  return Array.isArray(items) ? items : undefined;
}
function getPairs(node: unknown): unknown[] | undefined {
  const pairs = (node as YamlWithPairs | undefined)?.pairs;
  return Array.isArray(pairs) ? pairs : undefined;
}
function getValue(node: unknown): unknown | undefined {
  return (node as YamlWithValue | undefined)?.value;
}
function getKeyValue(node: unknown): unknown | undefined {
  return (node as YamlWithKey | undefined)?.key?.value;
}
function getRange(node: unknown): YamlRange | undefined {
  const r = (node as YamlWithRange | undefined)?.range;
  return Array.isArray(r) ? (r as YamlRange) : undefined;
}

/**
 * Selection mapper for YAML/Docker Compose files.
 *
 * Strategy:
 * - Parse YAML, walk the document to find the JSON-style path at a given offset.
 * - Build a JSON Pointer from the path segments.
 * - Resolve a JSON Pointer nodeId back to the YAML node and its `range`.
 */
export const yamlSelectionMapper: SelectionMapper = {
  nodeIdFromOffset(text: string, offset: number): string | undefined {
    try {
      const doc = yaml.parseDocument(text);
      const root = doc.contents as unknown;
      if (!root) {
        return POINTER_ROOT;
      }

      const path = findYamlJsonPathAtOffset(root, offset) ?? [];

      // Build the JSON Pointer by appending each path segment
      let pointer: string = POINTER_ROOT;
      for (const segment of path) {
        pointer = buildPointer(pointer, String(segment));
      }
      return pointer;
    } catch {
      return undefined;
    }
  },
  rangeFromNodeId(text: string, nodeId: string): TextRange | undefined {
    try {
      const doc = yaml.parseDocument(text);
      const root = doc.contents as unknown;
      if (!root) {
        return undefined;
      }

      let segments: string[];
      try {
        segments = parsePointer(nodeId);
      } catch {
        return undefined;
      }
      const node = yamlNodeFromSegments(root, segments);
      const r = getRange(node);
      if (!node || !r) {
        return undefined;
      }
      const start = r[0] ?? 0;
      const end = r[1] ?? start;
      return { start, end };
    } catch {
      return undefined;
    }
  },
};

/**
 * Returns a JSON-style path (keys and indexes) for the deepest YAML node covering the offset.
 */
function findYamlJsonPathAtOffset(
  node: unknown,
  offset: number,
): (string | number)[] | undefined {
  if (!node) {
    return undefined;
  }
  const items = getItems(node);
  if (Array.isArray(items)) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const child = getValue(it) ?? it;
      const range = getRange(child);
      if (range && offset >= range[0] && offset <= range[1]) {
        const sub = findYamlJsonPathAtOffset(child, offset) ?? [];
        return [i, ...sub];
      }
    }
  }
  if (!Array.isArray(items)) {
    const pairs = getPairs(node) ?? getItems(node);
    if (Array.isArray(pairs)) {
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const keyVal = getKeyValue(pair);
        const value = getValue(pair) ?? pair;
        const valueRange = getRange(value);
        if (valueRange && offset >= valueRange[0] && offset <= valueRange[1]) {
          const sub = findYamlJsonPathAtOffset(value, offset) ?? [];
          return [typeof keyVal === 'string' ? keyVal : i, ...sub];
        }
      }
    }
  }
  const r = getRange(node);
  if (r && offset >= r[0] && offset <= r[1]) {
    return [];
  }
  return undefined;
}

/**
 * Returns the YAML node located by decoded pointer segments.
 * For maps: matches by key name. For sequences: indexes by numeric position.
 */
function yamlNodeFromSegments(
  root: unknown,
  segments: string[],
): unknown | undefined {
  let cur: unknown = root;
  for (const segment of segments) {
    if (!cur) {
      return undefined;
    }
    if (isMap(cur)) {
      // Find the pair whose key matches the segment
      const pairs = getItems(cur) ?? [];
      let matched: unknown | undefined;
      for (const pair of pairs) {
        const key = getKeyValue(pair);
        if (String(key ?? '') === segment) {
          matched = getValue(pair) ?? pair;
          break;
        }
      }
      if (matched === undefined) {
        return undefined;
      }
      cur = matched;
    } else if (isSeq(cur)) {
      const idx = Number.parseInt(segment, 10);
      if (!Number.isInteger(idx) || idx < 0) {
        return undefined;
      }
      const item = getItems(cur)?.[idx];
      cur = (item && (getValue(item) ?? item)) as unknown;
    } else {
      return undefined;
    }
  }
  return cur;
}
