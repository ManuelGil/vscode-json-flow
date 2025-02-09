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

const baseSettings = {
  nodeWidth: MIN_NODE_WIDTH,
  nodeHeight: NODE_HEIGHT,
  centerNodes: true,
  compact: true,
  siblingsMargin: spacing.firstDegreeSpacing,
  levelMargin: spacing.sourceTargetSpacing,
  mixedLayout: true,
  compactMargin: spacing.nextBeforeSpacing,
} as const;

const calculateNodeWidth = (text: string): number => {
  const textWidth = text.length * CHAR_WIDTH;
  const width = textWidth + PADDING;
  return Math.max(width, MIN_NODE_WIDTH);
};

const getPositions = (direction: Direction, type: string) => {
  const isHorz = isHorizontal(direction);
  const isRev = isReversed(direction);

  let source = Position.Bottom;
  let target = Position.Top;

  if (type === 'spouse') {
    source = isHorz ? Position.Bottom : Position.Right;
    target = isHorz ? Position.Top : Position.Left;
  } else if (type === 'sibling') {
    source = isHorz ? Position.Top : Position.Left;
    target = isHorz ? Position.Bottom : Position.Right;
  } else {
    source = isHorz ? Position.Right : Position.Bottom;
    target = isHorz ? Position.Left : Position.Top;
  }

  return { source, target };
};

const createEdge = (
  sourceId: string,
  targetId: string,
  direction: Direction,
  type: string,
): Edge => {
  const positions = getPositions(direction, type);
  return {
    id: `e${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
    sourceHandle: positions.source,
    targetHandle: positions.target,
  };
};

const getNodeType = (node: any): string => {
  if (node.isSpouse) return 'spouse';
  if (node.isSibling) return 'sibling';
  return 'default';
};

const createNode = (
  node: any,
  direction: Direction,
  type: string,
  rootId: string,
  tree: TreeMap,
): Node => {
  if (!node || !node.id) {
    console.error('Invalid node:', node);
    return {
      id: 'error',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: { label: 'Error' }
    };
  }

  const { source, target } = getPositions(direction, type);
  const position = {
    x: isReversed(direction) && isHorizontal(direction) ? -(node.x || 0) : (node.x || 0),
    y: isReversed(direction) && !isHorizontal(direction) ? -(node.y || 0) : (node.y || 0)
  };

  return {
    id: node.id,
    type: 'custom',
    position,
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
  if (!tree || !rootId || Object.keys(tree).length === 0) {
    return { nodes: [], edges: [] };
  }

  const maxNodeWidth = Math.max(
    ...Object.values(tree).map((node) => calculateNodeWidth(node.name)),
  );

  try {
    const { nodes: entitreeNodes, rels: entitreeEdges } = layoutFromMap(
      rootId,
      tree,
      {
        ...baseSettings,
        ...spacing,
        nodeWidth: maxNodeWidth,
        orientation: isHorizontal(direction) ? 'horizontal' : 'vertical',
      },
    );

    const edges = (entitreeEdges || []).map((edge) => {
      const type = getNodeType(edge.target);
      return createEdge(edge.source.id, edge.target.id, direction, type);
    });

    const nodes = (entitreeNodes || []).map((node) => {
      const type = getNodeType(node);
      return createNode(node, direction, type, rootId, tree);
    });

    return { nodes, edges };
  } catch (error) {
    console.error('Error in layoutElements:', error);
    return { nodes: [], edges: [] };
  }
};
