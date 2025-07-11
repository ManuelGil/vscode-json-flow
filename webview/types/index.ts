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
 * Represents a node in the tree structure.
 *
 * @property id - Unique identifier for the node.
 * @property name - Display name of the node.
 * @property parentId - ID of the parent node, if any.
 * @property children - Optional array of child node IDs.
 * @property siblings - Optional array of sibling node IDs.
 * @property spouses - Optional array of spouse node IDs.
 * @property isSpouse - Whether this node is a spouse.
 * @property isSibling - Whether this node is a sibling.
 * @property data - Optional additional data for the node.
 * @property line - Optional line number in the source JSON.
 *
 * @example
 * const node: TreeNode = {
 *   id: '1',
 *   name: 'Root',
 *   type: 'person',
 *   children: ['2', '3'],
 *   siblings: [],
 *   spouses: [],
 *   isSpouse: false,
 *   isSibling: false,
 *   data: { foo: 'bar' },
 *   line: 10
 * };
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
 * Map of tree nodes by ID. Each key is a node ID and the value is a TreeNode.
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

/**
 * Base type for JSON values
 * Replaces generic 'any' with more specific type information
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonArray
  | JsonObject;

/**
 * Type for JSON objects
 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * Type for JSON arrays
 */
export type JsonArray = JsonValue[];

/**
 * Interface for a node in the JSON tree
 * Used for rendering in the flow visualization
 */
export interface JsonNode {
  key: string;
  value: JsonValue;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
}

