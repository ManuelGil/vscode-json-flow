import { GRAPH_ROOT_ID } from '@src/shared/graph-identity';
import {
  CustomControls,
  CustomNode,
  FlowMinimap,
  Loading,
} from '@webview/components';
import {
  type BackgroundMode,
  DEFAULT_SETTINGS,
} from '@webview/components/CustomControls/Settings';
import { useSelectedNode } from '@webview/components/FlowCanvas/useSelectedNode';
import { flowReducer } from '@webview/context/FlowContext';
import { getVscodeApi } from '@webview/getVscodeApi';
import { adaptTreeToGraph } from '@webview/helpers/adaptTreeToGraph';
import { generateTree, getRootId } from '@webview/helpers/generateTree';
import {
  useFlowController,
  useLayoutWorker,
  useSearchProjection,
} from '@webview/hooks';
import { useEditorSync } from '@webview/hooks/useEditorSync';
import { useFlowSettings } from '@webview/hooks/useFlowSettings';
import { useTreeDataValidator } from '@webview/hooks/useTreeDataValidator';
import { useVscodeMessageHandler } from '@webview/hooks/useVscodeMessageHandler';
import {
  buildParentMap,
  collectAncestors,
  computeNodesWithCollapsedDescendants,
} from '@webview/services/treeService';
import { vscodeService } from '@webview/services/vscodeService';
import type { Direction, SearchProjectionMode, TreeMap } from '@webview/types';
import { detectInconsistentPaths } from '@webview/utils/detectInconsistentPaths';
import { focusNode, safeFitView } from '@webview/utils/viewport';
import type {
  Connection,
  Edge,
  EdgeChange,
  InternalNode,
  Node,
  NodeChange,
  NodeMouseHandler,
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

/**
 * Snapshot of edge appearance settings for re-application after worker sync.
 */
const GLOBAL_EDGE_COLOR: string = 'hsl(var(--muted-foreground))';

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
    const treeData = st.data ? generateTree(st.data) : {};
    const graphData = st.data ? adaptTreeToGraph(treeData) : null;
    return {
      data: st.data,
      treeData,
      graphData,
      orientation: st.orientation,
      path: st.path,
      fileName: st.fileName,
      languageId: st.languageId,
      canEdit: st.canEdit,
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
  const finalNodesRef = useRef<Node[]>([]);
  finalNodesRef.current = renderNodes;
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const lastFileRef = useRef<string | null>(null);

  // Search match IDs for highlighting matched nodes
  const [searchMatchIds, setSearchMatchIds] = useState<Set<string>>(
    () => new Set<string>(),
  );

  // Search projection mode: controls visibility of non-matching nodes
  const [searchProjectionMode, setSearchProjectionMode] =
    useState<SearchProjectionMode>('highlight');

  // Counter to trigger render-sync re-application when edge settings change
  const [_edgeSettingsVersion, setEdgeSettingsVersion] = useState<number>(0);

  const settings = useMemo(() => {
    return localStorage.getItem('settings')
      ? JSON.parse(localStorage.getItem('settings')!)
      : DEFAULT_SETTINGS;
  }, []);

  const [backgroundVariant, setBackgroundVariant] = useState<BackgroundMode>(
    settings.backgroundVariant ?? DEFAULT_SETTINGS.backgroundVariant,
  );

  const edgeSettingsRef = useRef<EdgeSettingsSnapshot>({
    edgeType: settings.edgeType ?? DEFAULT_SETTINGS.edgeType,
    animated: settings.animated ?? DEFAULT_SETTINGS.animated,
    hasArrow: settings.hasArrow ?? false,
  });

  const rootNodeId = useMemo(
    () => getRootId(safeTreeData as TreeMap),
    [safeTreeData],
  );

  const flowControllerParams = useMemo(
    () => ({
      treeData: safeTreeData as TreeMap,
      treeRootId: rootNodeId,
      initialDirection: flowData.orientation,
    }),
    [safeTreeData, flowData.orientation, rootNodeId],
  );

  const { currentDirection, rotateLayout, collapsedNodes, toggleNodeChildren } =
    useFlowController(flowControllerParams);

  const { zoom } = useViewport();

  const { selectedNode, selectNode } = useSelectedNode();
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null,
  );
  const highlightTimeoutRef = useRef<number | null>(null);
  const highlightDurationMsRef = useRef<number>(800);

  // Clear selection if the selected node becomes hidden due to collapse
  useEffect(() => {
    if (selectedNode && collapsedNodes.has(selectedNode.id)) {
      selectNode(null);
    }
  }, [selectedNode, collapsedNodes, selectNode]);

  const onDirectionChange = useCallback((direction: Direction) => {
    dispatch({
      type: 'SET_ORIENTATION',
      payload: { orientation: direction },
    });
  }, []);

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
      nodeTypes,
      elementsSelectable: isDraggable,
      proOptions: { hideAttribution: true },
      minZoom: 0.1,
      maxZoom: 3,
    }),
    [nodeTypes, isDraggable],
  );

  const backgroundProps = useMemo(() => {
    if (backgroundVariant === 'none') {
      return null;
    }

    return {
      gap: dynamicGap,
      variant: backgroundVariant,
      style:
        backgroundVariant === BackgroundVariant.Dots
          ? BG_STYLE_DOTS
          : BG_STYLE_OTHER,
      className: 'bg-background',
      patternClassName: '!stroke-foreground/30',
    } as const;
  }, [dynamicGap, backgroundVariant]);

  const {
    processData: processWithWorker,
    isProcessing: isWorkerProcessing,
    progress: workerProgress,
    nodes: workerNodes,
    edges: workerEdges,
  } = useLayoutWorker();

  const inconsistentPaths = useMemo(() => {
    return detectInconsistentPaths(workerNodes ?? []);
  }, [workerNodes]);

  // Post-collapse, pre-projection node list. Stable input for GoToSearch
  // match computation and for the projection effect below.
  const visibleNodes = useMemo(() => {
    if (!workerNodes) {
      return [];
    }

    return workerNodes.filter((n) => !collapsedNodes.has(n.id));
  }, [workerNodes, collapsedNodes]);

  const parentMap = useMemo(
    () => buildParentMap(safeTreeData as TreeMap),
    [safeTreeData],
  );

  const nodesWithCollapsedDescendants = useMemo(
    () => computeNodesWithCollapsedDescendants(collapsedNodes, parentMap),
    [collapsedNodes, parentMap],
  );

  // Determines which node IDs survive the search projection filter.
  // null = no filtering (highlight mode or no active search).
  const searchContextSet = useMemo(() => {
    if (searchProjectionMode === 'highlight' || searchMatchIds.size === 0) {
      return null;
    }
    if (searchProjectionMode === 'focus-strict') {
      return new Set(searchMatchIds);
    }
    // focus-context: matches + ancestors
    const context = new Set(searchMatchIds);
    const ancestors = collectAncestors(searchMatchIds, parentMap);
    for (const id of ancestors) {
      context.add(id);
    }
    return context;
  }, [searchProjectionMode, searchMatchIds, parentMap]);

  const handleSearchMatchChange = useCallback((next: Set<string>) => {
    setSearchMatchIds((prev) => {
      if (prev.size === next.size) {
        let equal = true;
        for (const v of prev) {
          if (!next.has(v)) {
            equal = false;
            break;
          }
        }
        if (equal) {
          return prev;
        }
      }
      return next;
    });
  }, []);

  // Fit once per file change through viewport utility.
  useEffect(() => {
    if (!reactFlowInstance) {
      return;
    }

    const filePath = flowData.path ?? '';
    const isNewFile = filePath !== lastFileRef.current;

    if (!isNewFile) {
      return;
    }

    lastFileRef.current = filePath;
    safeFitView(reactFlowInstance);
  }, [flowData.path, reactFlowInstance]);

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

    const dataChanged = lastDataRef.current !== jsonData;
    const directionChanged = lastDirectionRef.current !== flowData.orientation;

    if (!dataChanged && !directionChanged) {
      return;
    }

    lastDataRef.current = jsonData;
    lastDirectionRef.current = flowData.orientation;

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

  // ---------------------------------------------------------------------------
  // Projection layer: derives visible render state from Worker output.
  //
  // Pipeline: workerNodes → collapse filter (visibleNodes useMemo)
  //           → search projection filter → enrich → renderNodes/renderEdges
  //
  // Constraints:
  //   - Node ordering is Worker-defined and must be preserved.
  //   - Worker output arrays (workerNodes, workerEdges) must not be mutated.
  //   - Node positions come from the Worker; no repositioning here.
  //
  // UI enrichment (onToggleChildren, isCollapsed, isSearchMatch, edge
  // appearance) is an extensibility surface: filtering, highlighting,
  // and navigation enhancements may evolve within this projection
  // without affecting Worker output or layout computation.
  // ---------------------------------------------------------------------------
  const { renderNodes: projectedNodes, renderEdges: projectedEdges } =
    useSearchProjection({
      visibleNodes,
      workerEdges,
      searchContextSet,
      searchMatchIds,
      searchProjectionMode,
      nodesWithCollapsedDescendants,
      edgeSettingsSnapshot: edgeSettingsRef.current,
      handleToggleChildren,
      applyEdgeSettings: applyEdgeSettingsToList,
      inconsistentPaths,
    });

  // Sync projection output to render state
  useEffect(() => {
    if (!projectedNodes.length) {
      return;
    }

    setRenderNodes((previousNodes) => {
      if (!projectedNodes.length && previousNodes.length) {
        return previousNodes;
      }

      if (!previousNodes.length) {
        return projectedNodes;
      }

      const previousPositions = new Map(
        previousNodes.map((node) => [node.id, node.position] as const),
      );

      return projectedNodes.map((node) => {
        const previousPosition = previousPositions.get(node.id);
        return previousPosition
          ? { ...node, position: previousPosition }
          : node;
      });
    });

    setRenderEdges(projectedEdges);
  }, [projectedNodes, projectedEdges]);
  useEffect(() => {
    if (!selectedNode) {
      return;
    }

    const nodeExistsInNewGraph = renderNodes.some(
      (node) => node.id === selectedNode.id,
    );
    if (!nodeExistsInNewGraph) {
      selectNode(null);
    }
  }, [selectedNode, renderNodes, selectNode]);

  // Unified change handlers for ReactFlow interactivity (drag, select)
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setRenderNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setRenderEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const focusNodeSafe = useCallback(
    (nodeId: string) => {
      const instance = reactFlowInstance;
      if (!instance) {
        return;
      }

      const node = instance.getNode(nodeId);
      if (!node || !node.position) {
        return;
      }

      focusNode(instance, node);
    },
    [reactFlowInstance],
  );

  const handlePointerNavigation = useCallback(
    (pointer: string | null | undefined) => {
      if (!pointer) {
        selectNode(null);
        return;
      }

      if (pointer === GRAPH_ROOT_ID || pointer === '/') {
        selectNode(null);
        return;
      }

      const targetNode =
        (finalNodesRef.current || []).find(
          (node: Node) => node.id === pointer,
        ) || null;

      selectNode(targetNode);

      if (targetNode) {
        focusNodeSafe(pointer);
      }

      setHighlightedNodeId(pointer);

      const lineNumber = targetNode?.data?.line;
      if (typeof lineNumber === 'number') {
        try {
          const vscode = getVscodeApi();
          vscode.postMessage({ type: 'revealLine', line: lineNumber });
        } catch {
          // Swallow errors when VS Code messaging is unavailable.
        }
      }
    },
    [selectNode, focusNodeSafe],
  );

  const handleApplyVisualFeedback = useCallback(
    (nodeId: string) => {
      setHighlightedNodeId(nodeId);
      focusNodeSafe(nodeId);
    },
    [focusNodeSafe],
  );

  const handleFitView = useCallback(() => {
    if (!reactFlowInstance) {
      return;
    }
    safeFitView(reactFlowInstance);
  }, [reactFlowInstance]);

  const rootNode = useMemo(() => {
    if (!rootNodeId) {
      return null;
    }
    const sourceNodes =
      (renderNodes.length > 0 ? renderNodes : workerNodes) ?? [];
    return (
      (sourceNodes as Node[]).find(
        (maybeNode) => maybeNode.id === rootNodeId,
      ) ?? null
    );
  }, [renderNodes, workerNodes, rootNodeId]);

  const controlsProps = useMemo(
    () => ({
      isDraggable,
      setIsDraggable,
      currentDirection,
      onLayoutRotate: handleRotation,
      onSettingsChange: debouncedHandleEdgeSettingsChange,
      nodes: renderNodes as InternalNode[],
      searchableNodes: visibleNodes as InternalNode[],
      allNodes: (workerNodes ?? []) as InternalNode[],
      searchProjectionMode,
      onSearchProjectionModeChange: setSearchProjectionMode,
      onSearchMatchChange: handleSearchMatchChange,
      selectedNode,
      rootNode,
      canEdit: flowData.canEdit,
      onApplyVisualFeedback: handleApplyVisualFeedback,
      onFitView: handleFitView,
      graphData: flowData.graphData,
    }),
    [
      isDraggable,
      currentDirection,
      handleRotation,
      debouncedHandleEdgeSettingsChange,
      renderNodes,
      visibleNodes,
      workerNodes,
      searchProjectionMode,
      handleSearchMatchChange,
      selectedNode,
      rootNode,
      flowData.canEdit,
      handleApplyVisualFeedback,
      handleFitView,
      flowData.graphData,
    ],
  );

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (event, node) => {
      event.preventDefault();
      handlePointerNavigation(node.id);
    },
    [handlePointerNavigation],
  );

  const onNodeDoubleClick = useCallback(
    (event: MouseEvent, node: Node) => {
      event.preventDefault();
      handlePointerNavigation(node.id);
    },
    [handlePointerNavigation],
  );

  useEffect(() => {
    if (!highlightedNodeId) {
      return;
    }
    const nodeElements =
      document.querySelectorAll<HTMLElement>('.react-flow__node');
    const wrapper = Array.from(nodeElements).find(
      (element) => element.dataset?.id === highlightedNodeId,
    );
    const targetElement = wrapper?.querySelector<HTMLElement>(
      '[data-node-inner="true"]',
    );

    if (!targetElement) {
      return;
    }

    const highlightClasses = ['live-sync-highlight'];
    targetElement.classList.add(...highlightClasses);

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      targetElement.classList.remove(...highlightClasses);
      setHighlightedNodeId(null);
      highlightDurationMsRef.current = 800;
      highlightTimeoutRef.current = null;
    }, highlightDurationMsRef.current);

    return () => {
      targetElement?.classList.remove(...highlightClasses);
    };
  }, [highlightedNodeId]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Stable callback: depends only on selectNode (itself stable from useCallback)
  const handleApplyGraphSelection = useCallback(
    (nodeId?: string) => {
      if (!nodeId) {
        selectNode(null);
        return;
      }
      handlePointerNavigation(nodeId);
    },
    [handlePointerNavigation, selectNode],
  );

  // Live Sync: wire selection synchronization (Phase 1)
  const { paused: liveSyncPaused, pauseReason } = useEditorSync({
    selectedNodeId: selectedNode?.id ?? null,
    onApplyGraphSelection: handleApplyGraphSelection,
    path: flowData.path,
  });
  const handleReactFlowInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstanceRef.current = instance;
    setReactFlowInstance(instance);
  }, []);

  const defaultEdgeOptions = useMemo(() => {
    return {
      style: { stroke: GLOBAL_EDGE_COLOR },
    };
  }, []);

  // Render edges immediately to avoid visual flicker
  const renderedEdges = renderEdges;
  if (!workerNodes && isValidTree) {
    return <Loading />;
  }

  return (
    <div id="flow-canvas-root" className="relative h-screen w-screen">
      <ReactFlow
        nodes={renderNodes}
        edges={renderedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodesDraggable={isDraggable}
        nodesConnectable={isDraggable}
        onInit={handleReactFlowInit}
        defaultEdgeOptions={defaultEdgeOptions}
        {...reactFlowProps}
      >
        <CustomControls {...controlsProps} />
        {backgroundProps && <Background {...backgroundProps} />}
        {!isWorkerProcessing && <FlowMinimap />}
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
