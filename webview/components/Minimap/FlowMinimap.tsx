/**
 * FlowMinimap component
 *
 * Provides a miniature overview of the flow graph, especially useful
 * for large datasets where the user needs to navigate a complex visualization.
 */
import { MiniMap } from '@xyflow/react';
import * as React from 'react';
import { useMemo } from 'react';

interface FlowMinimapProps {
  /**
   * Whether to display node content in the minimap
   */
  nodeContentVisibility?: boolean;

  /**
   * Custom width for the minimap
   */
  width?: number;

  /**
   * Custom height for the minimap
   */
  height?: number;

  /**
   * Whether to mask the area outside the viewport
   */
  maskOpacity?: number;
}

/**
 * Minimap component for the flow visualization
 * Renders a small overview of the entire graph
 */
export function FlowMinimap({
  nodeContentVisibility = false,
  maskOpacity = 0.6,
}: FlowMinimapProps): React.ReactNode {
  // Memo the minimap style to prevent rerenders
  const minimapStyle = useMemo(
    () => ({
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '4px',
    }),
    [],
  );

  // Memo node colors for minimap
  const nodeColor = useMemo(
    () => (node: any) => {
      switch (node.type) {
        case 'arrayNode':
          return '#c8e6c9'; // Light green for arrays
        case 'objectNode':
          return '#bbdefb'; // Light blue for objects
        default:
          return '#e1bee7'; // Light purple for values
      }
    },
    [],
  );

  return (
    <MiniMap
      nodeColor={nodeColor}
      nodeStrokeWidth={3}
      zoomable
      pannable
      // maskOpacity and dimensions combined in style object
      style={{
        ...minimapStyle,
        opacity: maskOpacity,
      }}
      // nodeContentVisibility is not a standard prop, using maskColor instead
      maskColor={
        nodeContentVisibility
          ? `rgba(255, 255, 255, 0.2)`
          : `rgba(255, 255, 255, 0.8)`
      }
    />
  );
}

export default FlowMinimap;
