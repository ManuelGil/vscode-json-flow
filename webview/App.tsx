import {
  Background,
  Connection,
  ConnectionLineType,
  Controls,
  Edge,
  MiniMap,
  Node,
  Panel,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useState } from 'react';
import CustomNode from './components/CustomNode';
import Loading from './components/Loading';
import { Tree, layoutElements } from './components/layout-elements.ts';

// @ts-ignore
// biome-ignore lint/correctness/noUndeclaredVariables: vscode is a global variable
const vscode = acquireVsCodeApi();

type Direction = 'TB' | 'LR';

type StateType = {
  json: Record<string, Tree> | null;
  orientation: Direction;
};

const nodeTypes = {
  custom: CustomNode,
};

const LayoutFlow = () => {
  const jsonState: StateType = vscode.getState();
  const [json, setJson] = useState(jsonState?.json ?? null);
  const [orientation, setOrientation] = useState<Direction>(
    jsonState?.orientation ?? 'TB'
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'clearJson': {
          setJson(null);
          vscode.setState(null);
          break;
        }

        case 'setJson': {
          setJson(message.data);
          vscode.setState({ ...vscode.getState(), json: message.data });
          break;
        }

        default: {
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (json) {
      const treeRootId = 1;
      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
        json,
        treeRootId,
        orientation
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [json, orientation, setNodes, setEdges]);

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

  const onLayout = useCallback(
    (direction: Direction) => {
      if (!json) {
        return;
      }

      setOrientation(direction);
      vscode.setState({
        ...vscode.getState(),
        orientation: direction,
      });

      const treeRootId = 1;
      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
        json,
        treeRootId,
        direction
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [json, setNodes, setEdges]
  );

  if (!json) {
    return <Loading />;
  }

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
      >
        <Background />
        <MiniMap />
        <Controls />
        <Panel className="flex justify-between gap-2" position="top-right">
          <button onClick={() => onLayout('TB')}>vertical layout</button>
          <button onClick={() => onLayout('LR')}>horizontal layout</button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default LayoutFlow;
