import { ReactFlow, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const UpdateNode = ({ nodeList }: { nodeList: any }) => {
  console.log('nodess', nodeList);
  const [nodes, setNodes, onNodesChange] = useNodesState(nodeList);
  const edge = nodeList
    .map((node: any) => {
      if (node.father) {
        return {
          id: 'e' + node.id,
          source: node.father,
          target: node.id,
        };
      } else null;
    })
    .filter((node: any) => node);
  console.log('edge', edge);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edge);

  return (
    <div className={'h-screen w-screen'}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        defaultViewport={{ x: 0, y: 0, zoom: 1.5 }}
        minZoom={1}
        maxZoom={4}
        attributionPosition="bottom-left"
        fitView
        fitViewOptions={{ padding: 0.5 }}
      ></ReactFlow>
    </div>
  );
};

export default UpdateNode;
