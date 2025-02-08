import { useCallback, useState, useEffect } from 'react';
import { useEdgesState } from '@xyflow/react';
import { layoutElements } from '@webview/helpers';
import type { TreeMap, Direction } from '@webview/types';
import type { Edge } from '@xyflow/react';

const directions: Direction[] = ['TB', 'RL', 'BT', 'LR'];

export const isHorizontal = (direction: Direction) =>
  direction === 'LR' || direction === 'RL';
export const isReversed = (direction: Direction) =>
  direction === 'BT' || direction === 'RL';

interface UseLayoutOrientationProps {
  treeData: TreeMap;
  treeRootId: string;
  initialDirection?: Direction;
}

export function useLayoutOrientation({
  treeData,
  treeRootId,
  initialDirection = 'TB',
}: UseLayoutOrientationProps) {
  const [currentDirection, setCurrentDirection] =
    useState<Direction>(initialDirection);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  useEffect(() => {
    const { edges: newEdges } = layoutElements(
      treeData,
      treeRootId,
      currentDirection,
    );
    setEdges(newEdges);
  }, [treeData, treeRootId, currentDirection, setEdges]);

  const rotateLayout = useCallback(
    (hiddenNodes: Set<string>) => {
      const currentIndex = directions.indexOf(currentDirection);
      const nextIndex = (currentIndex + 1) % directions.length;
      const nextDirection = directions[nextIndex];
      setCurrentDirection(nextDirection);

      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
        treeData,
        treeRootId,
        nextDirection,
      );

      const visibleNodes = layoutedNodes.filter(
        (node) => !hiddenNodes.has(node.id),
      );

      return {
        nodes: visibleNodes,
        edges: layoutedEdges,
      };
    },
    [currentDirection, treeData, treeRootId],
  );

  return {
    edges,
    setEdges,
    onEdgesChange,
    currentDirection,
    rotateLayout,
  };
}
