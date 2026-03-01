import type { TreeData, TreeMap } from '@webview/types';

/**
 * Recursively collects all descendant node IDs for a given node in a tree.
 *
 * @param nodeId - The ID of the node to start from.
 * @param tree - The tree data as a mapping from IDs to nodes.
 * @returns An array of descendant node IDs.
 *
 * @example
 * const descendants = getAllDescendants('root', treeData);
 */
export function getAllDescendants(
  nodeId: string,
  tree: Record<string, TreeData>,
): string[] {
  const descendants: string[] = [];
  const node = tree[nodeId];

  if (!node?.children?.length) {
    return descendants;
  }

  for (const childId of node.children) {
    descendants.push(childId);
    descendants.push(...getAllDescendants(childId, tree));
  }

  return descendants;
}

/**
 * Builds a child-to-parent lookup map from a TreeMap.
 * O(n) single pass over all nodes and their children arrays.
 *
 * @param tree - The tree data as a TreeMap.
 * @returns A Map where each key is a child node ID and the value is its parent node ID.
 */
export function buildParentMap(tree: TreeMap): Map<string, string> {
  const map = new Map<string, string>();
  for (const [nodeId, node] of Object.entries(tree)) {
    for (const childId of node.children ?? []) {
      map.set(childId, nodeId);
    }
  }
  return map;
}

/**
 * Collects all ancestor node IDs for a set of match IDs by walking
 * the parentMap upward. Short-circuits when an ancestor is already
 * in the result set, preventing redundant walks.
 *
 * O(n) amortized: each node is visited at most once across all walks.
 *
 * @param matchIds - The set of matched node IDs.
 * @param parentMap - A child-to-parent lookup map (from {@link buildParentMap}).
 * @returns A Set containing all ancestor node IDs (excluding the match IDs themselves).
 */
export function collectAncestors(
  matchIds: Set<string>,
  parentMap: Map<string, string>,
): Set<string> {
  const ancestors = new Set<string>();
  for (const id of matchIds) {
    let current = parentMap.get(id);
    while (current !== undefined && !ancestors.has(current)) {
      ancestors.add(current);
      current = parentMap.get(current);
    }
  }
  return ancestors;
}
