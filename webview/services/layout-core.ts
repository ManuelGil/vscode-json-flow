/**
 * Pure layout engine for transforming a TreeMap into React Flow nodes and edges.
 *
 * This module contains NO DOM dependencies (no localStorage, no window, no React).
 * layoutElementsCore() is executed exclusively inside the Web Worker.
 *
 * The main-thread {@link layoutService} wraps this core with localStorage-based
 * edge settings. The Web Worker imports this core directly.
 */

import { isHorizontal, isReversed } from '@webview/helpers/direction';
import type { Direction, TreeMap } from '@webview/types';
import { EdgeType } from '@webview/types';
import type { Edge, Node, Position } from '@xyflow/react';
import { layoutFromMap } from 'entitree-flex';

const NODE_HEIGHT = 36;
const NODE_WIDTH = 160;

/** Node count above which the O(n) linear layout replaces entitree-flex. */
const LARGE_GRAPH_THRESHOLD = 2000;

/** Horizontal spacing between siblings in the linear fallback layout (px). */
const LINEAR_SIBLING_SPACING = 200;

/** Vertical spacing between depth levels in the linear fallback layout (px). */
const LINEAR_DEPTH_SPACING = 80;

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
  children?: string[];
  siblings?: string[];
  spouses?: string[];
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
 * O(n) deterministic layout for large graphs.
 *
 * Uses a BFS traversal from the root to assign each node a depth level
 * and a sibling index within that level.  Positions are computed as
 * simple grid coordinates — no recursion, no expensive graph algorithms.
 *
 * The output shape is identical to the entitree-flex path so callers
 * (worker, main thread) are unaware of the switch.
 *
 * @param tree - The tree data as a TreeMap.
 * @param rootId - The root node ID.
 * @param direction - The layout direction.
 * @param edgeSettings - Edge appearance settings.
 * @returns An object with arrays of nodes and edges.
 */
function layoutLinearSimple(
  tree: TreeMap,
  rootId: string,
  direction: Direction,
  edgeSettings: EdgeSettings,
): { nodes: Node[]; edges: Edge[] } {
  const horizontal = isHorizontal(direction);

  // --- Pass 1: BFS to determine depth and traversal order ----------------
  const depthMap = new Map<string, number>();
  const bfsOrder: string[] = [];
  const queue: string[] = [rootId];
  depthMap.set(rootId, 0);

  // Index-based iteration avoids O(n) Array.shift() cost.
  let queueIdx = 0;
  while (queueIdx < queue.length) {
    const current = queue[queueIdx++];
    bfsOrder.push(current);

    const depth = depthMap.get(current)!;
    const entry = tree[current];
    if (!entry) {
      continue;
    }

    for (const childId of entry.children ?? []) {
      if (!depthMap.has(childId) && tree[childId]) {
        depthMap.set(childId, depth + 1);
        queue.push(childId);
      }
    }
    for (const spouseId of entry.spouses ?? []) {
      if (!depthMap.has(spouseId) && tree[spouseId]) {
        depthMap.set(spouseId, depth);
        queue.push(spouseId);
      }
    }
    for (const siblingId of entry.siblings ?? []) {
      if (!depthMap.has(siblingId) && tree[siblingId]) {
        depthMap.set(siblingId, depth);
        queue.push(siblingId);
      }
    }
  }

  // --- Pass 2: assign positions and build nodes / edges ------------------
  const depthCounters = new Map<number, number>();
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const nodeId of bfsOrder) {
    const entry = tree[nodeId];
    if (!entry) {
      continue;
    }

    const depth = depthMap.get(nodeId) ?? 0;
    const indexInDepth = depthCounters.get(depth) ?? 0;
    depthCounters.set(depth, indexInDepth + 1);

    const breadthPos = indexInDepth * LINEAR_SIBLING_SPACING;
    const depthPos = depth * LINEAR_DEPTH_SPACING;
    const posX = horizontal ? depthPos : breadthPos;
    const posY = horizontal ? breadthPos : depthPos;

    const nodeType = getNodeType(entry);
    const linearNode: EntitreeNode = {
      id: nodeId,
      name: entry.name || nodeId,
      x: posX,
      y: posY,
      isSpouse: entry.isSpouse,
      isSibling: entry.isSibling,
      children: entry.children,
      siblings: entry.siblings,
      spouses: entry.spouses,
    };

    nodes.push(createNode(linearNode, direction, nodeType, rootId, tree));

    for (const childId of entry.children ?? []) {
      if (depthMap.has(childId)) {
        const childEntry = tree[childId];
        const childType: NodeType = childEntry
          ? getNodeType(childEntry)
          : 'normal';
        edges.push(
          createEdge(nodeId, childId, direction, childType, edgeSettings),
        );
      }
    }
    for (const spouseId of entry.spouses ?? []) {
      if (depthMap.has(spouseId)) {
        edges.push(
          createEdge(nodeId, spouseId, direction, 'spouse', edgeSettings),
        );
      }
    }
    for (const siblingId of entry.siblings ?? []) {
      if (depthMap.has(siblingId)) {
        edges.push(
          createEdge(nodeId, siblingId, direction, 'sibling', edgeSettings),
        );
      }
    }
  }

  return { nodes, edges };
}

/**
 * Calculates node and edge layouts for a tree.
 *
 * For graphs with up to {@link LARGE_GRAPH_THRESHOLD} nodes the full
 * entitree-flex algorithm is used.  Larger graphs are routed to an O(n)
 * linear layout to prevent UI freezes.
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
  const nodeCount = Object.keys(tree).length;
  if (!tree || !rootId || nodeCount === 0) {
    return { nodes: [], edges: [] };
  }

  if (nodeCount > LARGE_GRAPH_THRESHOLD) {
    return layoutLinearSimple(tree, rootId, direction, edgeSettings);
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
