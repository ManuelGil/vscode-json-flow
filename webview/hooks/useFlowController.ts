/**
 * @file Hook for collapse, orientation, and descendant-cache management.
 * Layout computation is handled exclusively by the Web Worker.
 */

import { getAllDescendants } from '@webview/services/treeService';
import type { Direction, TreeMap } from '@webview/types';
import { useCallback, useMemo, useReducer, useRef, useState } from 'react';

const DIRECTIONS: Direction[] = ['TB', 'RL', 'BT', 'LR'];

/**
 * Props for the useFlowController hook.
 */
type UseFlowControllerProps = {
  treeData: TreeMap;
  treeRootId: string;
  initialDirection?: Direction;
};

/**
 * Return type for the useFlowController hook.
 */
type UseFlowControllerReturn = {
  currentDirection: Direction;
  rotateLayout: () => Direction;
  collapsedNodes: Set<string>;
  toggleNodeChildren: (nodeId: string) => void;
  descendantsCache: Map<string, string[]>;
};

type CollapsedNodesAction =
  | { type: 'COLLAPSE_NODES'; payload: { nodeIds: string[] } }
  | { type: 'EXPAND_NODES'; payload: { nodeIds: string[] } }
  | { type: 'TOGGLE_NODE'; payload: { nodeId: string } }
  | { type: 'RESET'; payload: Record<string, never> };

function collapsedNodesReducer(
  state: Set<string>,
  action: CollapsedNodesAction,
): Set<string> {
  const next = new Set(state);

  switch (action.type) {
    case 'COLLAPSE_NODES':
      action.payload.nodeIds.forEach((id) => next.add(id));
      return next;
    case 'EXPAND_NODES':
      action.payload.nodeIds.forEach((id) => next.delete(id));
      return next;
    case 'TOGGLE_NODE':
      if (next.has(action.payload.nodeId)) {
        next.delete(action.payload.nodeId);
      } else {
        next.add(action.payload.nodeId);
      }
      return next;
    case 'RESET':
      return new Set<string>();
    default:
      return state;
  }
}

/**
 * Hook for collapse state, orientation, and descendant-cache management.
 * Layout is computed exclusively by the Web Worker — this hook owns no
 * nodes/edges state.
 *
 * @param treeData - The tree data as a TreeMap
 * @param treeRootId - The root node ID
 * @param initialDirection - Initial layout direction (default 'TB')
 * @returns Collapse helpers, direction state, and descendant cache
 */
export function useFlowController({
  treeData,
  treeRootId,
  initialDirection = 'TB',
}: UseFlowControllerProps): UseFlowControllerReturn {
  const directionRef = useRef<Direction>(initialDirection);
  const [currentDirection, setCurrentDirection] =
    useState<Direction>(initialDirection);

  const [collapsedNodes, dispatchCollapsedNodes] = useReducer(
    collapsedNodesReducer,
    new Set<string>(),
  );

  const isValidTreeData = useMemo(() => {
    return !!treeData && !!treeRootId && Object.keys(treeData).length > 0;
  }, [treeData, treeRootId]);

  const descendantsCache = useMemo(() => {
    const cache = new Map<string, string[]>();
    if (isValidTreeData) {
      Object.keys(treeData).forEach((nodeId) => {
        cache.set(nodeId, getAllDescendants(nodeId, treeData));
      });
    }
    return cache;
  }, [treeData, isValidTreeData]);

  const immediateChildrenCache = useMemo(() => {
    const cache = new Map<string, string[]>();
    if (isValidTreeData) {
      Object.entries(treeData).forEach(([nodeId, node]) => {
        cache.set(nodeId, (node as { children?: string[] }).children || []);
      });
    }
    return cache;
  }, [treeData, isValidTreeData]);

  /**
   * Toggles the collapsed state of a node's children.
   */
  const toggleNodeChildren = useCallback(
    (nodeId: string) => {
      if (!nodeId || !treeData[nodeId]) {
        return;
      }

      const descendants = descendantsCache.get(nodeId) || [];
      const immediateChildren = immediateChildrenCache.get(nodeId) || [];

      const anyImmediateChildVisible = immediateChildren.some(
        (childId) => !collapsedNodes.has(childId),
      );

      if (anyImmediateChildVisible) {
        dispatchCollapsedNodes({
          type: 'COLLAPSE_NODES',
          payload: { nodeIds: descendants },
        });
      } else {
        dispatchCollapsedNodes({
          type: 'EXPAND_NODES',
          payload: { nodeIds: immediateChildren },
        });
      }
    },
    [descendantsCache, immediateChildrenCache, collapsedNodes, treeData],
  );

  /**
   * Rotates the layout direction (TB → RL → BT → LR → TB).
   * Returns the new direction so callers can propagate it to the worker.
   */
  const rotateLayout = useCallback(() => {
    const currentIndex = DIRECTIONS.indexOf(directionRef.current);
    const nextIndex = (currentIndex + 1) % DIRECTIONS.length;
    const nextDirection = DIRECTIONS[nextIndex];

    directionRef.current = nextDirection;
    setCurrentDirection(nextDirection);

    return nextDirection;
  }, []);

  return {
    currentDirection,
    rotateLayout,
    collapsedNodes,
    toggleNodeChildren,
    descendantsCache,
  };
}
