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
 * Recursively generates a TreeMap from a JSON value.
 *
 * All nodes now include a structural `type` field:
 * - "object"
 * - "array"
 * - "string"
 * - "number"
 * - "boolean"
 * - "null"
 *
 * The type is defined at the TreeNode root level to ensure
 * structural metadata is always available to higher layers
 * (projection, search, filtering).
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

  /**
   * Determines the structural JSON type of a value.
   */
  const determineType = (value: JsonValue): string => {
    if (value === null) {
      return 'null';
    }

    if (Array.isArray(value)) {
      return 'array';
    }

    return typeof value;
  };
  if (Array.isArray(json)) {
    const nodeType = 'array';

    tree[parentId] = {
      id: parentId,
      name: isGraphRoot
        ? GRAPH_ROOT_LABEL
        : (lastSegment(parentId) ?? parentId),
      type: nodeType,
      children: [],
      data: { type: nodeType, line: lineNumber },
    };

    let currentLine = lineNumber + 1;

    for (const [index, value] of json.entries()) {
      const valueType = determineType(value);
      const valueId = buildPointer(pointerParent, String(index));

      if (valueType === 'object' || valueType === 'array') {
        tree = {
          ...tree,
          ...generateTree(value, valueId, currentLine),
        };
        tree[parentId].children?.push(valueId);
        currentLine +=
          typeof value === 'object' && value !== null
            ? Object.keys(value).length + 2
            : 1;
      } else {
        tree[valueId] = {
          id: valueId,
          name: `${index}: ${String(value)}`,
          type: valueType,
          data: { type: valueType, line: currentLine },
        };
        tree[parentId].children?.push(valueId);
        currentLine++;
      }
    }
  } else if (typeof json === 'object' && json !== null) {
    const nodeType = 'object';

    tree[parentId] = {
      id: parentId,
      name: isGraphRoot
        ? GRAPH_ROOT_LABEL
        : (lastSegment(parentId) ?? parentId),
      type: nodeType,
      children: [],
      data: { type: nodeType, line: lineNumber },
    };

    let currentLine = lineNumber + 1;
    const entries = Object.entries(json);

    for (const [key, value] of entries) {
      const valueType = determineType(value);
      const keyId = buildPointer(pointerParent, key);

      if (valueType === 'object' || valueType === 'array') {
        tree[keyId] = {
          id: keyId,
          name: key,
          type: valueType,
          children: [],
          data: { type: valueType, line: currentLine },
        };

        tree[parentId].children?.push(keyId);

        tree = {
          ...tree,
          ...generateTree(value, keyId, currentLine + 1),
        };

        currentLine +=
          typeof value === 'object' && value !== null
            ? Object.keys(value).length + 2
            : 1;
      } else {
        tree[keyId] = {
          id: keyId,
          name: `${key}: ${String(value)}`,
          type: valueType,
          data: { type: valueType, line: currentLine },
        };

        tree[parentId].children?.push(keyId);
        currentLine++;
      }
    }
  } else {
    const nodeType = determineType(json);

    tree[parentId] = {
      id: parentId,
      name: String(json),
      type: nodeType,
      data: { type: nodeType, line: lineNumber },
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
