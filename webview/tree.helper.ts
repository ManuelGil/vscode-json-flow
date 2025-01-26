import { Tree, TreeNode } from './tree.interface';

export const generateTree = (
  json: object,
  showValues: boolean = true,
): Tree => {
  const tree: Tree = {};
  let currentId = 1;

  // Initialize queue with the root node
  const queue: { id: number; name: string; data: unknown }[] = [
    { id: currentId, name: 'root', data: json },
  ];

  while (queue.length > 0) {
    const { id, name, data } = queue.shift()!;

    // Create the node for the current data
    const node: TreeNode = { id: id.toString(), name };

    // If the data is an object or array, process its children
    if (typeof data === 'object' && data !== null) {
      const children: number[] = [];

      // Handle objects
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          currentId++;
          children.push(currentId);
          queue.push({ id: currentId, name: index.toString(), data: item });
        });
      } else {
        Object.entries(data).forEach(([key, value]) => {
          currentId++;
          children.push(currentId);
          queue.push({ id: currentId, name: key, data: value });
        });
      }

      node.children = children;
    } else if (
      showValues &&
      (typeof data === 'string' ||
        typeof data === 'number' ||
        typeof data === 'boolean')
    ) {
      // If showValues is true, append the value as the node's name
      node.name += `: ${data}`;
    }

    // Add the node to the tree
    tree[id] = node;
  }

  return tree;
};
