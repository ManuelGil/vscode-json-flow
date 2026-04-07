import { GRAPH_ROOT_ID, GRAPH_ROOT_LABEL } from '@src/shared/graph-identity';
import {
  buildPointer,
  lastSegment,
  POINTER_ROOT,
} from '@src/shared/node-pointer';
import { IS_DEV } from '@webview/env';
import type { JsonValue, TreeMap } from '@webview/types';

type JsonContainer = Record<string, unknown> | unknown[];

interface TraversalFrame {
  nodeId: string;
  container: JsonContainer;
  pointerParent: string;
  entries: Array<[string, unknown]>;
  index: number;
  currentLine: number;
  kind: 'object' | 'array';
}

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

function createContainerNode(
  nodeId: string,
  value: unknown,
  lineNumber: number,
): TreeMap[string] {
  const isGraphRoot = nodeId === GRAPH_ROOT_ID;
  const key = isGraphRoot ? undefined : (lastSegment(nodeId) ?? nodeId);
  return {
    id: nodeId,
    name: isGraphRoot ? GRAPH_ROOT_LABEL : (lastSegment(nodeId) ?? nodeId),
    children: [],
    data: { type: resolveJsonType(value), key, value, line: lineNumber },
  };
}

function createLeafNode(
  nodeId: string,
  keyOrIndex: string,
  value: unknown,
  lineNumber: number,
): TreeMap[string] {
  return {
    id: nodeId,
    name: `${keyOrIndex}: ${String(value)}`,
    data: {
      type: resolveJsonType(value),
      key: keyOrIndex,
      value,
      line: lineNumber,
    },
  };
}

function isContainer(value: unknown): value is JsonContainer {
  return typeof value === 'object' && value !== null;
}

function getEntries(container: JsonContainer): Array<[string, unknown]> {
  if (Array.isArray(container)) {
    const entries: Array<[string, unknown]> = [];
    for (const [index, value] of container.entries()) {
      entries.push([String(index), value]);
    }
    return entries;
  }

  return Object.entries(container);
}

function createFrame(
  nodeId: string,
  container: JsonContainer,
  lineNumber: number,
): TraversalFrame {
  const pointerParent = nodeId === GRAPH_ROOT_ID ? POINTER_ROOT : nodeId;
  return {
    nodeId,
    container,
    pointerParent,
    entries: getEntries(container),
    index: 0,
    currentLine: lineNumber + 1,
    kind: Array.isArray(container) ? 'array' : 'object',
  };
}

function getContainerSpan(
  container: JsonContainer,
  spanCache: WeakMap<object, number>,
): number {
  const cached = spanCache.get(container as object);
  if (cached !== undefined) {
    return cached;
  }

  const span = Object.keys(container).length + 2;
  spanCache.set(container as object, span);
  return span;
}

/**
 * Iteratively generates a TreeMap from a JSON value.
 */
export function generateTree(
  json: JsonValue,
  parentId: string = GRAPH_ROOT_ID,
  lineNumber = 1,
  acc: TreeMap = {},
): TreeMap {
  if (IS_DEV && GRAPH_ROOT_ID.startsWith('/')) {
    // Invalid sentinel configuration would break pointer generation.
    // In production we continue safely without throwing.
    return acc;
  }

  if (!isContainer(json)) {
    acc[parentId] = {
      id: parentId,
      name: String(json),
      data: { type: resolveJsonType(json), value: json, line: lineNumber },
    };

    return acc;
  }

  const spanCache = new WeakMap<object, number>();
  acc[parentId] = createContainerNode(parentId, json, lineNumber);

  const stack: TraversalFrame[] = [createFrame(parentId, json, lineNumber)];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];

    if (frame.index >= frame.entries.length) {
      stack.pop();
      continue;
    }

    const [segment, value] = frame.entries[frame.index++];
    const childId = buildPointer(frame.pointerParent, segment);

    if (isContainer(value)) {
      const childLine =
        frame.kind === 'object' ? frame.currentLine + 1 : frame.currentLine;

      acc[frame.nodeId].children?.push(childId);
      acc[childId] = createContainerNode(childId, value, childLine);
      frame.currentLine += getContainerSpan(value, spanCache);

      stack.push(createFrame(childId, value, childLine));
      continue;
    }

    // CONTRACT:
    // Leaf node names MUST use ": " separator.
    // searchService.extractKey/extractValue depend on this exact format.
    acc[childId] = createLeafNode(childId, segment, value, frame.currentLine);
    acc[frame.nodeId].children?.push(childId);
    frame.currentLine++;
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
