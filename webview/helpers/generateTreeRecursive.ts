import { GRAPH_ROOT_ID, GRAPH_ROOT_LABEL } from '@src/shared/graph-identity';
import {
  buildPointer,
  lastSegment,
  POINTER_ROOT,
} from '@src/shared/node-pointer';
import { IS_DEV } from '../env';
import type { JsonValue, TreeMap } from '../types';

const MAX_DEPTH = 1000;

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
  id: string,
  name: string,
  type: string,
  line: number,
) {
  return {
    id,
    name,
    children: [],
    data: { type, line },
  };
}

function createLeafNode(id: string, key: string, value: unknown, line: number) {
  return {
    id,
    name: `${key}: ${String(value)}`,
    data: { type: resolveJsonType(value), line },
  };
}

function addChild(acc: TreeMap, parentId: string, childId: string): void {
  acc[parentId].children?.push(childId);
}

function computeNodeSize(entriesCount: number): number {
  return entriesCount + 2;
}

function processEntry(
  acc: TreeMap,
  parentId: string,
  pointerParent: string,
  key: string,
  value: JsonValue,
  currentLine: number,
  depth: number,
  entriesCount: number,
): number {
  const childId = buildPointer(pointerParent, key);
  const isContainer = typeof value === 'object' && value !== null;

  if (isContainer) {
    acc[childId] = createContainerNode(
      childId,
      key,
      resolveJsonType(value),
      currentLine,
    );
    addChild(acc, parentId, childId);
    generateTreeInternalRecursive(
      value,
      childId,
      currentLine + 1,
      acc,
      depth + 1,
    );
    return computeNodeSize(entriesCount);
  }

  acc[childId] = createLeafNode(childId, key, value, currentLine);
  addChild(acc, parentId, childId);
  return 1;
}

function generateTreeInternalRecursive(
  json: JsonValue,
  parentId: string,
  lineNumber: number,
  acc: TreeMap,
  depth: number,
): void {
  if (depth > MAX_DEPTH) {
    acc[parentId] = {
      id: parentId,
      name: `${lastSegment(parentId)}: [Max depth reached]`,
      data: { type: 'object', line: lineNumber },
    };
    return;
  }

  const pointerParent = parentId === GRAPH_ROOT_ID ? POINTER_ROOT : parentId;
  const isGraphRoot = parentId === GRAPH_ROOT_ID;
  const isContainer = typeof json === 'object' && json !== null;

  if (!isContainer) {
    acc[parentId] = {
      id: parentId,
      name: String(json),
      data: { type: resolveJsonType(json), line: lineNumber },
    };
    return;
  }

  const nodeName = isGraphRoot
    ? GRAPH_ROOT_LABEL
    : (lastSegment(parentId) ?? parentId);

  acc[parentId] = createContainerNode(
    parentId,
    nodeName,
    resolveJsonType(json),
    lineNumber,
  );

  let currentLine = lineNumber + 1;
  const entries = Array.isArray(json)
    ? json.map((v, i) => [String(i), v] as [string, JsonValue])
    : (Object.entries(json) as [string, JsonValue][]);

  for (const [key, value] of entries) {
    const isChildContainer = typeof value === 'object' && value !== null;
    const childEntriesCount = isChildContainer
      ? Array.isArray(value)
        ? value.length
        : Object.keys(value).length
      : 0;

    const lineIncrement = processEntry(
      acc,
      parentId,
      pointerParent,
      key,
      value,
      currentLine,
      depth,
      childEntriesCount,
    );
    currentLine += lineIncrement;
  }
}

export function generateTreeRecursive(
  json: JsonValue,
  parentId: string = GRAPH_ROOT_ID,
  lineNumber = 1,
  acc: TreeMap = {},
): TreeMap {
  if (IS_DEV && GRAPH_ROOT_ID.startsWith('/')) {
    throw new Error(
      'GRAPH_ROOT_ID must never start with "/". The graph identity domain and the JSON Pointer domain must remain disjoint.',
    );
  }

  generateTreeInternalRecursive(json, parentId, lineNumber, acc, 0);
  return acc;
}
