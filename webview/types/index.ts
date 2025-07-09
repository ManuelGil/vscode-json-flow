/**
 * Representa un nodo simple del árbol, usado para relaciones básicas.
 */
/**
 * Basic tree node with relationship references by ID.
 */
export interface TreeData {
  id: string;
  label?: string;
  children?: string[];
  siblings?: string[];
  spouses?: string[];
}

/**
 * Diagram layout direction.
 * TB = Top-Bottom, LR = Left-Right, BT = Bottom-Top, RL = Right-Left
 */
export type Direction = 'TB' | 'LR' | 'BT' | 'RL';

/**
 * Datos extendidos para nodos personalizados usados en React Flow.
 */
/**
 * Extended node data for React Flow nodes. All relationships are by ID.
 * No UI handlers or functions should be included.
 */
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

/**
 * Full tree node with extended metadata.
 */
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

/**
 * Map of tree nodes by ID.
 */
export type TreeMap = Record<string, TreeNode>;

/**
 * Supported edge types for React Flow.
 */
export enum EdgeType {
  Straight = 'straight',
  Step = 'step',
  SmoothStep = 'smoothstep',
  SimpleBezier = 'simplebezier',
}

/**
 * Human-readable names for edge types.
 */
export const EDGE_TYPE_NAMES: Record<EdgeType, string> = {
  [EdgeType.Straight]: 'Straight',
  [EdgeType.Step]: 'Step',
  [EdgeType.SmoothStep]: 'Smooth Step',
  [EdgeType.SimpleBezier]: 'Simple Bezier',
};

/**
 * Edge configuration for the diagram.
 */
export interface EdgeSettings {
  edgeType: EdgeType;
  animated: boolean;
  edgeColor: string;
}

/**
 * CSS class definitions for node colors.
 */
export type NodeColors = {
  node: string[];
  nodeSelected: string;
  handle: string[];
  toggleButton: string[];
  label: string;
  icon: string;
};

/**
 * Alias for serialized JSON strings.
 */
export type JsonString = string;
