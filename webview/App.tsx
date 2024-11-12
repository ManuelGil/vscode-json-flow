// @ts-ignore
import React, { useCallback } from 'react';

import {
  ReactFlow,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState, Controls, MiniMap, // @ts-ignore
} from '@xyflow/react';

import CustomNode from './components/CustomNode';
//TODO: Replace this line with the json structur
import { initialTree, treeRootId } from './components/nodes-edges';


import '@xyflow/react/dist/style.css';
import { layoutElements } from './components/layout-elements.ts';

const nodeTypes = {
  custom: CustomNode,
};

const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
  initialTree ,
  treeRootId,
  'TB',
);

const LayoutFlow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: ConnectionLineType.SmoothStep, animated: true },
          eds,
        ),
      ),
    [],
  );
  const onLayout = useCallback(
    (direction: any) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
        initialTree,
        treeRootId,
        direction,
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges],
  );


  return (
    <div className={"w-screen h-screen"}>
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
      <Controls/>
      <MiniMap></MiniMap>
      <Panel position="top-right">
        <button onClick={() => onLayout('TB')}>vertical layout</button>
        <button onClick={() => onLayout('LR')}>horizontal layout</button>
      </Panel>
    </ReactFlow>
    </div>
  );
};

export default LayoutFlow;
