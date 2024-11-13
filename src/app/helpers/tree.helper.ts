import { Tree } from '../interfaces';

export const generateTree = (
  json: object,
  showValues: boolean = true
): Tree => {
  const tree: Tree = {};
  let currentId = 1;

  // Initialize the queue with the root node
  const queue: { id: number; name: string; data: any }[] = [
    { id: currentId, name: 'root', data: json },
  ];

  // Process each item in the queue
  while (queue.length > 0) {
    const { id, name, data } = queue.shift()!;

    // Create the current node and add it to the tree
    tree[id] = { id: id.toString(), name };

    // Determine if the node has children
    if (typeof data === 'object' && data !== null) {
      const children: number[] = [];

      // Add each property or array item to the queue
      for (const [key, value] of Object.entries(data)) {
        currentId += 1;
        children.push(currentId);

        // Add to the queue with an incremented ID
        queue.push({ id: currentId, name: key, data: value });
      }

      tree[id].children = children;
    } else if (showValues) {
      // If it's a primitive value and showValues is true, add it as a leaf node
      currentId += 1;
      tree[currentId] = { id: currentId.toString(), name: data.toString() };
      tree[id].children = [currentId];
    }
  }

  return tree;
};
