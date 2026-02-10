import {
  CustomControls,
  CustomNode,
  FlowMinimap,
  Loading,
} from '@webview/components';
import { DEFAULT_SETTINGS } from '@webview/components/CustomControls/Settings';
import { flowReducer } from '@webview/context/FlowContext';
import { generateTree, getRootId } from '@webview/helpers/generateTree';
import { createSampleJsonData } from '@webview/helpers/mockData';
import { useFlowController, useLayoutWorker } from '@webview/hooks';
import { useEditorSync } from '@webview/hooks/useEditorSync';
import { useFlowSettings } from '@webview/hooks/useFlowSettings';
import { useTreeDataValidator } from '@webview/hooks/useTreeDataValidator';
import { useVscodeMessageHandler } from '@webview/hooks/useVscodeMessageHandler';
import { vscodeService } from '@webview/services/vscodeService';
import type { Direction, TreeMap } from '@webview/types';
import * as logger from '@webview/utils/logger';
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  ReactFlowInstance,
} from '@xyflow/react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
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
import Debug from '../Debug';
import { NodeDetail } from '../NodeDetail/NodeDetail';
import { useSelectedNode } from './useSelectedNode';
export const FlowCanvas = memo(function FlowCanvas() {
  const initialFlowState = useMemo(() => {
    const st = vscodeService.getStateOrDefaults();
    const enableMock: boolean = import.meta.env.VITE_ENABLE_MOCK === 'true';
    const data = enableMock ? createSampleJsonData() : st.data;
    return {
      data,
      treeData: data ? generateTree(data) : {},
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

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const settings = useMemo(() => {
    return localStorage.getItem('settings')
      ? JSON.parse(localStorage.getItem('settings')!)
      : DEFAULT_SETTINGS;
  }, []);

  const flowControllerParams = useMemo(
    () => ({
      treeData: safeTreeData as TreeMap,
      treeRootId: getRootId(safeTreeData as TreeMap),
      initialDirection: flowData.orientation,
    }),
    [safeTreeData, flowData.orientation],
  );

  const {
    nodes,
    edges,
    setEdges,
    currentDirection,
    rotateLayout,
    collapsedNodes,
    toggleNodeChildren,
    descendantsCache,
  } = useFlowController(flowControllerParams);

  const { zoom } = useViewport();

  const { selectedNode, onNodeClick, clearSelection, selectNode } =
    useSelectedNode();

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
    setEdges,
    onDirectionChange,
  );

  // Debounce heavy settings updates to avoid rapid recomputation/edge updates
  const settingsChangeTimerRef = useRef<number | undefined>(undefined);
  const debouncedHandleEdgeSettingsChange = useCallback(
    (next: Parameters<typeof handleEdgeSettingsChange>[0]) => {
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
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

  const baseGap = 50;
  const dynamicGap = useMemo(() => baseGap / zoom, [zoom]);

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
      variant: settings.backgroundVariant,
      style: { strokeOpacity: 0.1 },
      className: 'bg-background',
      patternClassName: '!stroke-foreground/30',
    }),
    [dynamicGap, settings.backgroundVariant],
  );

  const controlsProps = useMemo(
    () => ({
      isDraggable,
      setIsDraggable,
      currentDirection,
      onLayoutRotate: handleRotation,
      onSettingsChange: debouncedHandleEdgeSettingsChange,
    }),
    [
      isDraggable,
      currentDirection,
      handleRotation,
      debouncedHandleEdgeSettingsChange,
    ],
  );

  const debugProps = useMemo(
    () => ({
      nodes,
      edges,
      treeData: safeTreeData as TreeMap,
      collapsedNodes,
      direction: currentDirection,
    }),
    [nodes, edges, safeTreeData, collapsedNodes, currentDirection],
  );

  const nodeDetailProps = useMemo(
    () => ({
      node: selectedNode,
      onClose: clearSelection,
    }),
    [selectedNode, clearSelection],
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
    error: workerError,
    nodes: workerNodes,
    edges: workerEdges,
    processingStats,
  } = useLayoutWorker();

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
  }, [isWorkerProcessing, graphReady, workerNodes, workerEdges]);
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
    const isJsonChanged = lastDataRef.current !== jsonData;
    const isOrientationChanged =
      lastDirectionRef.current !== flowData.orientation;
    if (isJsonChanged || isOrientationChanged) {
      setGraphReady(false);
      didFitViewRef.current = false;
    }

    lastDataRef.current = jsonData;
    lastDirectionRef.current = flowData.orientation;

    processWithWorker(jsonData, {
      direction: flowData.orientation,
    });
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

  // Unified render state: post-processed with collapse filtering and callbacks
  const [renderNodes, setRenderNodes] = useState<Node[]>([]);
  const [renderEdges, setRenderEdges] = useState<Edge[]>([]);

  // Sync render state when layout source or collapse state changes
  useEffect(() => {
    const sourceNodes = workerNodes ?? nodes;
    const sourceEdges = workerEdges ?? edges;

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
        },
      })),
    );

    setRenderEdges(
      (sourceEdges ?? []).filter(
        (edge) =>
          !collapsedNodes.has(edge.source) && !collapsedNodes.has(edge.target),
      ),
    );
  }, [
    workerNodes,
    nodes,
    workerEdges,
    edges,
    collapsedNodes,
    descendantsCache,
    handleToggleChildren,
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
    },
    [selectNode],
  );

  // Live Sync: wire selection synchronization (Phase 1)
  const { paused: liveSyncPaused, pauseReason } = useEditorSync({
    selectedNodeId: selectedNode?.id ?? null,
    onApplyGraphSelection: handleApplyGraphSelection,
  });
  // Render-only virtualization: defer edges until the graph is ready
  const renderedEdges = graphReady ? renderEdges : [];
  const reactFlowKey = useMemo(() => {
    const nodeCount = renderNodes.length;
    const edgeCount = renderEdges.length;
    return `${nodeCount}:${edgeCount}:${currentDirection}`;
  }, [renderNodes, renderEdges, currentDirection]);

  if (
    !workerNodes &&
    (!isValidTree || !Array.isArray(nodes) || !Array.isArray(edges))
  ) {
    return <Loading />;
  }

  if (workerError) {
    logger.error('Worker error:', workerError);
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
        onInit={(instance) => {
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
        }}
        {...reactFlowProps}
      >
        <CustomControls {...controlsProps} />
        <Background {...backgroundProps} />
        {graphReady && !isWorkerProcessing && <FlowMinimap />}
      </ReactFlow>
      {liveSyncPaused && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 300,
            pointerEvents: 'none',
          }}
        >
          <div
            className="mx-auto mt-2 w-fit max-w-[90%] rounded bg-yellow-100 px-3 py-1 text-yellow-900 shadow"
            style={{ pointerEvents: 'none' }}
            title={pauseReason || 'Live Sync paused'}
          >
            <strong>Live Sync paused</strong>
            {pauseReason ? `: ${pauseReason}` : ''}
          </div>
        </div>
      )}
      {isWorkerProcessing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            pointerEvents: 'none',
          }}
        >
          <Loading progress={workerProgress} />
        </div>
      )}
      {import.meta.env.DEV && processingStats && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 50,
            padding: '5px',
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '4px',
            fontSize: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            pointerEvents: 'none',
          }}
        >
          <p>
            <strong>Processing stats:</strong> {processingStats.nodesCount}{' '}
            nodes processed in {Math.round(processingStats.time)}ms
          </p>
        </div>
      )}
      {import.meta.env.DEV && isValidTree && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            zIndex: 50,
            pointerEvents: 'auto',
          }}
        >
          <Debug {...debugProps} />
        </div>
      )}
      {import.meta.env.DEV && selectedNode && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 100,
            background: 'rgba(255,255,255,0)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <NodeDetail {...nodeDetailProps} />
        </div>
      )}
    </div>
  );
});
