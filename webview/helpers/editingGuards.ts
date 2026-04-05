export interface NodeLike {
  id: string;
  position?: { x: number; y: number };
}

export function deriveDatasetFileType(
  path?: string,
  fileName?: string,
): string {
  const source = path || fileName || '';
  const lastSegment = source.split(/[\\/]/).pop() ?? source;
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === lastSegment.length - 1) {
    return '';
  }
  return lastSegment
    .slice(dotIndex + 1)
    .toLowerCase()
    .trim();
}

export function isEditableFileType(fileType?: string): boolean {
  const t = (fileType ?? '').toLowerCase().trim();
  return t === 'json' || t === 'jsonc' || t === 'json5';
}

export function isStructuralChange(
  prevNodes: NodeLike[],
  nextNodes: NodeLike[],
): boolean {
  return nextNodes.length !== prevNodes.length;
}

export function preserveNodePositions(
  prevNodes: NodeLike[],
  nextNodes: NodeLike[],
): NodeLike[] {
  const prevMap = new Map(prevNodes.map((n) => [n.id, n]));
  return nextNodes.map((n) => {
    const prev = prevMap.get(n.id);
    return prev?.position ? { ...n, position: prev.position } : n;
  });
}

export function shouldClearSelection(
  selectedNodeId: string | null | undefined,
  nodes: NodeLike[],
): boolean {
  if (!selectedNodeId) {
    return false;
  }
  return !nodes.some((node) => node.id === selectedNodeId);
}
