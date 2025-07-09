/**
 * @file Hooks for state and layout management of the React Flow diagram in the JSON Flow webview.
 * Provides the main useFlowController hook and related types for flow state orchestration.
 */
import type { Edge, EdgeChange, Node, NodeChange } from '@xyflow/react';
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAllDescendants, layoutElements } from '@webview/helpers';
import type { Direction, TreeMap } from '@webview/types';

const directions: Direction[] = ['TB', 'RL', 'BT', 'LR'];

/**
 * Props for the useFlowController hook.
 *
 * @property treeData - The tree data as a TreeMap.
 * @property treeRootId - The root node ID of the tree.
 * @property initialDirection - (Optional) Initial layout direction.
 */
interface UseFlowControllerProps {
  treeData: TreeMap;
  treeRootId: string;
  initialDirection?: Direction;
}

/**
 * React hook for managing flow state, layout, and interactivity in a tree-based React Flow diagram.
 * Handles node/edge state, layout recalculation, collapsing, and rotation.
 *
 * @param treeData - The tree data as a TreeMap.
 * @param treeRootId - The root node ID.
 * @param initialDirection - (Optional) Initial layout direction.
 * @returns Object containing nodes, edges, setters, and layout controls.
 *
 * @example
 * const flow = useFlowController({ treeData, treeRootId });
 */
export function useFlowController({
  treeData,
  treeRootId,
  initialDirection = 'TB',
}: UseFlowControllerProps) {
  const [currentDirection, setCurrentDirection] =
    useState<Direction>(initialDirection);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set<string>());

  const descendantsCache = useMemo(() => {
    const cache = new Map<string, string[]>();
    Object.keys(treeData).forEach((nodeId) => {
      cache.set(nodeId, getAllDescendants(nodeId, treeData));
    });
    return cache;
  }, [treeData]);

  const immediateChildrenCache = useMemo(() => {
    const cache = new Map<string, string[]>();
    Object.entries(treeData).forEach(([nodeId, node]) => {
      cache.set(nodeId, (node as { children?: string[] }).children || []);
    });
    return cache;
  }, [treeData]);

  const recalculateLayout = useCallback(
    (direction: Direction, collapsed: Set<string>) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
        treeData,
        treeRootId,
        direction,
      );

      const visibleNodes = layoutedNodes.filter(
        (node) => !collapsed.has(node.id),
      );

      setNodes(
        visibleNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            onToggleChildren: toggleNodeChildren,
            isCollapsed: (descendantsCache.get(node.id) || []).some(
              (descendantId) => collapsed.has(descendantId),
            ),
          },
        })),
      );
      setEdges(layoutedEdges);
      setCurrentDirection(direction);
    },
    [treeData, treeRootId, descendantsCache],
  );

  // Effect: recalculates layout when initialDirection or recalculateLayout changes.
  // If you add event listeners, subscriptions, or async effects here in the future,
  // return a cleanup function to avoid memory leaks.
  useEffect(() => {
    recalculateLayout(initialDirection, collapsedNodes);
    // Cleanup placeholder for future side effects (e.g., event listeners)
    return () => {
      // Example: window.removeEventListener(...)
      // No cleanup needed at present.
    };
  }, [initialDirection, recalculateLayout]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const toggleNodeChildren = useCallback(
    (nodeId: string) => {
      const descendants = descendantsCache.get(nodeId) || [];
      const immediateChildren = immediateChildrenCache.get(nodeId) || [];

      setCollapsedNodes((prev) => {
        const newCollapsed = new Set(prev);
        const anyImmediateChildVisible = immediateChildren.some(
          (id) => !prev.has(id),
        );

        if (anyImmediateChildVisible) {
          descendants.forEach((id) => newCollapsed.add(id));
        } else {
          immediateChildren.forEach((id) => newCollapsed.delete(id));
        }

        recalculateLayout(currentDirection, newCollapsed);
        return newCollapsed;
      });
    },
    [
      descendantsCache,
      immediateChildrenCache,
      currentDirection,
      recalculateLayout,
    ],
  );

  const rotateLayout = useCallback(() => {
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = (currentIndex + 1) % directions.length;
    const nextDirection = directions[nextIndex];

    recalculateLayout(nextDirection, collapsedNodes);
    return nextDirection;
  }, [currentDirection, collapsedNodes, recalculateLayout]);

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
  };
}
