import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  ConnectionLineType,
  addEdge,
  ReactFlowProvider,
  BackgroundVariant,
  useViewport,
} from '@xyflow/react';
import type { Connection, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  CustomControls,
  CustomNode,
  Loading,
  ThemeProvider,
  useTheme,
} from '@webview/components';
import { useNodeVisibility, useLayoutOrientation } from '@webview/hooks';
import { generateTree, getRootId } from '@webview/helpers/generate-tree';
import type { TreeMap } from '@webview/types';

// @ts-ignore
// biome-ignore lint/correctness/noUndeclaredVariables: vscode is a global variable
const vscode = acquireVsCodeApi();

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const jsonState = vscode.getState();

function FlowComponent() {
  const [treeData] = useState<TreeMap>(() => generateTree(jsonState));
  const treeRootId = getRootId(treeData);
  const { nodes, setNodes, onNodesChange, hiddenNodes } =
    useNodeVisibility(treeData);
  const { edges, setEdges, onEdgesChange, currentDirection, rotateLayout } =
    useLayoutOrientation({ treeData, treeRootId });
  const [isInteractive, setIsInteractive] = useState(false);
  const { colorMode } = useTheme();
  const { zoom } = useViewport();

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: ConnectionLineType.SmoothStep, animated: true },
          eds,
        ),
      ),
    [setEdges],
  );

  const handleRotate = useCallback(() => {
    const { nodes: newNodes, edges: newEdges } = rotateLayout(hiddenNodes);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [rotateLayout, hiddenNodes, setNodes, setEdges]);

  if (!treeData) {
    return <Loading />;
  }

  const baseGap = 50;
  const dynamicGap = baseGap / zoom;

  return (
    <div className="h-screen w-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        nodeTypes={nodeTypes}
        nodesDraggable={isInteractive}
        nodesConnectable={isInteractive}
        elementsSelectable={isInteractive}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={1.5}
      >
        <CustomControls
          isInteractive={isInteractive}
          setIsInteractive={setIsInteractive}
          currentDirection={currentDirection}
          onRotate={handleRotate}
        />
        <Background
          bgColor={colorMode === 'light' ? '#fafafa' : '#0a0a0a'}
          gap={dynamicGap}
          variant={BackgroundVariant.Lines}
          style={{ strokeOpacity: 0.1 }}
        />
      </ReactFlow>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ReactFlowProvider>
        <FlowComponent />
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
