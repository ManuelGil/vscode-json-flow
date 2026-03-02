import type { SearchProjectionMode, TreeMap } from '@webview/types';
import type { Edge, Node } from '@xyflow/react';
import { useMemo } from 'react';

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
  descendantsCache: Map<string, string[]>;
  collapsedNodes: Set<string>;
  edgeSettingsSnapshot: EdgeSettingsSnapshot;
  handleToggleChildren: (nodeId: string) => void;
  applyEdgeSettings: (edges: Edge[], settings: EdgeSettingsSnapshot) => Edge[];
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
  descendantsCache,
  collapsedNodes,
  edgeSettingsSnapshot,
  handleToggleChildren,
  applyEdgeSettings,
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
      return {
        ...node,
        data: {
          ...node.data,
          onToggleChildren: handleToggleChildren,
          isCollapsed: (descendantsCache.get(node.id) ?? []).some(
            (descendantId) => collapsedNodes.has(descendantId),
          ),
          isSearchMatch: computeSearchMatch(
            node.id,
            searchMatchIds,
            searchProjectionMode,
          ),
        },
      };
    });
  }, [
    visibleNodes,
    searchContextSet,
    descendantsCache,
    collapsedNodes,
    handleToggleChildren,
    searchMatchIds,
    searchProjectionMode,
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
