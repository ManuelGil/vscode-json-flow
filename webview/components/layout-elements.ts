import { Position } from '@xyflow/react';
import { layoutFromMap } from 'entitree-flex';

type Direction = 'TB' | 'LR';
type OrientationType = 'vertical' | 'horizontal';

interface Coordinates {
  x: number;
  y: number;
}

interface BaseNode {
  id: string;
  name: string;
  isSpouse?: boolean;
  isSibling?: boolean;
  x?: number;
  y?: number;
  children?: string[];
  parents?: string[];
  siblings?: string[];
  spouses?: string[];
}

interface Tree extends BaseNode {
  [key: string]: any;
}

interface EntitreeNode extends BaseNode {
  x: number;
  y: number;
}

interface EntitreeEdge {
  source: BaseNode;
  target: BaseNode;
}

interface LayoutNode {
  id: string;
  type: string;
  width: number;
  height: number;
  position: Coordinates;
  sourcePosition: Position;
  targetPosition: Position;
  data: {
    label: string;
    direction: Direction;
    isRoot: boolean;
    [key: string]: any;
  };
}

interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated: boolean;
  sourceHandle: Position;
  targetHandle: Position;
}

interface EntitreeResult {
  nodes: EntitreeNode[];
  rels: EntitreeEdge[];
}

interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

// Constantes
const nodeWidth = 150;
const nodeHeight = 36;

const Orientation = {
  Vertical: 'vertical' as OrientationType,
  Horizontal: 'horizontal' as OrientationType,
};

const entitreeSettings = {
  clone: true,
  enableFlex: true,
  firstDegreeSpacing: 100,
  nextAfterAccessor: 'spouses',
  nextAfterSpacing: 100,
  nextBeforeAccessor: 'siblings',
  nextBeforeSpacing: 100,
  nodeHeight,
  nodeWidth,
  orientation: Orientation.Vertical,
  rootX: 0,
  rootY: 0,
  secondDegreeSpacing: 100,
  sourcesAccessor: 'parents',
  sourceTargetSpacing: 100,
  targetsAccessor: 'children',
};

const { Top, Bottom, Left, Right } = Position;

export const layoutElements = (
         tree: Record<string, Tree>,
             rootId: number,
             direction: Direction = 'TB'
): LayoutResult => {
  const isTreeHorizontal = direction === 'LR';

  const { nodes: entitreeNodes, rels: entitreeEdges }: EntitreeResult = layoutFromMap(
    rootId,
    tree,
    {
      ...entitreeSettings,
      orientation: isTreeHorizontal
                   ? Orientation.Horizontal
                   : Orientation.Vertical,
    }
  );

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];

  entitreeEdges.forEach((edge) => {
    const sourceNode = edge.source.id;
    const targetNode = edge.target.id;

    const newEdge: LayoutEdge = {
      id: 'e' + sourceNode + targetNode,
      source: sourceNode,
      target: targetNode,
      type: 'smoothstep',
      animated: true,
      sourceHandle: Position.Bottom,
      targetHandle: Position.Top,
    };

    const isTargetSpouse = !!edge.target.isSpouse;
    const isTargetSibling = !!edge.target.isSibling;

    if (isTargetSpouse) {
      newEdge.sourceHandle = isTreeHorizontal ? Bottom : Right;
      newEdge.targetHandle = isTreeHorizontal ? Top : Left;
    } else if (isTargetSibling) {
      newEdge.sourceHandle = isTreeHorizontal ? Top : Left;
      newEdge.targetHandle = isTreeHorizontal ? Bottom : Right;
    } else {
      newEdge.sourceHandle = isTreeHorizontal ? Right : Bottom;
      newEdge.targetHandle = isTreeHorizontal ? Left : Top;
    }

    edges.push(newEdge);
  });

  entitreeNodes.forEach((node) => {
    const newNode: LayoutNode = {
      id: node.id,
      type: 'custom',
      width: nodeWidth,
      height: nodeHeight,
      position: {
        x: node.x,
        y: node.y,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: node.name,
        direction,
        isRoot: node.id === rootId+"",
        ...node,
      },
    };

    const isSpouse = !!node.isSpouse;
    const isSibling = !!node.isSibling;

    if (isSpouse) {
      newNode.sourcePosition = isTreeHorizontal ? Bottom : Right;
      newNode.targetPosition = isTreeHorizontal ? Top : Left;
    } else if (isSibling) {
      newNode.sourcePosition = isTreeHorizontal ? Top : Left;
      newNode.targetPosition = isTreeHorizontal ? Bottom : Right;
    } else {
      newNode.sourcePosition = isTreeHorizontal ? Right : Bottom;
      newNode.targetPosition = isTreeHorizontal ? Left : Top;
    }

    nodes.push(newNode);
  });

  return { nodes, edges };
};