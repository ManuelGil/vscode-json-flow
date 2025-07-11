/**
 * Debug component for development mode.
 * Shows relevant information about the current flow state.
 */
import type { Direction, TreeMap } from '@webview/types';
import { Edge, Node } from '@xyflow/react';
import { useMemo, useState } from 'react';

interface DebugProps {
  nodes: Node[];
  edges: Edge[];
  treeData: TreeMap;
  collapsedNodes: Set<string>;
  direction: Direction;
}

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
        background: 'rgba(34, 34, 34, 0.9)',
        color: '#fff',
        padding: '1rem',
        fontSize: '0.85rem',
        fontFamily: 'monospace',
        maxHeight: '40vh',
        overflow: 'auto',
        borderRadius: 8,
        margin: 8,
        border: '1px solid #444',
        backdropFilter: 'blur(5px)',
      }}
    >
      <JsonTree value={debugInfo} level={0} />
    </div>
  );
}

// Recursive JSON tree viewer for objects/arrays
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
        {name && <span style={{ color: '#8ec07c' }}>{name}: </span>}
        <span
          style={{ cursor: 'pointer', color: '#fabd2f' }}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (isArray ? '[ ' : '{ ') : isArray ? '[...]' : '{...}'}
        </span>
        {open && (
          <div>
            {entries.length === 0 && (
              <span style={{ color: '#bbb' }}>
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
      {name && <span style={{ color: '#8ec07c' }}>{name}: </span>}
      <span
        style={{ color: typeof value === 'string' ? '#b8bb26' : '#83a598' }}
      >
        {JSON.stringify(value)}
      </span>
    </div>
  );
}
