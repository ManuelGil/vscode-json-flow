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
import { Direction, Tree } from './common';
import CustomNode from './components/CustomNode';
import Loading from './components/Loading';
import { layoutElements } from './components/layout-elements';

const nodeTypes = {
  custom: CustomNode,
};

const jsonState: Record<string, Tree> = {
  '1': { id: '1', name: 'root', children: ['2', '3', '4'] },
  '2': { id: '2', name: '$schema: http://json-schema.org/draft-07/schema#' },
  '3': { id: '3', name: 'type: object' },
  '4': { id: '4', name: 'properties', children: ['5', '6', '7'] },
  '5': {
    id: '5',
    name: 'jsonFlow.files.include',
    children: ['8', '9', '10', '11'],
  },
  '6': {
    id: '6',
    name: 'jsonFlow.files.exclude',
    children: ['12', '13', '14', '15'],
  },
  '7': {
    id: '7',
    name: 'jsonFlow.files.showPath',
    children: ['16', '17', '18', '19'],
  },
  '8': { id: '8', name: 'type: array' },
  '9': {
    id: '9',
    name: 'default',
    children: [
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '28',
      '29',
      '30',
      '31',
      '32',
      '33',
    ],
  },
  '10': { id: '10', name: 'scope: resource' },
  '11': {
    id: '11',
    name: 'description: Glob patterns to include in the package.',
  },
  '12': { id: '12', name: 'type: array' },
  '13': { id: '13', name: 'default', children: ['34', '35', '36', '37', '38'] },
  '14': { id: '14', name: 'scope: resource' },
  '15': {
    id: '15',
    name: 'description: Glob patterns to exclude from the package. The default is node_modules, dist, out, build, and any hidden files.',
  },
  '16': { id: '16', name: 'type: boolean' },
  '17': { id: '17', name: 'default: true' },
  '18': { id: '18', name: 'scope: resource' },
  '19': {
    id: '19',
    name: 'description: Show the path of the file in the name of the list of generated files',
  },
  '20': { id: '20', name: '0: json' },
  '21': { id: '21', name: '1: jsonc' },
  '22': { id: '22', name: '2: json5' },
  '23': { id: '23', name: '3: cfg' },
  '24': { id: '24', name: '4: csv' },
  '25': { id: '25', name: '5: env' },
  '26': { id: '26', name: '6: hcl' },
  '27': { id: '27', name: '7: ini' },
  '28': { id: '28', name: '8: properties' },
  '29': { id: '29', name: '9: toml' },
  '30': { id: '30', name: '10: tsv' },
  '31': { id: '31', name: '11: xml' },
  '32': { id: '32', name: '12: yaml' },
  '33': { id: '33', name: '13: yml' },
  '34': { id: '34', name: '0: **/node_modules/**' },
  '35': { id: '35', name: '1: **/dist/**' },
  '36': { id: '36', name: '2: **/out/**' },
  '37': { id: '37', name: '3: **/build/**' },
  '38': { id: '38', name: '4: **/.*/**' },
};

const LayoutFlow = () => {
  // const [json] = useState(generateTree(jsonState));
  const [json] = useState(jsonState);
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
