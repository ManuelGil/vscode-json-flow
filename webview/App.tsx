import {
  Background,
  BackgroundVariant,
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { generateTree } from './tree.helper';
import { Direction } from './common';
import CustomNode from './components/CustomNode';
import Loading from './components/Loading';
import { layoutElements } from './components/layout-elements';

const nodeTypes = {
  custom: CustomNode,
};

const jsonState = {
  'squadName': 'Super hero squad',
  'homeTown': 'Metro City',
  'formed': 2016,
  'secretBase': 'Super tower',
  'active': true,
  'members': [
    {
      'name': 'Molecule Man',
      'age': 29,
      'secretIdentity': 'Dan Jukes',
      'powers': ['Radiation resistance', 'Turning tiny', 'Radiation blast'],
    },
    {
      'name': 'Madame Uppercut',
      'age': null,
      'secretIdentity': 'Jane Wilson',
      'powers': [
        'Million tonne punch',
        'Damage resistance',
        'Superhuman reflexes',
      ],
    },
    {
      'name': 'Eternal Flame',
      'age': 1000000,
      'secretIdentity': 'Unknown',
      'powers': [
        'Immortality',
        'Heat Immunity',
        'Inferno',
        'Teleportation',
        'Interdimensional travel',
      ],
    },
  ],
};

const LayoutFlow = () => {
  const [json] = useState(generateTree(jsonState));
  const [layoutDirection, setLayoutDirection] = useState<Direction>('TB');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const flowContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (json) {
      const treeRootId = 1;
      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
        json,
        treeRootId,
        layoutDirection,
      );
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [json, layoutDirection, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: ConnectionLineType.SmoothStep, animated: true },
          eds,
        ),
      ),
    [setEdges],
  );

  const onLayout = useCallback(
    (direction: Direction) => {
      if (!json) {
        return;
      }

      setLayoutDirection(direction);

      const treeRootId = 1;
      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutElements(
        json,
        treeRootId,
        direction,
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [json, setNodes, setEdges],
  );

  const handleSaveImage = async () => {
    if (flowContainerRef.current) {
      try {
        // Temporarily hide the controls
        const controls = flowContainerRef.current.querySelectorAll(
          '.react-flow__panel, .react-flow__controls, .react-flow__minimap, .react-flow__background',
        );
        controls.forEach((control) => {
          (control as HTMLElement).style.display = 'none';
        });

        // Show the controls again
        controls.forEach((control) => {
          (control as HTMLElement).style.display = 'block';
        });
      } catch (error) {
        console.error('Error generating image:', error);
      }
    }
  };

  if (!json) {
    return <Loading />;
  }

  return (
    <div ref={flowContainerRef} className="h-screen w-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        nodeTypes={nodeTypes}
        minZoom={-1}
      >
        <Background
          id="1"
          gap={10}
          color="#f1f1f1"
          variant={BackgroundVariant.Lines}
        />
        <MiniMap />
        <Controls />
        <Panel className="flex justify-between gap-2" position="top-right">
          <button onClick={handleSaveImage}>save as image</button>
          <button onClick={() => onLayout('TB')}>vertical layout</button>
          <button onClick={() => onLayout('LR')}>horizontal layout</button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default LayoutFlow;
