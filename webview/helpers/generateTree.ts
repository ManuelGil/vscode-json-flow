import { buildPointer, lastSegment, POINTER_ROOT } from '@shared/node-pointer';
import type { JsonValue, TreeMap } from '@webview/types';

/**
 * Recursively generates a tree structure (TreeMap) from a JSON value.
 * Supports objects, arrays, and primitives, assigning unique JSON Pointer
 * IDs and line numbers.
 *
 * @param json - The JSON value to convert into a tree.
 * @param parentId - (Optional) Parent node pointer for recursion. Defaults to '/'.
 * @param lineNumber - (Optional) Starting line number for the root node. Defaults to 1.
 * @returns TreeMap representing the hierarchical structure of the input JSON.
 *
 * @example
 * const tree = generateTree({ foo: [1, 2] });
 */
export function generateTree(
  json: JsonValue,
  parentId: string = POINTER_ROOT,
  lineNumber = 1,
): TreeMap {
  let tree: TreeMap = {};

  if (Array.isArray(json)) {
    tree[parentId] = {
      id: parentId,
      name:
        parentId === POINTER_ROOT
          ? 'Root'
          : (lastSegment(parentId) ?? parentId),
      children: [],
      data: { line: lineNumber },
    };

    let currentLine = lineNumber + 1;
    for (const [index, value] of json.entries()) {
      if (typeof value === 'object' && value !== null) {
        const objectId = buildPointer(parentId, String(index));
        tree = { ...tree, ...generateTree(value, objectId, currentLine) };
        tree[parentId].children?.push(objectId);
        currentLine += Object.keys(value).length + 2; // +2 for brackets
      } else {
        const valueId = buildPointer(parentId, String(index));
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
      name:
        parentId === POINTER_ROOT
          ? 'Root'
          : (lastSegment(parentId) ?? parentId),
      children: [],
      data: { line: lineNumber },
    };

    let currentLine = lineNumber + 1;
    const entries = Object.entries(json);
    for (const [key, value] of entries) {
      if (typeof value === 'object' && value !== null) {
        const keyId = buildPointer(parentId, key);
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
        const keyId = buildPointer(parentId, key);
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
