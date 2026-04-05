import type { Node } from '@xyflow/react';
import { useMemo } from 'react';
import { extractKey, extractValue } from '../services/searchService';

type NodePropertyDetails = {
  pointer: string;
  key: string;
  type: string;
  valuePreview?: string;
  isContainer: boolean;
  childCount: number;
  parentPointer?: string;
  lineNumber?: number;
};

export type NodePropertiesViewModel = {
  details: NodePropertyDetails;
  pointerSegments: string[];
  depth: number;
  indexInParent?: string;
  childPointers: string[];
  renderedValuePreview: string;
  isValueMultiline: boolean;
  parentPointerValue: string;
  pathValue: string;
};

export function useNodeProperties(
  node: Node | null,
): NodePropertiesViewModel | null {
  return useMemo(() => {
    if (!node) {
      return null;
    }

    const details = createDetails(node);
    if (!details) {
      return null;
    }

    const pointerSegments = getPointerSegments(details.pointer);
    const depth = Math.max(pointerSegments.length - 1, 0);
    const indexInParent = getIndexFromPointer(details.pointer);
    const childPointers = extractChildPointers(node);
    const renderedValuePreview = getDisplayValuePreview(details);
    const isValueMultiline = shouldUseMultilineValue(
      details.valuePreview,
      details.type,
    );

    return {
      details,
      pointerSegments,
      depth,
      indexInParent,
      childPointers,
      renderedValuePreview,
      isValueMultiline,
      parentPointerValue: details.parentPointer ?? 'root',
      pathValue: details.pointer,
    };
  }, [node]);
}

function createDetails(node: Node): NodePropertyDetails | null {
  const nodeData = (node.data ?? {}) as {
    label?: string;
    type?: string;
    children?: unknown[];
    line?: number;
  };

  const label = nodeData.label || node.id;
  const keyLabel = extractKey(label);
  const valuePreview = extractValue(label);
  const nodeType = nodeData.type || node.type || 'node';
  const parentPointer =
    'parentId' in node && typeof node.parentId === 'string'
      ? node.parentId
      : undefined;
  const childCount = Array.isArray(nodeData.children)
    ? nodeData.children.length
    : 0;

  return {
    pointer: node.id,
    key: keyLabel,
    type: nodeType,
    valuePreview: valuePreview || undefined,
    isContainer: nodeType === 'object' || nodeType === 'array',
    childCount,
    parentPointer,
    lineNumber: nodeData.line,
  };
}

function getDisplayValuePreview(details: NodePropertyDetails): string {
  if (details.type === 'object') {
    const propertyLabel = details.childCount === 1 ? 'property' : 'properties';
    return `{…} ${details.childCount} ${propertyLabel}`;
  }

  if (details.type === 'array') {
    const itemLabel = details.childCount === 1 ? 'item' : 'items';
    return `[…] ${details.childCount} ${itemLabel}`;
  }

  return details.valuePreview ?? '';
}

function shouldUseMultilineValue(value?: string, nodeType?: string): boolean {
  if (!value) {
    return false;
  }
  return (
    value.includes('\n') ||
    value.length > 60 ||
    nodeType === 'object' ||
    nodeType === 'array'
  );
}

function getPointerSegments(pointer: string): string[] {
  if (!pointer) {
    return ['root'];
  }

  const segments: string[] = pointer
    .split('/')
    .filter((segment: string) => segment.length > 0);

  if (segments.length === 0) {
    return ['root'];
  }

  return ['root', ...segments];
}

function getIndexFromPointer(pointer: string): string | undefined {
  if (!pointer) {
    return undefined;
  }

  const segments = pointer
    .split('/')
    .filter((segment: string) => segment.length > 0);

  if (segments.length === 0) {
    return undefined;
  }

  const lastSegment = segments[segments.length - 1];
  return /^\d+$/.test(lastSegment) ? lastSegment : undefined;
}

function extractChildPointers(node: Node): string[] {
  const rawChildren = (node.data as { children?: string[] })?.children;
  if (!Array.isArray(rawChildren)) {
    return [];
  }
  return rawChildren
    .filter(
      (childPointer): childPointer is string =>
        typeof childPointer === 'string',
    )
    .sort((first, second) => first.localeCompare(second));
}
