import { useCallback, useEffect, useState, useMemo } from 'react';
import type { Node, NodeChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';
import { generateNodes, getAllDescendants } from '@webview/helpers';
import type { TreeMap } from '@webview/types';

export function useNodeVisibility(treeData: TreeMap) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [hiddenNodes, setHiddenNodes] = useState(new Set<string>());

  const descendantsCache = useMemo(() => {
    const cache = new Map<string, string[]>();
    Object.keys(treeData).forEach((nodeId) => {
      cache.set(nodeId, getAllDescendants(nodeId, treeData));
    });
    return cache;
  }, [treeData]);

  const directChildrenCache = useMemo(() => {
    const cache = new Map<string, string[]>();
    Object.entries(treeData).forEach(([nodeId, node]) => {
      cache.set(nodeId, node.children || []);
    });
    return cache;
  }, [treeData]);

  useEffect(() => {
    if (!treeData || Object.keys(treeData).length === 0) {
      setNodes([]);
      return;
    }
    const initialNodes = generateNodes(treeData);
    setNodes(initialNodes);
  }, [treeData]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const updateNodesVisibility = useCallback(
    (
      nodes: Node[],
      nodeId: string,
      newHidden: Set<string>,
      previousVisibility?: string[],
    ) => {
      return nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          previousVisibility:
            node.id === nodeId
              ? previousVisibility
              : node.data?.previousVisibility,
        },
        hidden: newHidden.has(node.id),
      }));
    },
    [],
  );

  const toggleNodeVisibility = useCallback(
    (nodeId: string) => {
      const descendants = descendantsCache.get(nodeId) || [];
      const directChildren = directChildrenCache.get(nodeId) || [];

      setHiddenNodes((prev) => {
        const newHidden = new Set(prev);
        const anyDirectChildVisible = directChildren.some(
          (id) => !prev.has(id),
        );

        if (anyDirectChildVisible) {
          const visibilityState = descendants.filter((id) => !prev.has(id));
          descendants.forEach((id) => newHidden.add(id));

          setNodes((nodes) =>
            updateNodesVisibility(nodes, nodeId, newHidden, visibilityState),
          );
        } else {
          const previousVisibility = nodes.find((n) => n.id === nodeId)?.data
            ?.previousVisibility as string[] | undefined;

          if (previousVisibility?.length) {
            previousVisibility.forEach((id) => newHidden.delete(id));
          } else {
            directChildren.forEach((id) => newHidden.delete(id));
          }

          setNodes((nodes) =>
            updateNodesVisibility(nodes, nodeId, newHidden, undefined),
          );
        }

        return newHidden;
      });
    },
    [nodes, updateNodesVisibility, descendantsCache, directChildrenCache],
  );

  const getVisibleNodes = useMemo(() => {
    return nodes.map((node) => {
      const nodeDescendants = descendantsCache.get(node.id) || [];
      return {
        ...node,
        data: {
          ...node.data,
          onToggleChildren: toggleNodeVisibility,
          isCollapsed: nodeDescendants.some((descendantId) =>
            hiddenNodes.has(descendantId),
          ),
        },
      };
    });
  }, [nodes, hiddenNodes, toggleNodeVisibility, descendantsCache]);

  return {
    nodes: getVisibleNodes,
    setNodes,
    onNodesChange,
    hiddenNodes,
    toggleNodeVisibility,
  };
}
