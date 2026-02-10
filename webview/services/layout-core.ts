/**
 * Pure layout engine for transforming a TreeMap into React Flow nodes and edges.
 *
 * This module contains NO DOM dependencies (no localStorage, no window, no React).
 * It can safely run in both the main thread and a Web Worker.
 *
 * The main-thread {@link layoutService} wraps this core with localStorage-based
 * edge settings.  The Web Worker imports this core directly.
 */

import { isHorizontal, isReversed } from '@webview/helpers/direction';
import type { Direction, TreeMap } from '@webview/types';
import { EdgeType } from '@webview/types';
import type { Edge, Node, Position } from '@xyflow/react';
import { layoutFromMap } from 'entitree-flex';

const NODE_HEIGHT = 36;
const NODE_WIDTH = 160;

const SPACING = {
  firstDegreeSpacing: 30,
  nextAfterSpacing: 30,
  nextBeforeSpacing: 30,
  secondDegreeSpacing: 60,
  sourceTargetSpacing: 60,
} as const;

const ORIENTATION = {
  vertical: 'vertical',
  horizontal: 'horizontal',
} as const;

type OrientationType = (typeof ORIENTATION)[keyof typeof ORIENTATION];

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

type NodeType = 'spouse' | 'sibling' | 'normal';

/**
 * Edge appearance settings passed explicitly so the core remains pure.
 */
export interface EdgeSettings {
  edgeType: string;
  animated: boolean;
}

/**
 * Sensible defaults matching {@link DEFAULT_SETTINGS} in Settings.tsx.
 * Used by the worker where localStorage is unavailable.
 */
export const DEFAULT_EDGE_SETTINGS: EdgeSettings = {
  edgeType: EdgeType.SmoothStep,
  animated: true,
};

const BASE_SETTINGS: Omit<
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

// Position handle values matching @xyflow/react Position enum.
// Defined as string constants to avoid pulling the entire @xyflow/react
// runtime into the Web Worker bundle.
const Top = 'top' as const;
const Bottom = 'bottom' as const;
const Left = 'left' as const;
const Right = 'right' as const;

/**
 * Determines the type of a node (spouse, sibling, or normal) based on its properties.
 */
const getNodeType = (node: {
  isSpouse?: boolean;
  isSibling?: boolean;
}): NodeType =>
  node.isSpouse ? 'spouse' : node.isSibling ? 'sibling' : 'normal';

/**
 * Returns the source and target handle positions for a node based on direction and type.
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
 * Creates a React Flow Edge with explicit edge settings (no DOM access).
 */
const createEdge = (
  sourceNode: string,
  targetNode: string,
  direction: Direction,
  type: NodeType,
  settings: EdgeSettings,
): Edge => {
  const { source, target } = getPositions(direction, type);
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
 * Creates a React Flow Node from an EntitreeNode and layout info.
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
    sourcePosition: source as Position,
    targetPosition: target as Position,
  };
};

/**
 * Calculates node and edge layouts for a tree using entitree-flex.
 * Returns React Flow compatible arrays.
 *
 * This is the single layout engine for the entire project.
 * Both the main thread (via layoutService wrapper) and the Web Worker
 * call this function to guarantee identical output.
 *
 * @param tree - The tree data as a TreeMap.
 * @param rootId - The root node ID.
 * @param direction - The layout direction (default: 'TB').
 * @param edgeSettings - Edge appearance settings (type, animated).
 * @returns An object with arrays of nodes and edges.
 */
export function layoutElementsCore(
  tree: TreeMap,
  rootId: string,
  direction: Direction = 'TB',
  edgeSettings: EdgeSettings = DEFAULT_EDGE_SETTINGS,
): { nodes: Node[]; edges: Edge[] } {
  if (!tree || !rootId || Object.keys(tree).length === 0) {
    return { nodes: [], edges: [] };
  }

  const { nodes: entitreeNodes, rels: entitreeEdges } = layoutFromMap(
    rootId,
    tree,
    {
      ...BASE_SETTINGS,
      ...SPACING,
      nodeWidth: NODE_WIDTH,
      orientation: isHorizontal(direction)
        ? ORIENTATION.horizontal
        : ORIENTATION.vertical,
    },
  );

  if (!entitreeNodes || !Array.isArray(entitreeNodes)) {
    return { nodes: [], edges: [] };
  }

  const edges = (entitreeEdges || [])
    .map((edge) => {
      if (!edge?.source?.id || !edge?.target?.id) {
        return null;
      }
      const type = getNodeType(edge.target);
      return createEdge(
        edge.source.id,
        edge.target.id,
        direction,
        type,
        edgeSettings,
      );
    })
    .filter(Boolean) as Edge[];

  const nodes = entitreeNodes
    .map((node) => {
      if (
        !node?.id ||
        typeof node.x === 'undefined' ||
        typeof node.y === 'undefined'
      ) {
        return null;
      }
      const type = getNodeType(node);
      return createNode(node as EntitreeNode, direction, type, rootId, tree);
    })
    .filter(Boolean) as Node[];

  return { nodes, edges };
}
