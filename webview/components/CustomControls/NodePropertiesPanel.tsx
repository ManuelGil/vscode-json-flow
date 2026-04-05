import type { Node } from '@xyflow/react';
import { PanelRight } from 'lucide-react';
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { getVscodeApi } from '../../getVscodeApi';
import {
  type NodeEditIntent,
  useNodeEditing,
} from '../../hooks/useNodeEditing';
import { useNodeProperties } from '../../hooks/useNodeProperties';
import type { IncomingVscodeMessage } from '../../services/types';
import vscodeSyncService from '../../services/vscodeSyncService';
import { Button } from '../atoms/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../molecules/Tooltip';
import { NodePropertiesContent } from './NodePropertiesContent';

type DiagnosticsState = {
  nodeId: string | null;
  warnings: Array<{ type: string; pointer: string }>;
};

const EMPTY_DIAGNOSTICS: DiagnosticsState = { nodeId: null, warnings: [] };

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
  node: Node | null;
  rootNode: Node | null;
  onClose?: () => void;
  onEditIntent?: (intent: NodeEditIntent) => void;
  onNavigatePointer?: (pointer: string) => void;
}

export const NodePropertiesPanel = memo(
  ({
    node,
    rootNode,
    onClose,
    onEditIntent,
    onNavigatePointer,
  }: NodePropertiesPanelProps) => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>(
      'idle',
    );
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [diagnostics, setDiagnostics] =
      useState<DiagnosticsState>(EMPTY_DIAGNOSTICS);
    const [editingEnabled, setEditingEnabled] = useState<boolean>(false);

    const effectiveNode = node ?? rootNode ?? null;
    const effectiveNodeId = effectiveNode?.id ?? null;

    const properties = useNodeProperties(effectiveNode);
    const handleEditIntent = useCallback(
      (intent: NodeEditIntent) => {
        try {
          const vscode = getVscodeApi();
          vscode.postMessage({ command: 'nodeEditIntent', payload: intent });
        } catch {
          // Silently ignore if VS Code API is unavailable
        }
        onEditIntent?.(intent);
      },
      [onEditIntent],
    );

    const editingState = useNodeEditing(
      effectiveNode,
      properties,
      handleEditIntent,
    );
    const pendingPathValue = properties?.pathValue ?? null;

    useEffect(() => {
      if (!effectiveNode) {
        setIsOpen(false);
      }
    }, [effectiveNode]);

    useEffect(() => {
      const handler = (message: IncomingVscodeMessage): void => {
        if (message.command === 'mutationDiagnostics') {
          if (
            typeof message.nodeId === 'string' &&
            Array.isArray(message.warnings)
          ) {
            setDiagnostics({
              nodeId: message.nodeId,
              warnings: message.warnings,
            });
          }
          return;
        }
        if (message.command === 'editingCapability') {
          setEditingEnabled(message.enabled);
          return;
        }
      };
      vscodeSyncService.subscribe(handler);
      return () => vscodeSyncService.unsubscribe(handler);
    }, []);

    useEffect(() => {
      setDiagnostics(EMPTY_DIAGNOSTICS);
    }, []);

    const resetCopyStatus = useCallback(() => {
      window.setTimeout(() => setCopyStatus('idle'), 800);
    }, []);

    const handleCopyPath = useCallback(async () => {
      if (!pendingPathValue) {
        return;
      }
      try {
        await navigator.clipboard.writeText(pendingPathValue);
        setCopyStatus('copied');
      } catch {
        setCopyStatus('error');
      } finally {
        resetCopyStatus();
      }
    }, [pendingPathValue, resetCopyStatus]);
    const handleTogglePanel = useCallback(() => {
      setIsOpen((previous) => !previous);
    }, []);

    const handleClosePanel = useCallback(() => {
      setIsOpen(false);
      onClose?.();
    }, [onClose]);

    const shouldRenderPanel = Boolean(isOpen && effectiveNode && properties);

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

    const filteredWarnings =
      diagnostics.nodeId === effectiveNodeId ? diagnostics.warnings : [];

    if (shouldRenderPanel && properties && effectiveNode) {
      panelContent = (
        <NodePropertiesContent
          displayKey={displayKey}
          properties={properties}
          editingState={editingState}
          copyStatus={copyStatus}
          onCopyPath={handleCopyPath}
          onClose={handleClosePanel}
          onNavigatePointer={onNavigatePointer}
          diagnosticWarnings={filteredWarnings}
          canEdit={editingEnabled}
        />
      );
    }

    const triggerButton = (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant={isOpen && effectiveNode ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleTogglePanel}
                aria-label="Show properties"
              >
                <PanelRight className="h-4 w-4" />
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
