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
import { useCallback, useReducer, useEffect, useState } from 'react';

// @ts-ignore
// biome-ignore lint/correctness/noUndeclaredVariables: vscode is a global variable
const vscode = acquireVsCodeApi();

interface TreeState {
  data: any;
  treeData: TreeMap | null;
  orientation: Direction;
}

type TreeAction =
  | { type: 'UPDATE'; payload: { data: any; orientation: Direction } }
  | { type: 'CLEAR' };

function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'UPDATE':
      return {
        data: action.payload.data,
        treeData: generateTree(action.payload.data),
        orientation: action.payload.orientation,
      };
    case 'CLEAR':
      return {
        data: null,
        treeData: null,
        orientation: 'TB',
      };
    default:
      return state;
  }
}

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

function FlowComponent() {
  const stateData = vscode.getState();
  const [treeState, dispatch] = useReducer(treeReducer, {
    data: stateData?.data || null,
    treeData: stateData?.data ? generateTree(stateData.data) : null,
    orientation: (stateData?.orientation || 'TB') as Direction,
  });

  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case 'update':
          dispatch({
            type: 'UPDATE',
            payload: {
              data: message.data,
              orientation: (message.orientation || 'TB') as Direction,
            },
          });
          vscode.setState({
            data: message.data,
            orientation: message.orientation,
          });
          break;

        case 'clear':
          dispatch({ type: 'CLEAR' });
          vscode.setState(null);
          break;
      }
    };

    window.addEventListener('message', messageHandler);

    return () => window.removeEventListener('message', messageHandler);
  }, []);

  const treeRootId = treeState.treeData ? getRootId(treeState.treeData) : null;
  const { onNodesChange, hiddenNodes } = useNodeVisibility(
    treeState.treeData || {},
  );
  const {
    edges,
    setEdges,
    onEdgesChange,
    currentDirection,
    rotateLayout,
    nodes,
  } = useLayoutOrientation({
    treeData: treeState.treeData || {},
    treeRootId: treeRootId || '',
    initialDirection: treeState.orientation,
  });
  const [isInteractive, setIsInteractive] = useState(true);
  const { colorMode } = useTheme();
  const { zoom } = useViewport();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleRotate = useCallback(() => {
    const nextDirection = rotateLayout(hiddenNodes);

    vscode.setState({
      data: treeState.data,
      orientation: nextDirection,
    });

    vscode.postMessage({
      command: 'updateConfig',
      orientation: nextDirection,
    });
  }, [rotateLayout, hiddenNodes, treeState.data]);

  if (!treeState.treeData) {
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
