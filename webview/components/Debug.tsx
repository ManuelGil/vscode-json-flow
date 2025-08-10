/**
 * Debug component for development and diagnostic purposes.
 * Displays comprehensive information about the current flow state, including node, edge, and tree data statistics.
 * Intended for use in development mode to assist with troubleshooting and state inspection.
 */

import type { Direction, TreeMap } from '@webview/types';
import { Edge, Node } from '@xyflow/react';
import { useMemo, useState } from 'react';

/**
 * Props for the {@link Debug} component.
 *
 * @property nodes - The list of nodes currently present in the graph.
 * @property edges - The list of edges currently present in the graph.
 * @property treeData - The full tree data structure backing the graph.
 * @property collapsedNodes - The set of collapsed node IDs.
 * @property direction - The current layout direction of the graph.
 */
interface DebugProps {
  nodes: Node[];
  edges: Edge[];
  treeData: TreeMap;
  collapsedNodes: Set<string>;
  direction: Direction;
}

/**
 * Renders a debug panel displaying detailed information about the current flow state.
 * This includes node and edge counts, collapsed node information, and the full tree data.
 *
 * @param nodes - The list of nodes in the graph.
 * @param edges - The list of edges in the graph.
 * @param treeData - The underlying tree data structure.
 * @param collapsedNodes - The set of currently collapsed node IDs.
 * @param direction - The current layout direction.
 * @returns The rendered debug panel as a React element.
 */
export default function Debug({
  nodes,
  edges,
  treeData,
  collapsedNodes,
  direction,
}: DebugProps) {
  const debugInfo = useMemo(
    () => ({
      flowState: {
        direction,
        totalNodes: Object.keys(treeData).length,
        visibleNodes: nodes.length,
        visibleEdges: edges.length,
        collapsedCount: collapsedNodes.size,
        collapsedNodes: Array.from(collapsedNodes),
      },
      fullTreeData: treeData,
    }),
    [nodes, edges, treeData, collapsedNodes, direction],
  );

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        left: 10,
        zIndex: 9999,
        background: 'hsl(var(--popover) / 0.9)',
        color: 'hsl(var(--popover-foreground))',
        padding: '1rem',
        fontSize: '0.85rem',
        fontFamily: 'monospace',
        maxHeight: '40vh',
        overflow: 'auto',
        borderRadius: 8,
        margin: 8,
        border: '1px solid hsl(var(--border))',
        backdropFilter: 'blur(5px)',
      }}
    >
      <JsonTree value={debugInfo} level={0} />
    </div>
  );
}

/**
 * Recursive JSON tree viewer for objects and arrays.
 * Expands/collapses nested structures for easier inspection.
 *
 * @param value - The value to display (object, array, or primitive).
 * @param level - The current nesting level (used for indentation and default expansion).
 * @param name - Optional property name to display.
 * @returns The rendered tree node as a React element.
 */
function JsonTree({
  value,
  level,
  name,
}: {
  value: unknown;
  level: number;
  name?: string;
}) {
  const [open, setOpen] = useState(level < 2); // Expand first two levels by default

  if (typeof value === 'object' && value !== null) {
    const isArray = Array.isArray(value);
    const entries = Object.entries(value);
    return (
      <div style={{ marginLeft: 16 * level }}>
        {name && <span style={{ color: 'hsl(var(--primary))' }}>{name}: </span>}
        <span
          style={{ cursor: 'pointer', color: 'hsl(var(--secondary-foreground))' }}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (isArray ? '[ ' : '{ ') : isArray ? '[...]' : '{...}'}
        </span>
        {open && (
          <div>
            {entries.length === 0 && (
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                {isArray ? 'empty array' : 'empty object'}
              </span>
            )}
            {entries.map(([k, v], idx) => (
              <JsonTree
                key={k + idx}
                value={v}
                level={level + 1}
                name={isArray ? undefined : k}
              />
            ))}
          </div>
        )}
        <span>{open ? (isArray ? ' ]' : ' }') : ''}</span>
      </div>
    );
  }
  // Render primitives
  return (
    <div style={{ marginLeft: 16 * level }}>
      {name && <span style={{ color: 'hsl(var(--primary))' }}>{name}: </span>}
      <span
        style={{
          color:
            typeof value === 'string'
              ? 'hsl(var(--primary))'
              : 'hsl(var(--foreground))',
        }}
      >
        {JSON.stringify(value)}
      </span>
    </div>
  );
}
