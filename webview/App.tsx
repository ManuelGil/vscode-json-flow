import {
  CustomControls,
  CustomNode,
  Loading,
  ThemeProvider,
  useTheme,
} from '@webview/components';
import { generateTree, getRootId } from '@webview/helpers/generate-tree';
import { useLayoutOrientation, useNodeVisibility } from '@webview/hooks';
import type { TreeMap, Direction } from '@webview/types';
import type { Connection, NodeTypes } from '@xyflow/react';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useState, useEffect } from 'react';

// @ts-ignore
// biome-ignore lint/correctness/noUndeclaredVariables: vscode is a global variable
const vscode = acquireVsCodeApi();

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

function FlowComponent() {
  const stateData = vscode.getState();
  const [_, setJsonData] = useState(stateData?.data || null);
  const [treeData, setTreeData] = useState<TreeMap | null>(null);
  const [layoutOrientation, changeLayoutOrientation] = useState<Direction>(
    stateData?.orientation || 'TB'
  );

  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case 'update':
          setJsonData(message.data);
          setTreeData(generateTree(message.data));
          changeLayoutOrientation((message.orientation || 'TB') as Direction);
          vscode.setState({
            data: message.data,
            orientation: message.orientation,
          });
          break;

        case 'clear':
          setJsonData(null);
          setTreeData(null);
          vscode.setState(null);
          break;
      }
    };

    window.addEventListener('message', messageHandler);

    // Initial request for data
    vscode.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', messageHandler);
  }, []);

  const treeRootId = treeData ? getRootId(treeData) : null;
  const { nodes, setNodes, onNodesChange, hiddenNodes } = useNodeVisibility(
    treeData || {}
  );
  const { edges, setEdges, onEdgesChange, currentDirection, rotateLayout } =
    useLayoutOrientation({
      treeData: treeData || {},
      treeRootId: treeRootId || '',
      initialDirection: layoutOrientation,
    });
  const [isInteractive, setIsInteractive] = useState(true);
  const { colorMode } = useTheme();
  const { zoom } = useViewport();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
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
