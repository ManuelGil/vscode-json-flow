import { Position } from '@xyflow/react';
import { layoutFromMap } from 'entitree-flex';
import {
  Direction,
  EntitreeResult,
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  Orientation,
  Tree,
  edgeStyle,
  entitreeSettings,
  nodeHeight,
  nodeWidth,
} from '../common';

const { Top, Bottom, Left, Right } = Position;

export const layoutElements = (
  tree: Record<string, Tree>,
  rootId: number,
  direction: Direction = 'TB'
): LayoutResult => {
  const isTreeHorizontal = direction === 'LR';

  const { nodes: entitreeNodes, rels: entitreeEdges }: EntitreeResult =
    layoutFromMap(rootId, tree, {
      ...entitreeSettings,
      orientation: isTreeHorizontal
        ? Orientation.Horizontal
        : Orientation.Vertical,
    });

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
      style: edgeStyle,
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
        isRoot: node.id === `${rootId}`,
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
