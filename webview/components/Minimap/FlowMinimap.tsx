// FlowMinimap: lightweight minimap using built-in interactivity
import { MiniMap, useStore } from '@xyflow/react';
import * as React from 'react';
import { useCallback, useMemo } from 'react';

interface FlowMinimapProps {
  width?: number;
  height?: number;
}

export function FlowMinimap({ width = 200, height = 150 }: FlowMinimapProps): React.ReactElement {
  const nodeCount = useStore((s) => s.nodes.length);
  const isLarge = nodeCount > 1200;

  const nodeColor = useCallback(() => 'var(--minimap-node-color, hsl(var(--foreground)))', []);
  const nodeStrokeWidth = useMemo(() => (isLarge ? 0 : 1), [isLarge]);

  return (
    <MiniMap
      id="flow-minimap"
      position="bottom-right"
      nodeColor={nodeColor}
      nodeStrokeWidth={nodeStrokeWidth}
      zoomable
      pannable
      className="border-collapse border-2 border-border bg-background"
      style={{
        borderRadius: '5px',
        width,
        height,
        pointerEvents: 'auto',
        userSelect: 'none',
        zIndex: 1001,
        cursor: 'grab',
        shapeRendering: 'crispEdges',
      }}
      aria-label="Graph minimap"
    />
  );
}

export default React.memo(FlowMinimap);
