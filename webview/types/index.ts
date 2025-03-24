export interface TreeData {
  id: string;
  label?: string;
  children?: string[];
  siblings?: string[];
  spouses?: string[];
}

export type Direction = 'TB' | 'LR' | 'BT' | 'RL';

export interface CustomNodeData {
  id: string;
  isSpouse?: boolean;
  isSibling?: boolean;
  label?: string;
  direction?: Direction;
  isRoot?: boolean;
  children?: TreeData[];
  siblings?: TreeData[];
  spouses?: TreeData[];
  selected?: boolean;
  onToggleChildren?: (id: string) => void;
  isCollapsed?: boolean;
  line?: number;
}

export interface TreeNode {
  id: string;
  name: string;
  type?: string;
  children?: string[];
  siblings?: string[];
  spouses?: string[];
  isSpouse?: boolean;
  isSibling?: boolean;
  data?: {
    type?: string;
    value?: string;
    homeTown?: string;
    formed?: number;
    secretBase?: string;
    active?: boolean;
    line?: number;
  };
}

export type TreeMap = Record<string, TreeNode>;

export enum EdgeType {
  Straight = 'straight',
  Step = 'step',
  SmoothStep = 'smoothstep',
  SimpleBezier = 'simplebezier',
}

export const EDGE_TYPE_NAMES: Record<EdgeType, string> = {
  [EdgeType.Straight]: 'Straight',
  [EdgeType.Step]: 'Step',
  [EdgeType.SmoothStep]: 'Smooth Step',
  [EdgeType.SimpleBezier]: 'Simple Bezier',
};

export interface EdgeSettings {
  edgeType: EdgeType;
  animated: boolean;
  edgeColor: string;
}