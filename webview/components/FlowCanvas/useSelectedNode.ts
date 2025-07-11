import type { Node, NodeMouseHandler } from '@xyflow/react';
import { useCallback, useState } from 'react';

/**
 * Custom hook to manage node selection state in React Flow.
 * Provides stable callbacks for selecting and clearing nodes to prevent unnecessary re-renders.
 *
 * @returns {Object} An object containing:
 *   - selectedNode: The currently selected node or null
 *   - onNodeClick: Stable callback for handling node click events
 *   - clearSelection: Stable callback to clear the current selection
 */
export function useSelectedNode() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Memoized handler to prevent recreation on each render
  const onNodeClick = useCallback<NodeMouseHandler>((_event, node) => {
    // Only update state if selecting a different node
    setSelectedNode((prevNode) => (prevNode?.id === node.id ? prevNode : node));
  }, []);

  // Memoized handler to clear selection
  const clearSelection = useCallback(() => setSelectedNode(null), []);

  return { selectedNode, onNodeClick, clearSelection };
}
