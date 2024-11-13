import {
  ConnectionLineType,
  Controls,
  MiniMap,
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
import { layoutElements } from './components/layout-elements.ts';

// @ts-ignore
// biome-ignore lint/correctness/noUndeclaredVariables: vscode is a global variable
const vscode = acquireVsCodeApi();

const nodeTypes = {
  custom: CustomNode,
};

const LayoutFlow = () => {
  const oldJson = vscode.getState();

  const [json, setJson] = useState(oldJson);

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'clearJson': {
          setJson(null);
          vscode.setState(null);
          break;
        }

        case 'setJson': {
          setJson(message.data);
          vscode.setState(message.data);
          break;
        }

        default: {
          break;
        }
      }
    });
  }, []);

  if (!json) {
    // loading
    return <Loading />;
  }

  const treeRootId = 1;
  const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
    json,
    1,
    'TB'
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: ConnectionLineType.SmoothStep, animated: true },
          eds
        )
      ),
    []
  );

  const onLayout = useCallback(
    (direction: any) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
        json,
        treeRootId,
        direction
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges]
  );

  return (
    <div className={'h-screen w-screen'}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onReconnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        nodeTypes={nodeTypes}
      >
        <Controls />
        <MiniMap />
        <Panel position="top-right">
          <button onClick={() => onLayout('TB')}>vertical layout</button>
          <button onClick={() => onLayout('LR')}>horizontal layout</button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default LayoutFlow;
