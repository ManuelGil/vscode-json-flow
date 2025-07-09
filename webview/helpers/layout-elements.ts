import { Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { layoutFromMap } from 'entitree-flex';
import type { TreeMap, Direction } from '@webview/types';
import { EdgeType } from '@webview/types';
import { isHorizontal, isReversed } from './direction';
import { DEFAULT_SETTINGS } from '@webview/components/CustomControls/Settings';

const NODE_HEIGHT = 36;
const NODE_WIDTH = 160;

const spacing = {
  firstDegreeSpacing: 30,
  nextAfterSpacing: 30,
  nextBeforeSpacing: 30,
  secondDegreeSpacing: 60,
  sourceTargetSpacing: 60,
} as const;

const Orientation = {
  vertical: 'vertical',
  horizontal: 'horizontal',
} as const;

type OrientationType = (typeof Orientation)[keyof typeof Orientation];

interface EntitreeNode {
  id: string;
  name: string;
  x: number;
  y: number;
  isSpouse?: boolean;
  isSibling?: boolean;
}

interface EntitreeSettings {
  clone: boolean;
  enableFlex: boolean;
  firstDegreeSpacing: number;
  nextAfterAccessor: string;
  nextAfterSpacing: number;
  nextBeforeAccessor: string;
  nextBeforeSpacing: number;
  nodeHeight: number;
  nodeWidth: number;
  orientation: OrientationType;
  rootX: number;
  rootY: number;
  secondDegreeSpacing: number;
  sourcesAccessor: string;
  sourceTargetSpacing: number;
  targetsAccessor: string;
}

const baseSettings: Omit<
  EntitreeSettings,
  | 'orientation'
  | 'firstDegreeSpacing'
  | 'nextAfterSpacing'
  | 'nextBeforeSpacing'
  | 'secondDegreeSpacing'
  | 'sourceTargetSpacing'
  | 'nodeWidth'
> = {
  clone: true,
  enableFlex: true,
  nextAfterAccessor: 'spouses',
  nextBeforeAccessor: 'siblings',
  nodeHeight: NODE_HEIGHT,
  rootX: 0,
  rootY: 0,
  sourcesAccessor: 'parents',
  targetsAccessor: 'children',
};

const { Top, Bottom, Left, Right } = Position;

type NodeType = 'spouse' | 'sibling' | 'normal';

/**
 * Determines the type of a node (spouse, sibling, or normal) based on its properties.
 *
 * @param node - The node object to check.
 * @returns The node type as a string.
 *
 * @example
 * const type = getNodeType({ isSpouse: true }); // 'spouse'
 */
const getNodeType = (node: {
  isSpouse?: boolean;
  isSibling?: boolean;
}): NodeType =>
  node.isSpouse ? 'spouse' : node.isSibling ? 'sibling' : 'normal';

/**
 * Returns the source and target handle positions for a node based on direction and type.
 *
 * @param direction - The layout direction (TB, LR, etc.).
 * @param type - The node type ('spouse', 'sibling', 'normal').
 * @returns An object with source and target handle positions.
 *
 * @example
 * const pos = getPositions('TB', 'normal');
 */
const getPositions = (direction: Direction, type: NodeType) => {
  const positions = {
    spouse: {
      horizontal: {
        source: isReversed(direction) ? Top : Bottom,
        target: isReversed(direction) ? Bottom : Top,
      },
      vertical: {
        source: isReversed(direction) ? Left : Right,
        target: isReversed(direction) ? Right : Left,
      },
    },
    sibling: {
      horizontal: {
        source: isReversed(direction) ? Bottom : Top,
        target: isReversed(direction) ? Top : Bottom,
      },
      vertical: {
        source: isReversed(direction) ? Right : Left,
        target: isReversed(direction) ? Left : Right,
      },
    },
    normal: {
      horizontal: {
        source: isReversed(direction) ? Left : Right,
        target: isReversed(direction) ? Right : Left,
      },
      vertical: {
        source: isReversed(direction) ? Top : Bottom,
        target: isReversed(direction) ? Bottom : Top,
      },
    },
  };
  return positions[type][isHorizontal(direction) ? 'horizontal' : 'vertical'];
};

/**
 * Creates a React Flow Edge object between two nodes with proper handles and settings.
 *
 * @param sourceNode - The source node ID.
 * @param targetNode - The target node ID.
 * @param direction - The layout direction.
 * @param type - The node type for handle positioning.
 * @returns An Edge object for React Flow.
 *
 * @example
 * const edge = createEdge('a', 'b', 'TB', 'normal');
 */
const createEdge = (
  sourceNode: string,
  targetNode: string,
  direction: Direction,
  type: NodeType,
): Edge => {
  const { source, target } = getPositions(direction, type);
  const settings = localStorage.getItem('settings')
    ? JSON.parse(localStorage.getItem('settings')!)
    : DEFAULT_SETTINGS;

  return {
    id: `e${sourceNode}${targetNode}`,
    source: sourceNode,
    target: targetNode,
    type: settings.edgeType || EdgeType.SmoothStep,
    animated: settings.animated,
    sourceHandle: source,
    targetHandle: target,
  };
};

/**
 * Creates a React Flow Node object from an EntitreeNode and layout info.
 *
 * @param node - The EntitreeNode to convert.
 * @param direction - The layout direction.
 * @param type - The node type.
 * @param rootId - The root node ID.
 * @param tree - The TreeMap for additional data.
 * @returns A Node object for React Flow.
 *
 * @example
 * const node = createNode(entitreeNode, 'TB', 'normal', 'root', treeMap);
 */
const createNode = (
  node: EntitreeNode,
  direction: Direction,
  type: NodeType,
  rootId: string,
  tree: TreeMap,
): Node => {
  const { source, target } = getPositions(direction, type);
  return {
    id: node.id,
    type: 'custom',
    position: {
      x:
        isReversed(direction) && isHorizontal(direction)
          ? -(node.x || 0)
          : node.x || 0,
      y:
        isReversed(direction) && !isHorizontal(direction)
          ? -(node.y || 0)
          : node.y || 0,
    },
    data: {
      label: node.name,
      direction,
      isRoot: node.id === rootId,
      line: tree[node.id]?.data?.line,
      ...node,
    },
    sourcePosition: source,
    targetPosition: target,
  };
};

/**
 * Calculates node and edge layouts for a tree using entitree-flex and returns React Flow compatible arrays.
 *
 * @param tree - The tree data as a TreeMap.
 * @param rootId - The root node ID.
 * @param direction - The layout direction (default: 'TB').
 * @returns An object with arrays of nodes and edges.
 *
 * @example
 * const { nodes, edges } = layoutElements(tree, rootId, 'LR');
 */
export const layoutElements = (
  tree: TreeMap,
  rootId: string,
  direction: Direction = 'TB',
): { nodes: Node[]; edges: Edge[] } => {
  if (!tree || !rootId || Object.keys(tree).length === 0) {
    return { nodes: [], edges: [] };
  }

  try {
    const { nodes: entitreeNodes, rels: entitreeEdges } = layoutFromMap(
      rootId,
      tree,
      {
        ...baseSettings,
        ...spacing,
        nodeWidth: NODE_WIDTH,
        orientation: isHorizontal(direction)
          ? Orientation.horizontal
          : Orientation.vertical,
      },
    );

    if (!entitreeNodes || !Array.isArray(entitreeNodes)) {
      console.error('Invalid nodes from layoutFromMap:', entitreeNodes);
      return { nodes: [], edges: [] };
    }

    const edges = (entitreeEdges || [])
      .map((edge) => {
        if (!edge?.source?.id || !edge?.target?.id) {
          console.error('Invalid edge:', edge);
          return null;
        }
        const type = getNodeType(edge.target);
        return createEdge(edge.source.id, edge.target.id, direction, type);
      })
      .filter(Boolean) as Edge[];

    const nodes = entitreeNodes
      .map((node) => {
        if (
          !node?.id ||
          typeof node.x === 'undefined' ||
          typeof node.y === 'undefined'
        ) {
          console.error('Invalid node:', node);
          return null;
        }
        const type = getNodeType(node);
        return createNode(node as EntitreeNode, direction, type, rootId, tree);
      })
      .filter(Boolean) as Node[];

    return { nodes, edges };
  } catch (error) {
    console.error('Error in layoutElements:', error);
    return { nodes: [], edges: [] };
  }
};
