/**
 * Represents a node in the JSON Flow tree structure for use in tree views and providers.
 * Each node is uniquely identified by its ID and has a human-readable name.
 * Optionally, a node may have children, which are referenced by their IDs.
 *
 * @example
 * const node: TreeNode = { id: 'root', name: 'Root Node', children: [1, 2] };
 */
export interface TreeNode {
  /**
   * Unique identifier for the node.
   */
  id: string;
  /**
   * Human-readable name for the node.
   */
  name: string;
  /**
   * Optional array of child node IDs.
   */
  children?: number[];
}

/**
 * Represents a hierarchical mapping of tree nodes by level.
 * Each key is a tree depth (level), and the value is an array of nodes at that level.
 *
 * @example
 * const tree: Tree = {
 *   0: [{ id: 'root', name: 'Root Node' }],
 *   1: [{ id: 'child1', name: 'Child 1' }, { id: 'child2', name: 'Child 2' }]
 * };
 */
export interface Tree {
  /**
   * Mapping of tree levels to arrays of nodes.
   */
  [level: number]: TreeNode[];
}
