import type { PathSegment } from '../types';

export interface InconsistentPathInfo {
  types: string[];
  nodeIdsByType: Map<string, string[]>;
}

export interface GraphNode {
  id: string;
  data?: {
    type?: string;
    pathSegments?: PathSegment[];
  };
}

/**
 * Groups nodes by normalized pointer path (array indexes collapsed to "*") and returns
 * only the paths whose nodes expose more than one detected type.
 *
 * Runs in O(n) time by scanning the input array once.
 */
export function detectInconsistentPaths(
  nodes: GraphNode[],
): Map<string, InconsistentPathInfo> {
  const pathTypeMap = new Map<string, InconsistentPathInfo>();

  for (const node of nodes ?? []) {
    if (!node?.id) {
      continue;
    }

    const normalizedPath = normalizePointer(node.id, node.data?.pathSegments);
    if (!normalizedPath) {
      continue;
    }

    const detectedType = extractType(node);

    const bucket =
      pathTypeMap.get(normalizedPath) ??
      ({
        types: [],
        nodeIdsByType: new Map<string, string[]>(),
      } satisfies InconsistentPathInfo);

    if (!bucket.types.includes(detectedType)) {
      bucket.types.push(detectedType);
    }

    const nodeIds = bucket.nodeIdsByType.get(detectedType) ?? [];
    nodeIds.push(node.id);
    bucket.nodeIdsByType.set(detectedType, nodeIds);

    pathTypeMap.set(normalizedPath, bucket);
  }

  const inconsistencies = new Map<string, InconsistentPathInfo>();
  for (const [path, info] of pathTypeMap.entries()) {
    if (info.types.length > 1) {
      inconsistencies.set(path, info);
    }
  }

  return inconsistencies;
}

function extractType(node: GraphNode): string {
  const rawType = node.data?.type?.trim();

  if (rawType && rawType.length > 0) {
    return rawType;
  }

  const value = (node.data as unknown as Record<string, unknown>)?.value;

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}

export function normalizePointer(
  pointer: string,
  pathSegments?: PathSegment[],
): string | undefined {
  if (typeof pointer !== 'string' || pointer.length === 0) {
    return undefined;
  }

  if (Array.isArray(pathSegments) && pathSegments.length > 0) {
    const normalizedFromMetadata = pathSegments
      .map((segment) => (segment.kind === 'array-index' ? '*' : segment.value))
      .join('/');

    return pointer[0] === '/'
      ? `/${normalizedFromMetadata}`
      : normalizedFromMetadata;
  }

  if (pointer[0] !== '/') {
    // Non-pointer IDs (e.g., graph root sentinel) are used as-is.
    return pointer;
  }

  if (pointer === '/') {
    return pointer;
  }

  const segments = pointer.split('/');
  for (let index = 1; index < segments.length; index++) {
    if (isNumericSegment(segments[index])) {
      segments[index] = '*';
    }
  }
  return segments.join('/');
}

function isNumericSegment(segment: string): boolean {
  if (!segment) {
    return false;
  }
  const numericValue = Number(segment);
  return Number.isInteger(numericValue) && String(numericValue) === segment;
}
