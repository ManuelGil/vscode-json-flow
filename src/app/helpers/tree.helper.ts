import { Tree, TreeNode } from '../../interfaces';

export const generateTree = (json: object): Tree => {
  const tree: Tree = {};
  let currentId = 1;

  // Initialize queue with root node
  const queue: Array<{ id: number; name: string; data: unknown }> = [
    { id: currentId, name: 'root', data: json },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { id, name, data } = current;

    // Create current node
    const node: TreeNode = {
      id: id.toString(),
      name: name,
    };

    // Process child nodes if data is an object
    if (data && typeof data === 'object') {
      const children: number[] = [];

      // Process each property in the object
      for (const [key, value] of Object.entries(data)) {
        currentId++;

        // Add child to queue for processing
        queue.push({
          id: currentId,
          name: key,
          data: value,
        });

        // Add child ID to current node's children array
        children.push(currentId);
      }

      // Only add children array if there are children
      if (children.length > 0) {
        node.children = children;
      }
    }

    // Add node to tree
    tree[id] = node;
  }

  return tree;
};
