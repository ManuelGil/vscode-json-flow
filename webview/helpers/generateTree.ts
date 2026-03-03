import { IS_DEV } from '@webview/env';
import type { JsonValue, TreeMap } from '@webview/types';
import {
  GRAPH_ROOT_ID,
  GRAPH_ROOT_LABEL,
} from '../../src/shared/graph-identity';
import {
  buildPointer,
  lastSegment,
  POINTER_ROOT,
} from '../../src/shared/node-pointer';

/**
 * Resolves the canonical JSON type.
 *
 * IMPORTANT:
 * JavaScript `typeof` does not distinguish between:
 * - array  → "object"
 * - null   → "object"
 *
 * SearchService expects semantic JSON types:
 * object | array | string | number | boolean | null
 *
 * Any modification here directly impacts `type:` search tokens.
 */
const resolveJsonType = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
};

/**
 * Recursively generates a TreeMap from a JSON value.
 */
export function generateTree(
  json: JsonValue,
  parentId: string = GRAPH_ROOT_ID,
  lineNumber = 1,
  acc: TreeMap = {},
): TreeMap {
  // DEV-only: fail fast if the sentinel ever gets corrupted to a pointer.
  if (IS_DEV && GRAPH_ROOT_ID.startsWith('/')) {
    throw new Error(
      'GRAPH_ROOT_ID must never start with "/". The graph identity domain and the JSON Pointer domain must remain disjoint.',
    );
  }

  // When the current node is the graph root, child JSON Pointers must be
  // built relative to POINTER_ROOT ("/"), not relative to the sentinel
  // GRAPH_ROOT_ID which is not a valid pointer.
  const pointerParent: string =
    parentId === GRAPH_ROOT_ID ? POINTER_ROOT : parentId;

  const isGraphRoot: boolean = parentId === GRAPH_ROOT_ID;

  if (Array.isArray(json)) {
    acc[parentId] = {
      id: parentId,
      name: isGraphRoot
        ? GRAPH_ROOT_LABEL
        : (lastSegment(parentId) ?? parentId),
      children: [],
      data: { type: resolveJsonType(json), line: lineNumber },
    };

    let currentLine = lineNumber + 1;

    for (const [index, value] of json.entries()) {
      const valueId = buildPointer(pointerParent, String(index));

      if (typeof value === 'object' && value !== null) {
        generateTree(value, valueId, currentLine, acc);
        acc[parentId].children?.push(valueId);
        currentLine += Object.keys(value).length + 2;
      } else {
        // CONTRACT:
        // Leaf node names MUST use ": " separator.
        // searchService.extractKey/extractValue depend on this exact format.
        acc[valueId] = {
          id: valueId,
          name: `${index}: ${String(value)}`,
          data: { type: resolveJsonType(value), line: currentLine },
        };

        acc[parentId].children?.push(valueId);
        currentLine++;
      }
    }
  } else if (typeof json === 'object' && json !== null) {
    acc[parentId] = {
      id: parentId,
      name: isGraphRoot
        ? GRAPH_ROOT_LABEL
        : (lastSegment(parentId) ?? parentId),
      children: [],
      data: { type: resolveJsonType(json), line: lineNumber },
    };

    let currentLine = lineNumber + 1;
    const entries = Object.entries(json);

    for (const [key, value] of entries) {
      const keyId = buildPointer(pointerParent, key);

      if (typeof value === 'object' && value !== null) {
        acc[keyId] = {
          id: keyId,
          name: key,
          children: [],
          data: { type: resolveJsonType(value), line: currentLine },
        };

        acc[parentId].children?.push(keyId);

        generateTree(value, keyId, currentLine + 1, acc);

        currentLine += Object.keys(value).length + 2;
      } else {
        // CONTRACT:
        // Leaf node names MUST use ": " separator.
        // searchService.extractKey/extractValue depend on this exact format.
        acc[keyId] = {
          id: keyId,
          name: `${key}: ${String(value)}`,
          data: { type: resolveJsonType(value), line: currentLine },
        };

        acc[parentId].children?.push(keyId);
        currentLine++;
      }
    }
  } else {
    acc[parentId] = {
      id: parentId,
      name: String(json),
      data: { type: resolveJsonType(json), line: lineNumber },
    };
  }

  return acc;
}

/**
 * Finds the root node ID in a TreeMap by excluding all referenced children, spouses, and siblings.
 *
 * @param treeData - The TreeMap to analyze.
 * @returns The root node ID string.
 *
 * @example
 * const rootId = getRootId(treeData);
 */
export function getRootId(treeData: TreeMap): string {
  const allNodes = new Set(Object.keys(treeData));

  for (const node of Object.values(treeData)) {
    if (node.children) {
      for (const id of node.children) {
        allNodes.delete(id);
      }
    }
    if (node.spouses) {
      for (const id of node.spouses) {
        allNodes.delete(id);
      }
    }
    if (node.siblings) {
      for (const id of node.siblings) {
        allNodes.delete(id);
      }
    }
  }

  if (allNodes.size === 1) {
    return Array.from(allNodes)[0];
  }

  return Object.keys(treeData)[0];
}
