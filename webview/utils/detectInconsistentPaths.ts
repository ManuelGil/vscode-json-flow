export interface GraphNode {
  id: string;
  data?: {
    type?: string;
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
): Map<string, string[]> {
  const pathTypeMap = new Map<string, Set<string>>();

  for (const node of nodes ?? []) {
    if (!node?.id) {
      continue;
    }

    const normalizedPath = normalizePointer(node.id);
    if (!normalizedPath) {
      continue;
    }

    const detectedType = extractType(node);

    const bucket = pathTypeMap.get(normalizedPath) ?? new Set<string>();
    bucket.add(detectedType);
    pathTypeMap.set(normalizedPath, bucket);
  }

  const inconsistencies = new Map<string, string[]>();
  for (const [path, types] of pathTypeMap.entries()) {
    if (types.size > 1) {
      inconsistencies.set(path, Array.from(types));
    }
  }

  return inconsistencies;
}

function extractType(node: GraphNode): string {
  const rawType = node.data?.type?.trim();
  return rawType && rawType.length > 0 ? rawType : 'unknown';
}

export function normalizePointer(pointer: string): string | undefined {
  if (typeof pointer !== 'string' || pointer.length === 0) {
    return undefined;
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
