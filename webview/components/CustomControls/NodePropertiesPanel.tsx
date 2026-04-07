import { Button } from '@webview/components/atoms/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@webview/components/molecules/Tooltip';
import { useNodeProperties } from '@webview/hooks/useNodeProperties';
import type { InternalNode, Node } from '@xyflow/react';
import { PanelRight } from 'lucide-react';
import { memo, type ReactNode, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NodePropertiesContent } from './NodePropertiesContent';

/**
 * NodePropertiesPanel is a pure UI inspector that presents JSON node details.
 *
 * Data flow: React Flow Node → NodePropertiesViewModel → panel sections. The
 * view model is the only data source; do not re-derive properties from labels
 * or mutate graph state. Core JSON properties (pointer, key, type, value) are
 * always visible while contextual metadata (parent pointer, child count,
 * container status) lives in the Metadata section. Internal/editor integration
 * fields such as line numbers stay hidden unless an explicit editor feature
 * opts in. The panel must not talk to workers, mutate the graph, or break its
 * use as a floating overlay inside FlowCanvas.
 */

interface NodePropertiesPanelProps {
  selectedNodeId: string | null;
  node: Node | null;
  rootNode: Node | null;
  allNodes?: InternalNode[];
  canEdit: boolean;
  languageId: string;
  onClose?: () => void;
  onFocusNode?: (nodeId: string) => void;
}

export const NodePropertiesPanel = memo(
  ({
    selectedNodeId,
    node,
    rootNode,
    allNodes,
    canEdit,
    languageId,
    onClose,
    onFocusNode,
  }: NodePropertiesPanelProps) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const effectiveNode = node ?? null;

    const properties = useNodeProperties(effectiveNode);

    const handleTogglePanel = useCallback(() => {
      setIsOpen((previous) => !previous);
    }, []);

    const handleClosePanel = useCallback(() => {
      setIsOpen(false);
      onClose?.();
    }, [onClose]);

    const shouldRenderPanel = Boolean(isOpen && selectedNodeId);

    const displayKey = useMemo(() => {
      if (!properties || !effectiveNode) {
        return '';
      }
      const baseKey = properties.details?.key || properties.pathValue || '/';
      const isRoot =
        effectiveNode && rootNode && effectiveNode.id === rootNode.id;
      return isRoot ? 'root' : baseKey;
    }, [properties, effectiveNode, rootNode]);

    let panelContent: ReactNode = null;

    if (shouldRenderPanel && properties && effectiveNode) {
      panelContent = (
        <NodePropertiesContent
          displayKey={displayKey}
          properties={properties}
          allNodes={allNodes}
          onClose={handleClosePanel}
          canEdit={canEdit}
          languageId={languageId}
          onFocusNode={onFocusNode}
        />
      );
    } else if (shouldRenderPanel) {
      panelContent = (
        <aside className="flex w-[360px] flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            Node Properties
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Waiting for selected node data...
          </p>
        </aside>
      );
    }

    const triggerButton = (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant={isOpen && selectedNodeId ? 'secondary' : 'outline'}
                onClick={handleTogglePanel}
                aria-label="Show properties"
              >
                <PanelRight />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Show properties</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    const overlayRoot =
      typeof document !== 'undefined'
        ? document.getElementById('flow-canvas-root')
        : null;

    const overlay =
      panelContent && overlayRoot
        ? createPortal(
            <div className="pointer-events-none absolute right-4 top-4 z-20">
              <div className="pointer-events-auto">{panelContent}</div>
            </div>,
            overlayRoot,
          )
        : null;

    return (
      <>
        {triggerButton}
        {overlay}
      </>
    );
  },
);

NodePropertiesPanel.displayName = 'NodePropertiesPanel';
