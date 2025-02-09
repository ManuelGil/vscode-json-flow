import { Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { layoutFromMap } from 'entitree-flex';
import type { TreeMap, Direction } from '@webview/types';
import { isHorizontal, isReversed } from '@webview/hooks';

const NODE_HEIGHT = 36;
const MIN_NODE_WIDTH = 150;
const PADDING = 32;
const CHAR_WIDTH = 8;

const spacing = {
  firstDegreeSpacing: 30,
  nextAfterSpacing: 30,
  nextBeforeSpacing: 30,
  secondDegreeSpacing: 60,
  sourceTargetSpacing: 60,
} as const;

const calculateNodeWidth = (text: string): number => {
  const textWidth = text.length * CHAR_WIDTH;
  const width = textWidth + PADDING;
  return Math.max(width, MIN_NODE_WIDTH);
};

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

interface EntitreeEdge {
  source: {
    id: string;
  };
  target: {
    id: string;
    isSpouse?: boolean;
    isSibling?: boolean;
  };
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

const getNodeType = (node: {
  isSpouse?: boolean;
  isSibling?: boolean;
}): NodeType =>
  node.isSpouse ? 'spouse' : node.isSibling ? 'sibling' : 'normal';

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

const createEdge = (
  sourceNode: string,
  targetNode: string,
  direction: Direction,
  type: NodeType,
): Edge => {
  const { source, target } = getPositions(direction, type);
  return {
    id: `e${sourceNode}${targetNode}`,
    source: sourceNode,
    target: targetNode,
    type: 'smoothstep',
    animated: true,
    sourceHandle: source,
    targetHandle: target,
  };
};

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
      x: isReversed(direction) && isHorizontal(direction) ? -node.x : node.x,
      y: isReversed(direction) && !isHorizontal(direction) ? -node.y : node.y,
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

export const layoutElements = (
  tree: TreeMap,
  rootId: string,
  direction: Direction = 'TB',
): { nodes: Node[]; edges: Edge[] } => {
  const maxNodeWidth = Math.max(
    ...Object.values(tree).map((node) => calculateNodeWidth(node.name)),
  );

  const { nodes: entitreeNodes, rels: entitreeEdges } = layoutFromMap(
    rootId,
    tree,
    {
      ...baseSettings,
      ...spacing,
      nodeWidth: maxNodeWidth,
      orientation: isHorizontal(direction)
        ? Orientation.horizontal
        : Orientation.vertical,
    },
  );

  const edges = (entitreeEdges as EntitreeEdge[]).map((edge) => {
    const type = getNodeType(edge.target);
    return createEdge(edge.source.id, edge.target.id, direction, type);
  });

  const nodes = (entitreeNodes as EntitreeNode[]).map((node) => {
    const type = getNodeType(node);
    return createNode(node, direction, type, rootId, tree);
  });

  return { nodes, edges };
};
