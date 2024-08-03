// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const UpdateNode = ({ nodess }: { nodess: any }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(nodess);

  const edge = nodess
    .map((node: any) => {
      if (node.father) {
        return {
          id: 'e' + node.id,
          source: node.father,
          target: node.id,
        };
      }
      return null;
    })
    .filter((node: any) => node !== null);

  const [edges, setEdges, onEdgesChange] = useEdgesState(edge);

  return (
    <div className={'w-screen h-screen'}>
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
      >
        <Background />
        <MiniMap
          nodeColor={(node) => {
            return '#7f7f7f';
          }}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default UpdateNode;
