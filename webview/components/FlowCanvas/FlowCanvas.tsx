import {
  CustomControls,
  CustomNode,
  FlowMinimap,
  Loading,
} from '@webview/components';
import { DEFAULT_SETTINGS } from '@webview/components/CustomControls/Settings';
import { flowReducer } from '@webview/context/FlowContext';
import { generateTree, getRootId } from '@webview/helpers/generateTree';
import { useFlowController, useLayoutWorker } from '@webview/hooks';
import { useEditorSync } from '@webview/hooks/useEditorSync';
import { useFlowSettings } from '@webview/hooks/useFlowSettings';
import { useTreeDataValidator } from '@webview/hooks/useTreeDataValidator';
import { useVscodeMessageHandler } from '@webview/hooks/useVscodeMessageHandler';
import { vscodeService } from '@webview/services/vscodeService';
import type { Direction, TreeMap } from '@webview/types';
import type {
  Connection,
  Edge,
  EdgeChange,
  InternalNode,
  Node,
  NodeChange,
  ReactFlowInstance,
} from '@xyflow/react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  useViewport,
} from '@xyflow/react';
import type { MouseEvent } from 'react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useSelectedNode } from './useSelectedNode';

/**
 * Snapshot of edge appearance settings for re-application after worker sync.
 */
const GLOBAL_EDGE_COLOR: string = 'hsl(var(--muted-foreground))';

/** Stable empty array to avoid new references when edges are deferred. */
const EMPTY_EDGES: Edge[] = [];

const BASE_GAP = 50;

/** Debounce interval (ms) for worker invocations during rapid Live Sync updates. */
const WORKER_DEBOUNCE_MS = 80;

/** Pre-allocated background style objects to preserve referential equality. */
const BG_STYLE_DOTS: React.CSSProperties = {};
const BG_STYLE_OTHER: React.CSSProperties = { strokeOpacity: 0.3 };

/** Pre-allocated overlay style objects to preserve referential equality. */
const OVERLAY_PAUSE_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 300,
  pointerEvents: 'none',
};
const OVERLAY_PAUSE_INNER_STYLE: React.CSSProperties = {
  pointerEvents: 'none',
};
const OVERLAY_LOADING_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 200,
  pointerEvents: 'none',
};

interface EdgeSettingsSnapshot {
  edgeType: string;
  animated: boolean;
  hasArrow: boolean;
}

/**
 * Applies edge appearance settings to a list of edges.
 * Pure function used both for immediate settings changes and worker sync re-application.
 */
function applyEdgeSettingsToList(
  edgeList: Edge[],
  snapshot: EdgeSettingsSnapshot,
): Edge[] {
  return edgeList.map((edge) => ({
    ...edge,
    type: snapshot.edgeType || DEFAULT_SETTINGS.edgeType,
    animated: snapshot.animated,
    markerEnd: snapshot.hasArrow
      ? { type: MarkerType.ArrowClosed, width: 20, height: 20 }
      : undefined,
  }));
}

export const FlowCanvas = memo(function FlowCanvas() {
  const initialFlowState = useMemo(() => {
    const st = vscodeService.getStateOrDefaults();
    return {
      data: st.data,
      treeData: st.data ? generateTree(st.data) : {},
      orientation: st.orientation,
      path: st.path,
      fileName: st.fileName,
    };
  }, []);

  const [flowData, dispatch] = useReducer(flowReducer, initialFlowState);

  const { safeTreeData, isValidTree } = useTreeDataValidator(flowData.treeData);

  useVscodeMessageHandler(dispatch);

  const [isDraggable, setIsDraggable] = useState(true);

  const lastDataRef = useRef<unknown>(null);
  const lastDirectionRef = useRef(flowData.orientation);
  const workerDebounceRef = useRef<number | undefined>(undefined);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  // Unified render state: post-processed with collapse filtering and callbacks
  const [renderNodes, setRenderNodes] = useState<Node[]>([]);
  const [renderEdges, setRenderEdges] = useState<Edge[]>([]);

  // Search match IDs for highlighting matched nodes
  const [searchMatchIds, setSearchMatchIds] = useState<Set<string>>(
    () => new Set<string>(),
  );

  // Counter to trigger render-sync re-application when edge settings change
  const [edgeSettingsVersion, setEdgeSettingsVersion] = useState<number>(0);

  const settings = useMemo(() => {
    return localStorage.getItem('settings')
      ? JSON.parse(localStorage.getItem('settings')!)
      : DEFAULT_SETTINGS;
  }, []);

  const [backgroundVariant, setBackgroundVariant] = useState<BackgroundVariant>(
    settings.backgroundVariant ?? DEFAULT_SETTINGS.backgroundVariant,
  );

  const edgeSettingsRef = useRef<EdgeSettingsSnapshot>({
    edgeType: settings.edgeType ?? DEFAULT_SETTINGS.edgeType,
    animated: settings.animated ?? DEFAULT_SETTINGS.animated,
    hasArrow: settings.hasArrow ?? false,
  });

  const flowControllerParams = useMemo(
    () => ({
      treeData: safeTreeData as TreeMap,
      treeRootId: getRootId(safeTreeData as TreeMap),
      initialDirection: flowData.orientation,
    }),
    [safeTreeData, flowData.orientation],
  );

  const {
    currentDirection,
    rotateLayout,
    collapsedNodes,
    toggleNodeChildren,
    descendantsCache,
  } = useFlowController(flowControllerParams);

  const { zoom } = useViewport();

  const { selectedNode, onNodeClick, selectNode } = useSelectedNode();

  const onDirectionChange = useCallback(
    (direction: Direction) => {
      dispatch({
        type: 'SET_ORIENTATION',
        payload: { orientation: direction },
      });
    },
    [dispatch],
  );

  const { handleRotation, handleEdgeSettingsChange } = useFlowSettings(
    rotateLayout,
    flowData,
    setRenderEdges,
    onDirectionChange,
  );

  // Debounce heavy settings updates to avoid rapid recomputation/edge updates
  const settingsChangeTimerRef = useRef<number | undefined>(undefined);
  const debouncedHandleEdgeSettingsChange = useCallback(
    (next: Parameters<typeof handleEdgeSettingsChange>[0]) => {
      // Capture edge settings immediately for re-application after worker sync
      edgeSettingsRef.current = {
        edgeType: next.edgeType ?? DEFAULT_SETTINGS.edgeType,
        animated: next.animated ?? DEFAULT_SETTINGS.animated,
        hasArrow: next.hasArrow ?? false,
      };
      setEdgeSettingsVersion((prev) => prev + 1);
      // Update background variant immediately (no debounce needed for UI)
      if (next.backgroundVariant) {
        setBackgroundVariant(next.backgroundVariant);
      }
      if (settingsChangeTimerRef.current) {
        window.clearTimeout(settingsChangeTimerRef.current);
      }
      settingsChangeTimerRef.current = window.setTimeout(() => {
        handleEdgeSettingsChange(next);
      }, 150);
    },
    [handleEdgeSettingsChange],
  );
  useEffect(() => {
    return () => {
      if (settingsChangeTimerRef.current) {
        window.clearTimeout(settingsChangeTimerRef.current);
      }
    };
  }, []);

  const onConnect = useCallback(
    (params: Connection) =>
      setRenderEdges((eds: Edge[]) => addEdge(params, eds)),
    [],
  );

  const dynamicGap = useMemo(() => BASE_GAP / zoom, [zoom]);

  const reactFlowProps = useMemo(
    () => ({
      fitView: true,
      nodeTypes,
      elementsSelectable: isDraggable,
      proOptions: { hideAttribution: true },
      minZoom: 0.1,
      maxZoom: 1.5,
    }),
    [nodeTypes, isDraggable],
  );

  const backgroundProps = useMemo(
    () => ({
      gap: dynamicGap,
      variant: backgroundVariant as BackgroundVariant,
      style:
        backgroundVariant === BackgroundVariant.Dots
          ? BG_STYLE_DOTS
          : BG_STYLE_OTHER,
      className: 'bg-background',
      patternClassName: '!stroke-foreground/30',
    }),
    [dynamicGap, backgroundVariant],
  );

  const onNodeDoubleClick = useCallback(
    (event: MouseEvent, node: Node) => {
      event.preventDefault();
      onNodeClick(event, node);
    },
    [onNodeClick],
  );

  const {
    processData: processWithWorker,
    isProcessing: isWorkerProcessing,
    progress: workerProgress,
    nodes: workerNodes,
    edges: workerEdges,
  } = useLayoutWorker();

  const controlsProps = useMemo(
    () => ({
      isDraggable,
      setIsDraggable,
      currentDirection,
      onLayoutRotate: handleRotation,
      onSettingsChange: debouncedHandleEdgeSettingsChange,
      nodes: renderNodes as InternalNode[],
      allNodes: (workerNodes ?? []) as InternalNode[],
      onSearchMatchChange: (next: Set<string>) => {
        setSearchMatchIds((prev) => {
          if (prev.size === next.size) {
            let equal = true;
            for (const v of prev) {
              if (!next.has(v)) {
                equal = false;
                break;
              }
            }
            if (equal) return prev;
          }
          return next;
        });
      },
    }),
    [
      isDraggable,
      currentDirection,
      handleRotation,
      debouncedHandleEdgeSettingsChange,
      renderNodes,
      workerNodes,
    ],
  );

  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [graphReady, setGraphReady] = useState(false);
  // Ensure we don't call fitView repeatedly during incremental updates
  const didFitViewRef = useRef(false);
  // Run fitView only once after processing completes and the graph is ready
  useEffect(() => {
    if (
      !isWorkerProcessing &&
      graphReady &&
      workerNodes &&
      workerNodes.length > 0 &&
      reactFlowInstanceRef.current &&
      !didFitViewRef.current
    ) {
      requestAnimationFrame(() => {
        try {
          reactFlowInstanceRef.current?.fitView({
            padding: 0.2,
            includeHiddenNodes: true,
          });
        } catch {
          // Swallowed: fitView may fail when nodes are not yet rendered
        }
        didFitViewRef.current = true;
      });
    }
  }, [isWorkerProcessing, graphReady, workerNodes]);
  useEffect(() => {
    if (!isWorkerProcessing) {
      requestAnimationFrame(() => {
        const count = document.querySelectorAll('.react-flow__node').length;
        if (count > 0) {
          setGraphReady(true);
        }
      });
    }
  }, [isWorkerProcessing]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (workerDebounceRef.current != null) {
        window.clearTimeout(workerDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const jsonData = flowData.data;
    if (!jsonData || !isValidTree) {
      return;
    }

    if (
      lastDataRef.current === jsonData &&
      lastDirectionRef.current === flowData.orientation
    ) {
      return;
    }

    // At least one input changed — reset graph readiness immediately
    setGraphReady(false);
    didFitViewRef.current = false;

    lastDataRef.current = jsonData;
    lastDirectionRef.current = flowData.orientation;

    // Debounce worker invocation to coalesce rapid Live Sync updates.
    // The graph reset above gives instant visual feedback while the
    // debounce prevents firing the worker on every keystroke.
    if (workerDebounceRef.current != null) {
      window.clearTimeout(workerDebounceRef.current);
    }
    const direction = flowData.orientation;
    workerDebounceRef.current = window.setTimeout(() => {
      workerDebounceRef.current = undefined;
      processWithWorker(jsonData, { direction });
    }, WORKER_DEBOUNCE_MS);
  }, [flowData.data, flowData.orientation, isValidTree, processWithWorker]);

  // Stable ref for toggleNodeChildren to avoid re-creating callbacks
  const toggleChildrenRef =
    useRef<(nodeId: string) => void>(toggleNodeChildren);
  useEffect(() => {
    toggleChildrenRef.current = toggleNodeChildren;
  }, [toggleNodeChildren]);

  // Named delegate so CustomNode receives a stable function reference
  const handleToggleChildren = useCallback((nodeId: string) => {
    if (nodeId) {
      toggleChildrenRef.current(nodeId);
    }
  }, []);

  // Sync render state when layout source or collapse state changes
  useEffect(() => {
    const sourceNodes = workerNodes ?? [];
    const sourceEdges = workerEdges ?? [];

    if (!sourceNodes?.length) {
      setRenderNodes([]);
      setRenderEdges([]);
      return;
    }

    const visibleNodes = sourceNodes.filter(
      (node) => !collapsedNodes.has(node.id),
    );

    setRenderNodes(
      visibleNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onToggleChildren: handleToggleChildren,
          isCollapsed: (descendantsCache.get(node.id) ?? []).some(
            (descendantId) => collapsedNodes.has(descendantId),
          ),
          isSearchMatch: searchMatchIds.has(node.id),
        },
      })),
    );

    const filteredEdges = (sourceEdges ?? []).filter(
      (edge) =>
        !collapsedNodes.has(edge.source) && !collapsedNodes.has(edge.target),
    );
    setRenderEdges(
      applyEdgeSettingsToList(filteredEdges, edgeSettingsRef.current),
    );
  }, [
    workerNodes,
    workerEdges,
    collapsedNodes,
    descendantsCache,
    handleToggleChildren,
    searchMatchIds,
    edgeSettingsVersion,
  ]);

  // Unified change handlers for ReactFlow interactivity (drag, select)
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setRenderNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setRenderEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // Keep a ref so the stable Live Sync callback always sees the latest nodes
  const finalNodesRef = useRef<Node[]>([]);
  finalNodesRef.current = renderNodes;

  // Stable callback: depends only on selectNode (itself stable from useCallback)
  const handleApplyGraphSelection = useCallback(
    (nodeId?: string) => {
      if (!nodeId) {
        selectNode(null);
        return;
      }
      const target =
        (finalNodesRef.current || []).find((n: Node) => n.id === nodeId) ||
        null;
      selectNode(target);
      // Center viewport on the selected node so it is visible
      if (target?.position && reactFlowInstanceRef.current) {
        const centerX = target.position.x + (target.width ?? 0) / 2;
        const centerY = target.position.y + (target.height ?? 0) / 2;
        try {
          reactFlowInstanceRef.current.setCenter(centerX, centerY, {
            zoom: 1.2,
            duration: 500,
          });
        } catch {
          // Swallowed: setCenter may fail if the viewport is not ready
        }
      }
    },
    [selectNode],
  );

  // Live Sync: wire selection synchronization (Phase 1)
  const { paused: liveSyncPaused, pauseReason } = useEditorSync({
    selectedNodeId: selectedNode?.id ?? null,
    onApplyGraphSelection: handleApplyGraphSelection,
    path: flowData.path,
  });
  const handleReactFlowInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstanceRef.current = instance;
    try {
      instance.fitView({ padding: 0.2, includeHiddenNodes: true });
    } catch {
      // Swallowed: fitView may fail during initial render
    }
    // Ensure the graph is ready after initial render
    requestAnimationFrame(() => {
      const count = document.querySelectorAll('.react-flow__node').length;
      if (count > 0) {
        setGraphReady(true);
      }
    });
  }, []);

  const defaultEdgeOptions = useMemo(() => {
    return {
      style: { stroke: GLOBAL_EDGE_COLOR },
    };
  }, []);

  // Render-only virtualization: defer edges until the graph is ready
  const renderedEdges = graphReady ? renderEdges : EMPTY_EDGES;
  const reactFlowKey = useMemo(() => {
    return `${currentDirection}:${flowData.data ? 'loaded' : 'empty'}`;
  }, [currentDirection, flowData.data]);

  if (!workerNodes && isValidTree) {
    return <Loading />;
  }

  return (
    <div className="relative h-screen w-screen">
      <ReactFlow
        key={reactFlowKey}
        nodes={renderNodes}
        edges={renderedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodesDraggable={graphReady && isDraggable}
        nodesConnectable={graphReady && isDraggable}
        onInit={handleReactFlowInit}
        defaultEdgeOptions={defaultEdgeOptions}
        {...reactFlowProps}
      >
        <CustomControls {...controlsProps} />
        <Background {...backgroundProps} />
        {graphReady && !isWorkerProcessing && <FlowMinimap />}
      </ReactFlow>
      {liveSyncPaused && (
        <div style={OVERLAY_PAUSE_STYLE}>
          <div
            className="mx-auto mt-2 w-fit max-w-[90%] rounded bg-yellow-100 px-3 py-1 text-yellow-900 shadow"
            style={OVERLAY_PAUSE_INNER_STYLE}
            title={pauseReason || 'Live Sync paused'}
          >
            <strong>Live Sync paused</strong>
            {pauseReason ? `: ${pauseReason}` : ''}
          </div>
        </div>
      )}
      {isWorkerProcessing && (
        <div style={OVERLAY_LOADING_STYLE}>
          <Loading progress={workerProgress} />
        </div>
      )}
    </div>
  );
});
