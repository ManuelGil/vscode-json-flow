import type { Connection, Edge } from '@xyflow/react';
import { addEdge, Background, ReactFlow, useViewport } from '@xyflow/react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

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
import {
  useFlowController,
  useLayoutWorker,
  useVscodeSync,
} from '@webview/hooks';
import { useFlowSettings } from '@webview/hooks/useFlowSettings';
import { useTreeDataValidator } from '@webview/hooks/useTreeDataValidator';
import { useVscodeMessageHandler } from '@webview/hooks/useVscodeMessageHandler';
import { vscodeService } from '@webview/services/vscodeService';
import type { Direction, TreeMap } from '@webview/types';
import Debug from '../Debug';
import { NodeDetail } from '../NodeDetail/NodeDetail';
import { useSelectedNode } from './useSelectedNode';

/**
 * FlowCanvas is the main container for the React Flow graph.
 * It manages rendering nodes and edges based on the JSON tree data.
 * Handles development mode fallbacks, validation, and VSCode integration.
 *
 * Optimized with:
 * - Memoization of expensive calculations and rendering
 * - Proper cleanup of event listeners
 * - Stable callbacks with precise dependencies
 * - Early return patterns for invalid states
 * - Extracted complex logic to custom hooks
 *
 * @returns {JSX.Element} The flow visualization component
 */
export const FlowCanvas = memo(function FlowCanvas() {
  // Initialize VSCode synchronization
  useVscodeSync();

  // Use mockData in development mode if no VSCode data is present
  const isDev = !!import.meta.env.DEV;
  const stateData = vscodeService.getState();
  const initialData = isDev ? sampleJsonData : stateData?.data || null;

  // Use reducer for global flow state
  const [flowData, dispatch] = useReducer(flowReducer, {
    data: initialData,
    treeData: initialData ? generateTree(initialData) : {}, // Always a TreeMap
    orientation: (stateData?.orientation || 'TB') as Direction,
    path: stateData?.path || '',
    fileName: stateData?.fileName || '',
  });

  // Use custom hook for tree data validation
  const { safeTreeData, isValidTree } = useTreeDataValidator(flowData.treeData);

  // Setup VSCode message handler with proper dependencies
  useVscodeMessageHandler(dispatch);

  // Toggle for node dragging functionality
  const [isDraggable, setIsDraggable] = useState(true);

  // Memoize node types to prevent recreation
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  // Load settings from localStorage (memoize if used in multiple places)
  const settings = useMemo(() => {
    return localStorage.getItem('settings')
      ? JSON.parse(localStorage.getItem('settings')!)
      : DEFAULT_SETTINGS;
  }, []);

  // Flow controller with memoized inputs to prevent rerenders
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

  // Get current zoom level for dynamic UI scaling
  const { zoom } = useViewport();

  // Custom hook for node selection logic
  const { selectedNode, onNodeClick, clearSelection } = useSelectedNode();

  // Use custom hook for flow settings and layout management
  const { handleRotation, handleEdgeSettingsChange } = useFlowSettings(
    rotateLayout,
    flowData,
    setEdges,
  );

  // Memoized connection handler
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

  // Calculate background grid gap based on zoom level
  const baseGap = 50;
  const dynamicGap = useMemo(() => baseGap / zoom, [zoom]);

  // Memoize React Flow configuration to prevent unnecessary re-renders
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

  // Memoize Background props
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

  // Memoize Controls props
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

  // Memoize Debug panel props
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

  // Memoize NodeDetail props
  const nodeDetailProps = useMemo(
    () => ({
      node: selectedNode,
      onClose: clearSelection,
    }),
    [selectedNode, clearSelection],
  );

  // Handler for double-clicking nodes to select them
  // Uses useCallback to ensure stable reference
  const onNodeDoubleClick = useCallback(
    (event: any, node: any) => {
      event.preventDefault();
      onNodeClick(event, node);
    },
    [onNodeClick],
  );

  // Initialize Web Worker for data processing if needed
  const {
    processData: processWithWorker,
    isProcessing: isWorkerProcessing,
    progress: workerProgress,
    error: workerError,
    nodes: workerNodes,
    edges: workerEdges,
    processingStats,
  } = useLayoutWorker();

  // Use Web Worker for large datasets (adjust threshold as needed)
  useEffect(() => {
    const jsonData = flowData.data;

    // Only process data if it's valid and large enough to benefit from worker
    if (jsonData && isValidTree) {
      // Check if data is complex/large enough to benefit from worker processing
      // This is a simple heuristic - adjust as needed
      const isLargeDataset = JSON.stringify(jsonData).length > 100000; // ~100KB threshold

      if (isLargeDataset) {
        console.log('Processing large dataset with Web Worker');
        processWithWorker(jsonData, {
          direction: flowData.orientation === 'TB' ? 'vertical' : 'horizontal',
          optimizeForLargeData: true,
          maxNodesToProcess: 1000, // Limit for very large datasets
        });
      }
    }
  }, [flowData.data, flowData.orientation, isValidTree, processWithWorker]);

  // Early return for loading state or invalid data
  // Defensive: Never let ReactFlow render with invalid or empty nodes/edges/treeData
  if (!isValidTree || !Array.isArray(nodes) || !Array.isArray(edges)) {
    return <Loading text="Waiting for valid data..." />;
  }

  // Show worker progress if active
  if (isWorkerProcessing) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center">
        <Loading text={`Optimizing layout (${workerProgress}%)...`} />
        <div className="mt-4 h-2 w-64 rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${workerProgress}%` }}
          ></div>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Processing large dataset with optimizations...
        </p>
      </div>
    );
  }

  // Show worker error if any
  if (workerError) {
    console.error('Worker error:', workerError);
    // Continue with normal rendering, worker failed but we still have the regular data
  }

  // Use worker-processed nodes/edges if available, otherwise use standard ones
  const finalNodes = workerNodes || nodes;
  const finalEdges = workerEdges || edges;

  return (
    <div className="h-screen w-screen">
      <ReactFlow
        nodes={finalNodes}
        edges={finalEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        {...reactFlowProps}
      >
        <CustomControls {...controlsProps} />
        <FlowMinimap />
        <Background {...backgroundProps} />
      </ReactFlow>
      {/* Worker stats if processed with worker */}
      {isDev && processingStats && (
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
          }}
        >
          <p>
            <strong>Worker stats:</strong> {processingStats.nodesCount} nodes
            processed in {Math.round(processingStats.time)}ms
          </p>
          <p>
            <small>Web Worker enabled for large datasets</small>
          </p>
        </div>
      )}

      {/* Debug panel in development mode */}
      {isDev && isValidTree && (
        <div style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 50 }}>
          <Debug {...debugProps} />
        </div>
      )}
      {/* NodeDetail side panel (only in development mode) */}
      {isDev && selectedNode && (
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
