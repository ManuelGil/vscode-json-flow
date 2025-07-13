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
  maskOpacity = 0.6,
  width = 300,
  height = 200,
}: FlowMinimapProps): React.ReactNode {
  // Memo the minimap style to prevent rerenders
  const minimapStyle = useMemo(
    () => ({
      borderRadius: '5px',
    }),
    [],
  );

  // Memo node colors for minimap
  const nodeColor = useMemo(
    () => (node: any) => {
      // Return color based on node type or state
      return node.selected ? 'lightblue' : 'lightgray';
    },
    [],
  );

  // Memo node className function to apply styles conditionally
  const nodeClassName = useMemo(
    () => (node: any) => {
      return node.selected
        ? 'stroke-primary'
        : 'stroke-card';
    },
    [],
  );

  return (
    <MiniMap
      nodeColor={nodeColor}
      nodeStrokeWidth={5}
      zoomable
      pannable
      nodeClassName={nodeClassName}
      className="border-collapse border-2 border-border bg-background"
      style={{
        ...minimapStyle,
        opacity: maskOpacity,
        width,
        height,
      }}
    />
  );
}

export default FlowMinimap;
