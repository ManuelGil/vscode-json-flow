import { useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const UpdateNode = ({ nodesInitial }: { nodesInitial: any }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const memoizedEdges = useMemo(() => {
    return nodesInitial
      .map((node: any) => {
        if (node.parent) {
          return {
            id: 'e' + node.id,
            source: node.parent,
            target: node.id,
          };
        }
        return null;
      })
      .filter((node: any) => node !== null);
  }, [nodesInitial]);

  useEffect(() => {
    setNodes(nodesInitial);
    setEdges(memoizedEdges);
  }, [nodesInitial, memoizedEdges, setNodes, setEdges]);

  return (
    <div className={'h-screen w-screen'}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        defaultViewport={{ x: 0, y: 0, zoom: 2 }}
        minZoom={1}
        maxZoom={4}
        attributionPosition="bottom-left"
        fitView
        fitViewOptions={{ padding: 1 }}
      >
        <Background />
        <MiniMap
          nodeColor={() => {
            return '#7f7f7f';
          }}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default UpdateNode;