import * as yaml from 'yaml';
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
 * - Convert that path into a route-by-indices array for a stable `nodeId`.
 * - Resolve a `nodeId` back to the YAML node and its `range`.
 */
export const yamlSelectionMapper: SelectionMapper = {
  nodeIdFromOffset(text: string, offset: number): string | undefined {
    try {
      const doc = yaml.parseDocument(text);
      const root = doc.contents as unknown;
      if (!root) {
        return 'root';
      }

      const path = findYamlJsonPathAtOffset(root, offset) ?? [];
      const indices = indicesPathFromYamlPath(root, path);
      if (!indices) {
        return undefined;
      }
      return ['root', ...indices].join('-');
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

      const parts = nodeId.split('-');
      if (!parts.length || parts[0] !== 'root') {
        return undefined;
      }
      const indices = parts
        .slice(1)
        .filter((p) => p.length > 0)
        .map((p) => Number.parseInt(p, 10));
      const node = yamlNodeFromIndices(root, indices);
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
 * Converts a JSON-style path (keys/indexes) to a stable indices path by walking the YAML tree.
 */
function indicesPathFromYamlPath(
  root: unknown,
  path: (string | number)[],
): number[] | undefined {
  const indices: number[] = [];
  let current: unknown = root;
  for (const seg of path) {
    if (!current) {
      return undefined;
    }
    if (isMap(current)) {
      let foundIndex = -1;
      const pairs = getItems(current) ?? [];
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const key = getKeyValue(pair);
        if (key === seg) {
          foundIndex = i;
          current = getValue(pair) ?? pair;
          break;
        }
      }
      if (foundIndex < 0) {
        return undefined;
      }
      indices.push(foundIndex);
    } else if (isSeq(current)) {
      const idx =
        typeof seg === 'number' ? seg : Number.parseInt(String(seg), 10);
      if (!Number.isInteger(idx)) {
        return undefined;
      }
      indices.push(idx);
      const child = getItems(current)?.[idx];
      current = (child && (getValue(child) ?? child)) || child;
    } else {
      return undefined;
    }
  }
  return indices;
}

/**
 * Returns the YAML node located by a path of indices.
 */
function yamlNodeFromIndices(
  root: unknown,
  indices: number[],
): unknown | undefined {
  let cur: unknown = root;
  for (const i of indices) {
    if (!cur) {
      return undefined;
    }
    if (isMap(cur)) {
      const pair = getItems(cur)?.[i];
      cur = (getValue(pair) ?? pair) as unknown;
    } else if (isSeq(cur)) {
      const item = getItems(cur)?.[i];
      cur = (item && (getValue(item) ?? item)) as unknown;
    } else {
      return undefined;
    }
  }
  return cur;
}
