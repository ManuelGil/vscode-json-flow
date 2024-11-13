import {
	ConnectionLineType,
	Controls,
	MiniMap,
	Panel,
	ReactFlow,
	addEdge,
	useEdgesState,
	useNodesState,
	Node,
	Edge,
	Connection,
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
	const [json, setJson] = useState(vscode.getState());
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
					vscode.setState(message.data);
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
				'TB'
			);
			setNodes(layoutedNodes);
			setEdges(layoutedEdges);
		}
	}, [json, setNodes, setEdges]);

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
		(direction: 'TB' | 'LR') => {
			if (!json) {
				return;
			}

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
				nodeTypes={nodeTypes}>
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
