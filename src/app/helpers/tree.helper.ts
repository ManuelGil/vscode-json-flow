import { Tree } from '../interfaces';

export const generateTree = (json: object): Tree => {
  const tree: Tree = {};
  let currentId = 1;

  // Initialize queue with the root node
  const queue: Array<{ id: number; name: string; data: any }> = [
    { id: currentId++, name: 'root', data: json },
  ];

  // Process each item in the queue
  while (queue.length > 0) {
    const { id, name, data } = queue.shift()!;

    // Create the current node and add it to the tree
    tree[id] = { id: id.toString(), name };
    if (typeof data === 'object' && data !== null) {
      tree[id].children = [];

      // Add children to the queue
      for (const [key, value] of Object.entries(data)) {
        const childId = currentId++;

        queue.push({
          id: childId,
          name: `${key}`,
          data: value,
        });

        tree[id].children.push(childId);
      }
    } else {
      // For non-object/array data, add as a child node directly
      const childId = currentId++;
      tree[childId] = {
        id: childId.toString(),
        name: `${data}`,
      };
      tree[id].children = (tree[id].children || []).concat(childId);
    }
  }

  return tree;
};
