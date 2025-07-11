import type { Connection, Edge } from '@xyflow/react';
import { addEdge, Background, ReactFlow, useViewport } from '@xyflow/react';
import { memo, useCallback, useMemo, useReducer, useState } from 'react';

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
import { useFlowController, useVscodeSync } from '@webview/hooks';
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

  // Handler para doble clic en nodo
  const onNodeDoubleClick = useCallback(
    (event: any, node: any) => {
      event.preventDefault();
      onNodeClick(event, node);
    },
    [onNodeClick],
  );

  // Early return for loading state or invalid data
  // Defensive: Never let ReactFlow render with invalid or empty nodes/edges/treeData
  if (!isValidTree || !Array.isArray(nodes) || !Array.isArray(edges)) {
    return <Loading text="Waiting for valid data..." />;
  }

  return (
    <div className="h-screen w-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
