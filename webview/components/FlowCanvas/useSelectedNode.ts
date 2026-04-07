import type { NodeMouseHandler } from '@xyflow/react';
import { useCallback, useState } from 'react';

/**
 * Custom hook to manage node selection state in React Flow.
 * Provides stable callbacks for selecting and clearing nodes to prevent unnecessary re-renders.
 *
 * @returns {Object} An object containing:
 *   - selectedNodeId: The currently selected node ID or null
 *   - onNodeClick: Stable callback for handling node click events
 *   - clearSelection: Stable callback to clear the current selection
 */
export function useSelectedNode() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Memoized handler to prevent recreation on each render
  const onNodeClick = useCallback<NodeMouseHandler>((_event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Memoized handler to clear selection
  const clearSelection = useCallback(() => setSelectedNodeId(null), []);

  // Programmatic select (for ApplyGraphSelection from VSCode)
  const selectNodeId = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  return { selectedNodeId, onNodeClick, clearSelection, selectNodeId };
}
