import type { TreeData, TreeMap } from '@webview/types';

/**
 * Iterative (stack-based) variant of {@link getAllDescendants}.
 * Collects all descendant node IDs without recursion, avoiding
 * stack overflow on deeply nested trees and eliminating intermediate
 * array allocations from push(...spread).
 *
 * O(subtree) time, O(subtree) memory.
 */
export function getDescendantsOf(
  nodeId: string,
  tree: Record<string, TreeData>,
): string[] {
  const root = tree[nodeId];
  if (!root?.children?.length) {
    return [];
  }

  const descendants: string[] = [];
  const stack: string[] = root.children.slice();

  while (stack.length > 0) {
    const id = stack.pop()!;
    descendants.push(id);
    const node = tree[id];
    if (node?.children?.length) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
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

/**
 * Returns the set of node IDs that have at least one descendant
 * present in {@link collapsedNodes}.
 *
 * Walks up from each collapsed node via {@link parentMap}, short-circuiting
 * when an already-visited ancestor is reached.
 * O(|collapsedNodes| × depth) amortized — each node visited at most once.
 */
export function computeNodesWithCollapsedDescendants(
  collapsedNodes: Set<string>,
  parentMap: Map<string, string>,
): Set<string> {
  const result = new Set<string>();
  for (const id of collapsedNodes) {
    let current = parentMap.get(id);
    while (current !== undefined && !result.has(current)) {
      result.add(current);
      current = parentMap.get(current);
    }
  }
  return result;
}
