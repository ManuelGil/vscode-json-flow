import type { Node } from '@xyflow/react';
import { memo } from 'react';

/**
 * Props for the {@link NodeDetail} component.
 *
 * @property node - The selected node object, or null if no node is selected.
 * @property onClose - Optional handler for closing the node details panel.
 */
interface NodeDetailProps {
  node: Node | null;
  onClose?: () => void;
}

/**
 * NodeDetail is a memoized React component that displays detailed information about a selected node in the flow graph.
 * It presents properties such as ID, type, data, parent relationships, and targets. The component is optimized with React.memo to avoid unnecessary re-renders.
 *
 * @param node - The selected node object (or null if none is selected).
 * @param onClose - Optional handler for closing the node details panel.
 * @returns The rendered details panel, or a placeholder if no node is selected.
 */
export const NodeDetail = memo(({ node, onClose }: NodeDetailProps) => {
  // Early return when no node is selected
  if (!node) {
    return (
      <aside className="flex min-w-[260px] max-w-[400px] flex-col items-center rounded-xl border bg-gradient-to-br from-background to-muted p-6 text-muted-foreground shadow-md">
        <span className="italic">No node selected.</span>
      </aside>
    );
  }
  // Safely extract optional targetPosition if present on node
  const targetPosition = (node as unknown as { targetPosition?: unknown })
    .targetPosition;

  return (
    <aside className="min-w-[280px] max-w-[420px] rounded-xl border bg-gradient-to-br from-background to-muted p-6 shadow-lg">
      <header className="relative mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-primary">
          Node Details
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-0 top-1.5 rounded-full p-1 text-xl text-muted-foreground hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/40"
            style={{
              lineHeight: 1,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            &#10005;
          </button>
        )}
      </header>
      <section className="mb-3">
        <div className="mb-1 text-sm text-muted-foreground">ID</div>
        <div className="mb-2 break-all rounded border border-muted bg-card px-2 py-1 font-mono text-base">
          {node.id}
        </div>
        <div className="mb-1 text-sm text-muted-foreground">Type</div>
        <div className="mb-2 rounded border border-muted bg-card px-2 py-1 font-mono text-base">
          {node.type}
        </div>
      </section>
      <hr className="my-2 border-muted" />
      {node.data && (
        <section className="mb-3">
          <div className="mb-1 text-sm text-muted-foreground">Data</div>
          <pre className="overflow-x-auto rounded border border-muted bg-muted p-3 text-xs">
            {JSON.stringify(node.data, null, 2)}
          </pre>
        </section>
      )}
      {'parentId' in node && node.parentId && (
        <section className="mb-3">
          <div className="mb-1 text-sm text-muted-foreground">Parent Node</div>
          <div className="rounded border border-muted bg-card px-2 py-1 font-mono text-base">
            {node.parentId}
          </div>
        </section>
      )}
      {Array.isArray(targetPosition) && targetPosition.length > 0 && (
        <section className="mb-3">
          <div className="mb-1 text-sm text-muted-foreground">Targets</div>
          <div className="rounded border border-muted bg-card px-2 py-1 font-mono text-base">
            {targetPosition.join(', ')}
          </div>
        </section>
      )}
      {/* Add more node attributes or actions as needed */}
    </aside>
  );
});

// Export the already memoized component as default
export default NodeDetail;
