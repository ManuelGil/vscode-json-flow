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

  const { selectedNode, onNodeClick, clearSelection } = useSelectedNode();

  const { handleRotation, handleEdgeSettingsChange } = useFlowSettings(
    rotateLayout,
    flowData,
    setEdges,
  );

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
      nodesDraggable: isDraggable,
      nodesConnectable: isDraggable,
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
      onSettingsChange: handleEdgeSettingsChange,
    }),
    [isDraggable, currentDirection, handleRotation, handleEdgeSettingsChange],
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
  useEffect(() => {
    logger.log(`isWorkerProcessing=${isWorkerProcessing}, progress=${workerProgress}`);
  }, [isWorkerProcessing, workerProgress]);
  useEffect(() => {
    if (workerNodes && workerNodes.length > 0 && reactFlowInstanceRef.current) {
      logger.log(`Auto-fit after worker: nodes=${workerNodes.length}, edges=${workerEdges?.length ?? 0}`);
      requestAnimationFrame(() => {
        try {
          reactFlowInstanceRef.current?.fitView({ padding: 0.2, includeHiddenNodes: true });
        } catch (e) {
          logger.warn('fitView failed:', e);
        }
      });
    }
  }, [workerNodes, workerEdges]);
  useEffect(() => {
    if (!isWorkerProcessing) {
      requestAnimationFrame(() => {
        const count = document.querySelectorAll('.react-flow__node').length;
        logger.log(`Rendered DOM nodes count: ${count}`);
        if (count > 0) {
          setGraphReady(true);
        }
      });
    }
  }, [isWorkerProcessing]);
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
    if (isJsonChanged) {
      setGraphReady(false);
    }

    lastDataRef.current = jsonData;
    lastDirectionRef.current = flowData.orientation;

    logger.log('Processing dataset');
    processWithWorker(jsonData, {
      direction: flowData.orientation === 'TB' ? 'vertical' : 'horizontal',
    });
  }, [flowData.data, flowData.orientation, isValidTree, processWithWorker]);

  const finalNodes = workerNodes || nodes;
  const finalEdges = workerEdges || edges;
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
        edges={finalEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
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
        {graphReady && <FlowMinimap />}
      </ReactFlow>
      {!graphReady && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 200, pointerEvents: 'none' }}>
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
            <strong>Processing stats:</strong> {processingStats.nodesCount} nodes
            processed in {Math.round(processingStats.time)}ms
          </p>
        </div>
      )}
      {import.meta.env.DEV && isValidTree && (
        <div style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 50, pointerEvents: 'none' }}>
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
