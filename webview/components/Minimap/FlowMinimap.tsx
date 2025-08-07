/**
 * FlowMinimap component
 *
 * Provides a miniature overview of the flow graph, especially useful
 * for large datasets where the user needs to navigate a complex visualization.
 */
import { MiniMap, useReactFlow } from '@xyflow/react';
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';

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
  width = 200,
  height = 150,
}: FlowMinimapProps): React.ReactNode {
  // Always call hooks at the top level
  const { getNodes } = useReactFlow();
  type NodeType = ReturnType<typeof getNodes>[0];
  const [_, setNodes] = useState<NodeType[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const result = typeof getNodes === 'function' ? getNodes() : [];
      setNodes(result);
    } catch {
      setError(true);
    }
  }, [getNodes]);

  // Memo the minimap style to prevent rerenders
  const minimapStyle = useMemo(
    () => ({
      borderRadius: '5px',
    }),
    [],
  );

  // Memo node colors for minimap
  const nodeColor = useMemo(
    () => (node: NodeType) => {
      // Return color based on node type or state
      return node && (node as any).selected ? 'lightblue' : 'lightgray';
    },
    [],
  );

  // Memo node className function to apply styles conditionally
  const nodeClassName = useMemo(
    () => (node: NodeType) => {
      return node && (node as any).selected ? 'stroke-primary' : 'stroke-card';
    },
    [],
  );

  if (error) {
    // Show a warning if the minimap cannot be rendered due to compatibility issues
    return (
      <div style={{ color: 'red', fontSize: 13, margin: 8 }}>
        Minimap could not be rendered due to compatibility or runtime issues.
      </div>
    );
  }

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
