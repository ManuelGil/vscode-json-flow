import type { Edge, Node } from '@xyflow/react';
import { useMemo } from 'react';
import type { SearchProjectionMode, TreeMap } from '../types';
import {
  type InconsistentPathInfo,
  normalizePointer,
} from '../utils/detectInconsistentPaths';

/**
 * useSearchProjection.ts
 * Extracts search projection logic from FlowCanvas.
 * Derives renderNodes and renderEdges from worker output with search filtering.
 */

interface EdgeSettingsSnapshot {
  edgeType: string;
  animated: boolean;
  hasArrow: boolean;
}

interface UseSearchProjectionParams {
  visibleNodes: Node[];
  workerEdges: Edge[] | null;
  searchContextSet: Set<string> | null;
  searchMatchIds: Set<string>;
  searchProjectionMode: SearchProjectionMode;
  safeTreeData?: TreeMap;
  nodesWithCollapsedDescendants: Set<string>;
  edgeSettingsSnapshot: EdgeSettingsSnapshot;
  handleToggleChildren: (nodeId: string) => void;
  applyEdgeSettings: (edges: Edge[], settings: EdgeSettingsSnapshot) => Edge[];
  inconsistentPaths?: Map<string, InconsistentPathInfo | string[]>;
}

interface UseSearchProjectionResult {
  renderNodes: Node[];
  renderEdges: Edge[];
}

/**
 * Computes isSearchMatch per projection mode:
 *   highlight:      tri-state (undefined / true / false)
 *   focus-context:  true for matches, undefined for ancestors
 *   focus-strict:   undefined for all (every projected node is a match)
 */
function computeSearchMatch(
  nodeId: string,
  searchMatchIds: Set<string>,
  searchProjectionMode: SearchProjectionMode,
): boolean | undefined {
  if (searchMatchIds.size === 0) {
    return undefined;
  }
  if (searchProjectionMode === 'highlight') {
    return searchMatchIds.has(nodeId);
  }
  if (searchProjectionMode === 'focus-context') {
    return searchMatchIds.has(nodeId) ? true : undefined;
  }
  // focus-strict: all projected nodes are matches
  return undefined;
}

function getDominantType(info: InconsistentPathInfo): string | null {
  let dominantType: string | null = null;
  let dominantCount = 0;
  let hasTie = false;

  for (const [type, nodeIds] of info.nodeIdsByType.entries()) {
    const count = nodeIds.length;
    if (count > dominantCount) {
      dominantType = type;
      dominantCount = count;
      hasTie = false;
      continue;
    }

    if (count === dominantCount && type !== dominantType) {
      hasTie = true;
    }
  }

  return hasTie ? null : dominantType;
}

/**
 * Hook that derives renderNodes and renderEdges from worker output.
 * Applies search projection filtering and UI enrichment without mutating worker arrays.
 */
export function useSearchProjection({
  visibleNodes,
  workerEdges,
  searchContextSet,
  searchMatchIds,
  searchProjectionMode,
  nodesWithCollapsedDescendants,
  edgeSettingsSnapshot,
  handleToggleChildren,
  applyEdgeSettings,
  inconsistentPaths,
}: Omit<UseSearchProjectionParams, 'safeTreeData'>): UseSearchProjectionResult {
  const renderNodes = useMemo(() => {
    if (!visibleNodes.length) {
      return [];
    }

    // Search projection: further filter visibleNodes when a focus mode is active
    const projectedNodes =
      searchContextSet !== null
        ? visibleNodes.filter((n) => searchContextSet.has(n.id))
        : visibleNodes;

    return projectedNodes.map((node) => {
      const normalizedPath = normalizePointer(node.id) ?? node.id;
      const info = normalizedPath
        ? inconsistentPaths?.get(normalizedPath)
        : undefined;
      const nodeType = String(
        (node.data as { type?: unknown } | undefined)?.type ?? 'unknown',
      );

      let shouldShowInconsistencyIcon = false;

      if (Array.isArray(info)) {
        shouldShowInconsistencyIcon = Boolean(
          normalizedPath && inconsistentPaths?.has(normalizedPath),
        );
      } else if (info) {
        const dominantType = getDominantType(info);
        shouldShowInconsistencyIcon =
          dominantType === null ? true : nodeType !== dominantType;
      }

      return {
        ...node,
        data: {
          ...node.data,
          onToggleChildren: handleToggleChildren,
          isCollapsed: nodesWithCollapsedDescendants.has(node.id),
          isSearchMatch: computeSearchMatch(
            node.id,
            searchMatchIds,
            searchProjectionMode,
          ),
          hasInconsistencyWarning: shouldShowInconsistencyIcon,
        },
      };
    });
  }, [
    visibleNodes,
    searchContextSet,
    nodesWithCollapsedDescendants,
    handleToggleChildren,
    searchMatchIds,
    searchProjectionMode,
    inconsistentPaths,
  ]);

  const renderEdges = useMemo(() => {
    const sourceEdges = workerEdges ?? [];

    if (!renderNodes.length) {
      return [];
    }

    // Edge filtering: both endpoints must be in the projected node set
    const projectedIds = new Set(renderNodes.map((n) => n.id));
    const filteredEdges = sourceEdges.filter(
      (edge) => projectedIds.has(edge.source) && projectedIds.has(edge.target),
    );

    return applyEdgeSettings(filteredEdges, edgeSettingsSnapshot);
  }, [renderNodes, workerEdges, edgeSettingsSnapshot, applyEdgeSettings]);

  return { renderNodes, renderEdges };
}
