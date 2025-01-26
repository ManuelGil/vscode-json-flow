export interface TreeNode {
  id: string;
  name: string;
  children?: number[];
}

export interface Tree {
  [key: number]: TreeNode;
}
