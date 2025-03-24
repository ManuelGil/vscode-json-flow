import {
  CustomControls,
  CustomNode,
  Loading,
  ThemeProvider,
  useTheme,
} from '@webview/components';
import { generateTree, getRootId } from '@webview/helpers';
import { useFlowController } from '@webview/hooks';
import type { TreeMap, Direction } from '@webview/types';
import type { Connection, NodeTypes, Edge } from '@xyflow/react';
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
import { DEFAULT_SETTINGS } from '@webview/components/CustomControls/Settings';

// @ts-ignore
// biome-ignore lint/correctness/noUndeclaredVariables: vscode is a global variable
const vscode = acquireVsCodeApi();

interface TreeState {
  data: any;
  treeData: TreeMap | null;
  orientation: Direction;
  path: string;
  fileName: string;
}

type TreeAction =
  | {
      type: 'UPDATE';
      payload: {
        data: any;
        orientation: Direction;
        path: string;
        fileName: string;
      };
    }
  | { type: 'CLEAR' };

function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'UPDATE':
      return {
        data: action.payload.data,
        treeData: generateTree(action.payload.data),
        orientation: action.payload.orientation,
        path: action.payload.path,
        fileName: action.payload.fileName,
      };
    case 'CLEAR':
      return {
        data: null,
        treeData: null,
        orientation: 'TB',
        path: '',
        fileName: '',
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
  const [flowData, dispatch] = useReducer(treeReducer, {
    data: stateData?.data || null,
    treeData: stateData?.data ? generateTree(stateData.data) : null,
    orientation: (stateData?.orientation || 'TB') as Direction,
    path: stateData?.path,
    fileName: stateData?.fileName,
  });

  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      const stateData = vscode.getState();

      switch (message.command) {
        case 'update':
          dispatch({
            type: 'UPDATE',
            payload: {
              data: message.data,
              orientation: (stateData?.orientation ||
                message.orientation ||
                'TB') as Direction,
              fileName: message.fileName,
              path: message.path,
            },
          });
          vscode.setState({
            data: message.data,
            fileName: message.fileName,
            path: message.path,
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

  const treeRootId = flowData.treeData ? getRootId(flowData.treeData) : null;
  const {
    nodes,
    edges,
    setEdges,
    onNodesChange,
    onEdgesChange,
    currentDirection,
    rotateLayout,
  } = useFlowController({
    treeData: flowData.treeData || {},
    treeRootId: treeRootId || '',
    initialDirection: flowData.orientation,
  });
  const [isDraggable, setIsDraggable] = useState(true);
  const { colorMode } = useTheme();
  const { zoom } = useViewport();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

  const handleLayoutRotation = useCallback(() => {
    const nextDirection = rotateLayout();

    vscode.setState({
      data: flowData.data,
      orientation: nextDirection,
    });

    vscode.postMessage({
      command: 'updateConfig',
      orientation: nextDirection,
    });
  }, [rotateLayout, flowData.data]);

  const settings = localStorage.getItem('settings') ? 
    JSON.parse(localStorage.getItem('settings')!) : 
    DEFAULT_SETTINGS;

  if (!flowData.treeData) {
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
        nodesDraggable={isDraggable}
        nodesConnectable={isDraggable}
        elementsSelectable={isDraggable}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={1.5}
      >
        <CustomControls
          isDraggable={isDraggable}
          setIsDraggable={setIsDraggable}
          currentDirection={currentDirection}
          onLayoutRotate={handleLayoutRotation}
        />
        <Background
          bgColor={colorMode === 'light' ? '#fafafa' : '#0a0a0a'}
          gap={dynamicGap}
          variant={settings.backgroundVariant}
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
