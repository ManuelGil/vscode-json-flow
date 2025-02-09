import {
  CustomControls,
  CustomNode,
  Loading,
  ThemeProvider,
  useTheme,
} from '@webview/components';
import { generateTree, getRootId } from '@webview/helpers/generate-tree';
import { useLayoutOrientation, useNodeVisibility } from '@webview/hooks';
import type { TreeMap } from '@webview/types';
import type { Connection, NodeTypes } from '@xyflow/react';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useState } from 'react';

// @ts-ignore
// biome-ignore lint/correctness/noUndeclaredVariables: vscode is a global variable
const vscode = acquireVsCodeApi();

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

function FlowComponent() {
  const jsonState = vscode.getState().json;
  const [treeData, useTreeData] = useState<TreeMap>(() =>
    generateTree(jsonState)
  );
  const treeRootId = getRootId(treeData);
  const { nodes, setNodes, onNodesChange, hiddenNodes } =
    useNodeVisibility(treeData);
  const { edges, setEdges, onEdgesChange, currentDirection, rotateLayout } =
    useLayoutOrientation({ treeData, treeRootId });
  const [isInteractive, setIsInteractive] = useState(false);
  const { colorMode } = useTheme();
  const { zoom } = useViewport();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'clearJson': {
          useTreeData(null);
          vscode.setState(null);
          break;
        }

        case 'setJson': {
          useTreeData(generateTree(message.data));
          vscode.setState({
            ...vscode.getState(),
            json: generateTree(message.data),
          });
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: ConnectionLineType.SmoothStep, animated: true },
          eds
        )
      ),
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
