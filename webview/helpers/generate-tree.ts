import type { TreeMap } from '@webview/types';

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
interface JsonArray extends Array<JsonValue> {}

function createNodeId(prefix: string, key: string): string {
  return `${prefix}-${key.toLowerCase().replace(/\s+/g, '-')}`;
}

export function generateTree(
  json: JsonValue,
  parentId = 'root',
  lineNumber = 1,
): TreeMap {
  let tree: TreeMap = {};

  if (Array.isArray(json)) {
    tree[parentId] = {
      id: parentId,
      name:
        parentId === 'root' ? 'Root' : parentId.split('-').pop() || parentId,
      children: [],
      data: { line: lineNumber },
    };

    let currentLine = lineNumber + 1;
    for (const [index, value] of json.entries()) {
      if (typeof value === 'object' && value !== null) {
        const objectId = createNodeId(parentId, `${index}`);
        tree = { ...tree, ...generateTree(value, objectId, currentLine) };
        tree[parentId].children?.push(objectId);
        currentLine += Object.keys(value).length + 2; // +2 for brackets
      } else {
        const valueId = createNodeId(parentId, `${index}`);
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
        parentId === 'root' ? 'Root' : parentId.split('-').pop() || parentId,
      children: [],
      data: { line: lineNumber },
    };

    let currentLine = lineNumber + 1;
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === 'object' && value !== null) {
        const keyId = createNodeId(parentId, key);
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
        const keyId = createNodeId(parentId, key);
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
