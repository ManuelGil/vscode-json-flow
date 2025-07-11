import type { Node } from '@xyflow/react';

import { getRootId } from '@webview/helpers';
import type { TreeData, TreeMap } from '@webview/types';
import { layoutElements } from './layoutService';

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
 * Generates an array of React Flow Node objects from a TreeMap.
 *
 * @param treeData - The tree data as a TreeMap.
 * @returns An array of Node objects for use in React Flow.
 *
 * @example
 * const nodes = generateNodes(treeData);
 */
export function generateNodes(treeData: TreeMap): Node[] {
  if (!Object.keys(treeData).length) {
    return [];
  }

  const rootId = getRootId(treeData);
  const { nodes } = layoutElements(treeData, rootId, 'TB');
  return nodes.map((node) => ({
    ...node,
    position: node.position || { x: 0, y: 0 },
  }));
}
