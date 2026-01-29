import {
  CustomControls,
  CustomNode,
  FlowMinimap,
  Loading,
} from '@webview/components';
import { DEFAULT_SETTINGS } from '@webview/components/CustomControls/Settings';
import { flowReducer } from '@webview/context/FlowContext';
import { generateTree, getRootId } from '@webview/helpers/generateTree';
import { sampleJsonData } from '@webview/helpers/mockData';
import { useFlowController, useLayoutWorker } from '@webview/hooks';
import { useEditorSync } from '@webview/hooks/useEditorSync';
import { useFlowSettings } from '@webview/hooks/useFlowSettings';
import { useTreeDataValidator } from '@webview/hooks/useTreeDataValidator';
import { useVscodeMessageHandler } from '@webview/hooks/useVscodeMessageHandler';
import { vscodeService } from '@webview/services/vscodeService';
import type { TreeMap } from '@webview/types';
import * as logger from '@webview/utils/logger';
import type { Connection, Edge, Node, ReactFlowInstance } from '@xyflow/react';
import { addEdge, Background, ReactFlow, useViewport } from '@xyflow/react';
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
    const data = import.meta.env.DEV ? sampleJsonData : st.data;
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
    onNodesChange,
    onEdgesChange,
    currentDirection,
    rotateLayout,
    collapsedNodes,
  } = useFlowController(flowControllerParams);

  const { zoom } = useViewport();

  const { selectedNode, onNodeClick, clearSelection, selectNode } =
    useSelectedNode();

  const { handleRotation, handleEdgeSettingsChange } = useFlowSettings(
    rotateLayout,
    flowData,
    setEdges,
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
      if (import.meta.env.DEV) {
        logger.log(
          `Auto-fit after completion: nodes=${workerNodes.length}, edges=${workerEdges?.length ?? 0}`,
        );
      }
      requestAnimationFrame(() => {
        try {
          reactFlowInstanceRef.current?.fitView({
            padding: 0.2,
            includeHiddenNodes: true,
          });
        } catch (e) {
          logger.warn('fitView failed:', e);
        }
        didFitViewRef.current = true;
      });
    }
  }, [isWorkerProcessing, graphReady, workerNodes, workerEdges]);
  useEffect(() => {
    if (!isWorkerProcessing) {
      requestAnimationFrame(() => {
        const count = document.querySelectorAll('.react-flow__node').length;
        if (import.meta.env.DEV) {
          logger.log(`Rendered DOM nodes count: ${count}`);
        }
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
    if (isJsonChanged) {
      setGraphReady(false);
      didFitViewRef.current = false;
    }

    lastDataRef.current = jsonData;
    lastDirectionRef.current = flowData.orientation;

    if (import.meta.env.DEV) {
      logger.log('[FlowCanvas] ===== STARTING NEW PROCESSING =====');
      logger.log('[FlowCanvas] JSON data changed, triggering worker processing', {
        orientation: flowData.orientation,
        dataType: typeof jsonData,
        path: flowData.path,
        fileName: flowData.fileName,
      });
    }
    processWithWorker(jsonData, {
      direction: flowData.orientation === 'TB' ? 'vertical' : 'horizontal',
      compact: true, // Enable compact transferable payloads for better performance
      autoTune: true, // Enable adaptive batching optimization
      preallocate: true, // Enable preallocation hints for large datasets
    });
    if (import.meta.env.DEV) {
      logger.log('[FlowCanvas] Worker processing initiated');
    }
  }, [flowData.data, flowData.orientation, isValidTree, processWithWorker]);

  const finalNodes = workerNodes || nodes;
  const finalEdges = workerEdges || edges;
  // Live Sync: wire selection synchronization (Phase 1)
  const { paused: liveSyncPaused, pauseReason } = useEditorSync({
    selectedNodeId: selectedNode?.id ?? null,
    onApplyGraphSelection: (nodeId?: string) => {
      if (!nodeId) {
        selectNode(null);
        return;
      }
      const target =
        (finalNodes || []).find((n: Node) => n.id === nodeId) || null;
      selectNode(target);
    },
  });
  // Render-only virtualization: defer edges until the graph is ready
  const renderedEdges = graphReady ? finalEdges : [];
  const reactFlowKey = useMemo(() => {
    const n = workerNodes?.length ?? finalNodes?.length ?? 0;
    const e = workerEdges?.length ?? finalEdges?.length ?? 0;
    return `${n}:${e}:${currentDirection}`;
  }, [workerNodes, workerEdges, finalNodes, finalEdges, currentDirection]);

  if (
    !workerNodes &&
    (!isValidTree || !Array.isArray(nodes) || !Array.isArray(edges))
  ) {
    return <Loading text="Preparing data..." />;
  }

  if (workerError) {
    logger.error('Worker error:', workerError);
  }

  return (
    <div className="relative h-screen w-screen">
      <ReactFlow
        key={reactFlowKey}
        nodes={finalNodes}
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
          } catch (e) {
            logger.warn('initial fitView failed:', e);
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
      {!graphReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            pointerEvents: 'none',
          }}
        >
          <Loading progress={workerProgress} text="Loading graph..." />
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
