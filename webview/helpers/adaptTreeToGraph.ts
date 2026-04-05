import type { GraphEdge, GraphNode, GraphSnapshot, TreeMap } from '../types';

/**
 * Separator used in TreeMap node.name for leaf nodes.
 * Format: "key: value"
 */
const NAME_SEPARATOR = ': ';

/**
 * Attempts to extract key and value from a node name using the ": " separator.
 * Returns undefined for both if the format is invalid or not a leaf node.
 *
 * @param name - The node name from TreeMap
 * @returns Object with optional key and value, or both undefined if extraction fails
 */
function extractKeyValue(name: string): { key?: string; value?: string } {
  const separatorIndex = name.indexOf(NAME_SEPARATOR);

  if (separatorIndex === -1) {
    return {};
  }

  const key = name.slice(0, separatorIndex);
  const value = name.slice(separatorIndex + NAME_SEPARATOR.length);

  return { key, value };
}

/**
 * Adapts a TreeMap to a GraphSnapshot.
 *
 * This is a pure function that creates a graph domain model from the existing
 * TreeMap structure without mutating the original tree. The graph provides:
 * - Explicit key/value separation (extracted from node.name)
 * - Indexed access via Maps
 * - Explicit edge representation
 * - Performance indexes for type and key lookups
 *
 * Rules:
 * - Does not modify the input TreeMap
 * - Preserves all node IDs (JSON Pointers)
 * - Extracts key/value only from node.name using ": " separator
 * - Creates edges from children relationships
 * - Builds indexes in a single pass (O(n) complexity)
 * - Skips extraction if name format is invalid
 *
 * @param tree - The TreeMap to adapt
 * @returns An immutable GraphSnapshot with indexed nodes, edges, and performance indexes
 */
export function adaptTreeToGraph(tree: TreeMap): GraphSnapshot {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const nodesByType = new Map<GraphNode['type'], string[]>();
  const nodesByKey = new Map<string, string[]>();
  const edgesBySource = new Map<string, string[]>();

  for (const [nodeId, treeNode] of Object.entries(tree)) {
    const { key, value } = extractKeyValue(treeNode.name);

    const graphNode: GraphNode = {
      id: nodeId,
      type: (treeNode.data?.type as GraphNode['type']) || 'string',
      key,
      value,
      line: treeNode.data?.line,
    };

    nodes.set(nodeId, graphNode);

    // Build type index (create new array to avoid mutation)
    const typeList = nodesByType.get(graphNode.type) ?? [];
    nodesByType.set(graphNode.type, [...typeList, nodeId]);

    // Build key index (only for nodes with extracted keys)
    if (key !== undefined) {
      const keyList = nodesByKey.get(key) ?? [];
      nodesByKey.set(key, [...keyList, nodeId]);
    }

    if (treeNode.children && Array.isArray(treeNode.children)) {
      const targets: string[] = [];
      for (const childId of treeNode.children) {
        // Skip invalid child references (safety check)
        if (!tree[childId]) {
          continue;
        }
        const edgeId = `${nodeId}->${childId}`;
        const edge: GraphEdge = {
          id: edgeId,
          source: nodeId,
          target: childId,
          type: 'child',
        };
        edges.set(edgeId, edge);
        targets.push(childId);
      }
      if (targets.length > 0) {
        edgesBySource.set(nodeId, targets);
      }
    }
  }

  return { nodes, edges, nodesByType, nodesByKey, edgesBySource };
}
