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
 * Recursively generates a tree structure (TreeMap) from a JSON value.
 * Supports objects, arrays, and primitives, assigning unique JSON Pointer
 * IDs and line numbers.
 *
 * The graph structural root uses {@link GRAPH_ROOT_ID} (not a JSON Pointer)
 * so that it can never collide with the RFC 6901 pointer "/" which
 * represents an empty-string key.  All data-level nodes use valid JSON
 * Pointer IDs built via {@link buildPointer}.
 *
 * @param json - The JSON value to convert into a tree.
 * @param parentId - (Optional) Parent node ID for recursion. Defaults to GRAPH_ROOT_ID.
 * @param lineNumber - (Optional) Starting line number for the root node. Defaults to 1.
 * @returns TreeMap representing the hierarchical structure of the input JSON.
 *
 * ARCHITECTURAL INVARIANT (frozen):
 * GRAPH_ROOT_ID and POINTER_ROOT belong to separate identity domains.
 * They must never be merged.
 * GRAPH_ROOT_ID must never start with '/'.
 *
 * @example
 * const tree = generateTree({ foo: [1, 2] });
 */
export function generateTree(
  json: JsonValue,
  parentId: string = GRAPH_ROOT_ID,
  lineNumber = 1,
): TreeMap {
  // DEV-only: fail fast if the sentinel ever gets corrupted to a pointer.
  if (IS_DEV && GRAPH_ROOT_ID.startsWith('/')) {
    throw new Error(
      'GRAPH_ROOT_ID must never start with "/". The graph identity domain and the JSON Pointer domain must remain disjoint.',
    );
  }

  let tree: TreeMap = {};

  // When the current node is the graph root, child JSON Pointers must be
  // built relative to POINTER_ROOT ("/"), not relative to the sentinel
  // GRAPH_ROOT_ID which is not a valid pointer.
  const pointerParent: string =
    parentId === GRAPH_ROOT_ID ? POINTER_ROOT : parentId;

  const isGraphRoot: boolean = parentId === GRAPH_ROOT_ID;

  if (Array.isArray(json)) {
    tree[parentId] = {
      id: parentId,
      name: isGraphRoot
        ? GRAPH_ROOT_LABEL
        : (lastSegment(parentId) ?? parentId),
      children: [],
      data: { line: lineNumber },
    };

    let currentLine = lineNumber + 1;
    for (const [index, value] of json.entries()) {
      if (typeof value === 'object' && value !== null) {
        const objectId = buildPointer(pointerParent, String(index));
        tree = { ...tree, ...generateTree(value, objectId, currentLine) };
        tree[parentId].children?.push(objectId);
        currentLine += Object.keys(value).length + 2; // +2 for brackets
      } else {
        const valueId = buildPointer(pointerParent, String(index));
        tree[valueId] = {
          id: valueId,
          name: `${index}: ${String(value)}`,
          data: { type: typeof value, line: currentLine },
        };
        tree[parentId].children?.push(valueId);
        currentLine++;
      }
    }
  } else if (typeof json === 'object' && json !== null) {
    tree[parentId] = {
      id: parentId,
      name: isGraphRoot
        ? GRAPH_ROOT_LABEL
        : (lastSegment(parentId) ?? parentId),
      children: [],
      data: { line: lineNumber },
    };

    let currentLine = lineNumber + 1;
    const entries = Object.entries(json);
    for (const [key, value] of entries) {
      if (typeof value === 'object' && value !== null) {
        const keyId = buildPointer(pointerParent, key);
        tree[keyId] = {
          id: keyId,
          name: key,
          children: [],
          data: { line: currentLine },
        };
        tree[parentId].children?.push(keyId);
        tree = { ...tree, ...generateTree(value, keyId, currentLine + 1) };
        currentLine += Object.keys(value).length + 2; // +2 for brackets
      } else {
        const keyId = buildPointer(pointerParent, key);
        tree[keyId] = {
          id: keyId,
          name: `${key}: ${String(value)}`,
          data: { type: typeof value, line: currentLine },
        };
        tree[parentId].children?.push(keyId);
        currentLine++;
      }
    }
  } else {
    tree[parentId] = {
      id: parentId,
      name: String(json),
      data: { type: typeof json, line: lineNumber },
    };
  }

  return tree;
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
