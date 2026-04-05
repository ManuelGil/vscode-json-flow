import type { GraphSnapshot } from '../types';

/**
 * Result of a visible subgraph computation.
 * Contains a subset of nodes and edges from the original graph.
 */
export interface VisibleSubgraph {
  /**
   * Node IDs included in the visible subgraph.
   */
  nodeIds: Set<string>;

  /**
   * Edge IDs included in the visible subgraph.
   */
  edgeIds: Set<string>;

  /**
   * Whether the subgraph was truncated due to maxNodes limit.
   */
  truncated: boolean;

  /**
   * Total number of nodes in the original graph.
   */
  totalNodes: number;
}

/**
 * Computes a visible subgraph using BFS traversal from a root node.
 *
 * This function enables scalability by limiting the number of visible nodes
 * while maintaining graph coherence. It always includes the root node and
 * expands breadth-first until the maxNodes limit is reached.
 *
 * Rules:
 * - BFS traversal from rootId
 * - Stops at maxNodes (inclusive)
 * - Always includes root node
 * - Includes only edges where both source and target are visible
 * - Returns metadata about truncation
 *
 * @param graph - The full GraphSnapshot to traverse
 * @param rootId - The root node ID to start BFS from
 * @param maxNodes - Maximum number of nodes to include (must be >= 1)
 * @returns VisibleSubgraph with node IDs, edge IDs, and metadata
 */
export function getVisibleSubgraph(
  graph: GraphSnapshot,
  rootId: string,
  maxNodes: number,
): VisibleSubgraph {
  if (maxNodes < 1) {
    throw new Error('maxNodes must be at least 1');
  }

  const rootNode = graph.nodes.get(rootId);
  if (!rootNode) {
    return {
      nodeIds: new Set(),
      edgeIds: new Set(),
      truncated: false,
      totalNodes: graph.nodes.size,
    };
  }

  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const queue: string[] = [rootId];
  const visited = new Set<string>();

  visited.add(rootId);

  while (queue.length > 0 && nodeIds.size < maxNodes) {
    const currentId = queue.shift();
    if (!currentId) {
      break;
    }

    nodeIds.add(currentId);

    for (const [, edge] of graph.edges) {
      if (edge.source === currentId) {
        const targetNode = graph.nodes.get(edge.target);
        if (targetNode && !visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
  }

  for (const [currentEdgeId, edge] of graph.edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      edgeIds.add(currentEdgeId);
    }
  }

  return {
    nodeIds,
    edgeIds,
    truncated: nodeIds.size < visited.size,
    totalNodes: graph.nodes.size,
  };
}

/**
 * Fast type-based node filtering using Graph indexes.
 * Falls back to empty array if graph is not available.
 *
 * @param graph - GraphSnapshot with indexes, or null
 * @param type - JSON type to filter by
 * @returns Array of node IDs matching the type
 */
export function getNodesByType(
  graph: GraphSnapshot | null,
  type: string,
): string[] {
  if (!graph) {
    return [];
  }
  return graph.nodesByType.get(type as never) ?? [];
}

/**
 * Fast key-based node filtering using Graph indexes.
 * Falls back to empty array if graph is not available.
 *
 * @param graph - GraphSnapshot with indexes, or null
 * @param key - Key to filter by
 * @returns Array of node IDs with matching key
 */
export function getNodesByKey(
  graph: GraphSnapshot | null,
  key: string,
): string[] {
  if (!graph) {
    return [];
  }
  return graph.nodesByKey.get(key) ?? [];
}
