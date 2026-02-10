/**
 * @file Hooks for state and layout management of the React Flow diagram in the JSON Flow webview.
 * Provides the main useFlowController hook and related types for flow state orchestration.
 */

import { layoutElements } from '@webview/services/layoutService';
import { getAllDescendants } from '@webview/services/treeService';
import type { Direction, TreeMap } from '@webview/types';
import * as logger from '@webview/utils/logger';
import type { Edge, EdgeChange, Node, NodeChange } from '@xyflow/react';
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

const directions: Direction[] = ['TB', 'RL', 'BT', 'LR'];

/**
 * Props for the useFlowController hook.
 *
 * @property treeData - The tree data as a TreeMap.
 * @property treeRootId - The root node ID of the tree.
 * @property initialDirection - (Optional) Initial layout direction.
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
  nodes: Node[];
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  currentDirection: Direction;
  rotateLayout: () => Direction;
  collapsedNodes: Set<string>;
  toggleNodeChildren: (nodeId: string) => void;
  descendantsCache: Map<string, string[]>;
};

/**
 * React hook for managing flow state, layout, and interactivity in a tree-based React Flow diagram.
 * Handles node/edge state, layout recalculation, collapsing, and rotation.
 *
 * Optimized with:
 * - Memoized layout calculations
 * - Stable function references
 * - Efficient collapsed nodes management
 * - Proper cleanup to prevent memory leaks
 *
 * @param treeData - The tree data as a TreeMap
 * @param treeRootId - The root node ID
 * @param initialDirection - (Optional) Initial layout direction
 * @returns Object containing nodes, edges, setters, and layout controls
 *
 * @example
 * const flow = useFlowController({ treeData, treeRootId });
 */
export function useFlowController({
  treeData,
  treeRootId,
  initialDirection = 'TB',
}: UseFlowControllerProps): UseFlowControllerReturn {
  const directionRef = useRef<Direction>(initialDirection);
  const [currentDirection, setCurrentDirection] =
    useState<Direction>(initialDirection);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  type CollapsedNodesAction =
    | { type: 'COLLAPSE_NODES'; payload: { nodeIds: string[] } }
    | { type: 'EXPAND_NODES'; payload: { nodeIds: string[] } }
    | { type: 'TOGGLE_NODE'; payload: { nodeId: string } }
    | { type: 'RESET'; payload: Record<string, never> };

  const collapsedNodesReducer = (
    state: Set<string>,
    action: CollapsedNodesAction,
  ): Set<string> => {
    const newState = new Set(state);

    switch (action.type) {
      case 'COLLAPSE_NODES':
        action.payload.nodeIds.forEach((id) => newState.add(id));
        return newState;
      case 'EXPAND_NODES':
        action.payload.nodeIds.forEach((id) => newState.delete(id));
        return newState;
      case 'TOGGLE_NODE':
        if (newState.has(action.payload.nodeId)) {
          newState.delete(action.payload.nodeId);
        } else {
          newState.add(action.payload.nodeId);
        }
        return newState;
      case 'RESET':
        return new Set<string>();
      default:
        return state;
    }
  };

  const [collapsedNodes, dispatchCollapsedNodesAction] = useReducer(
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

  const layout = useMemo(() => {
    if (!isValidTreeData) {
      return { nodes: [], edges: [] };
    }
    try {
      return layoutElements(treeData, treeRootId, currentDirection);
    } catch (error) {
      logger.error('Error calculating layout:', error);
      return { nodes: [], edges: [] };
    }
  }, [treeData, treeRootId, isValidTreeData, currentDirection]);

  const toggleNodeChildrenRef = useRef<(nodeId: string) => void>(() => {
    // No-op: replaced by real implementation during initialization
    void 0;
  });

  /**
   * Updates the visible nodes and edges based on the calculated layout and collapsed state.
   * Uses memoization to prevent unnecessary recalculation.
   */
  const updateVisibleElements = useCallback(() => {
    try {
      if (!layout.nodes?.length) {
        setNodes([]);
        setEdges([]);
        return;
      }

      const visibleNodes = layout.nodes.filter(
        (node) => !collapsedNodes.has(node.id),
      );

      setNodes(
        visibleNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            onToggleChildren: (nodeId: string) => {
              if (nodeId && toggleNodeChildrenRef.current) {
                toggleNodeChildrenRef.current(nodeId);
              }
            },
            isCollapsed: (descendantsCache.get(node.id) || []).some(
              (descendantId) => collapsedNodes.has(descendantId),
            ),
          },
        })),
      );

      setEdges(layout.edges);
    } catch (error) {
      logger.error('Error updating visible elements:', error);
      setNodes([]);
      setEdges([]);
    }
  }, [layout, collapsedNodes, descendantsCache]);

  useEffect(() => {
    updateVisibleElements();
    setCurrentDirection(directionRef.current);
  }, [updateVisibleElements]);

  /**
   * Cleanup effect: resets all flow state on unmount to prevent memory leaks.
   */
  useEffect(() => {
    return () => {
      setNodes([]);
      setEdges([]);
      dispatchCollapsedNodesAction({
        type: 'RESET',
        payload: {} as Record<string, never>,
      });
    };
  }, []);

  /**
   * Handler for node changes (move, select, etc).
   * Memoized to prevent recreation on each render.
   */
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      return applyNodeChanges(changes, nds);
    });
  }, []);

  /**
   * Handler for edge changes (move, select, etc).
   * Memoized to prevent recreation on each render.
   */
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => {
      return applyEdgeChanges(changes, eds);
    });
  }, []);

  /**
   * Toggles the collapsed state of a node's children.
   * Uses the descendantsCache for performance.
   */
  const toggleNodeChildren = useCallback(
    (nodeId: string) => {
      if (!nodeId || !treeData[nodeId]) {
        return;
      }

      const descendants = descendantsCache.get(nodeId) || [];
      const immediateChildren = immediateChildrenCache.get(nodeId) || [];

      const anyImmediateChildVisible = immediateChildren.some(
        (id) => !collapsedNodes.has(id),
      );

      if (anyImmediateChildVisible) {
        dispatchCollapsedNodesAction({
          type: 'COLLAPSE_NODES',
          payload: { nodeIds: descendants },
        });
      } else {
        dispatchCollapsedNodesAction({
          type: 'EXPAND_NODES',
          payload: { nodeIds: immediateChildren },
        });
      }
    },
    [descendantsCache, immediateChildrenCache, collapsedNodes, treeData],
  );

  useEffect(() => {
    toggleNodeChildrenRef.current = toggleNodeChildren;
  }, [toggleNodeChildren]);

  /**
   * Forces a layout recalculation by creating a new layout with the updated direction
   * @param newDirection - The new layout direction
   */
  const forceLayoutUpdate = useCallback(
    (newDirection: Direction) => {
      try {
        if (!isValidTreeData) {
          return;
        }

        directionRef.current = newDirection;

        setCurrentDirection(newDirection);

        const newLayout = layoutElements(treeData, treeRootId, newDirection);

        const visibleNodes = newLayout.nodes.filter(
          (node) => !collapsedNodes.has(node.id),
        );

        setNodes(
          visibleNodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              onToggleChildren: (nodeId: string) => {
                if (nodeId && toggleNodeChildrenRef.current) {
                  toggleNodeChildrenRef.current(nodeId);
                }
              },
              isCollapsed: (descendantsCache.get(node.id) || []).some(
                (descendantId) => collapsedNodes.has(descendantId),
              ),
            },
          })),
        );

        setEdges(newLayout.edges);
      } catch (error) {
        logger.error('Error forcing layout update:', error);
      }
    },
    [treeData, treeRootId, isValidTreeData, collapsedNodes, descendantsCache],
  );

  /**
   * Rotates the layout direction and forces an immediate update.
   * Returns the new direction for external state updates.
   */
  const rotateLayout = useCallback(() => {
    const currentIndex = directions.indexOf(directionRef.current);
    const nextIndex = (currentIndex + 1) % directions.length;
    const nextDirection = directions[nextIndex];

    forceLayoutUpdate(nextDirection);

    return nextDirection;
  }, [forceLayoutUpdate]);

  return {
    nodes,
    edges,
    setEdges,
    onNodesChange,
    onEdgesChange,
    currentDirection,
    rotateLayout,
    collapsedNodes,
    toggleNodeChildren,
    descendantsCache,
  };
}
