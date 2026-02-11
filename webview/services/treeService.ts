import type { TreeData } from '@webview/types';

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
