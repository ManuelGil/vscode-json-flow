import { useCallback, useEffect, useState } from "react";
import type { Node, NodeChange } from "@xyflow/react";
import { applyNodeChanges } from "@xyflow/react";
import { generateNodes, getAllDescendants } from "@webview/helpers";
import type { TreeMap } from "@webview/types";

export function useNodeVisibility(treeData: TreeMap) {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [hiddenNodes, setHiddenNodes] = useState(new Set<string>());

	useEffect(() => {
		const initialNodes = generateNodes(treeData);
		setNodes(initialNodes);
	}, [treeData]);

	const onNodesChange = useCallback((changes: NodeChange[]) => {
		setNodes((nds) => applyNodeChanges(changes, nds));
	}, []);

	const updateNodesVisibility = useCallback(
		(
			nodes: Node[],
			nodeId: string,
			newHidden: Set<string>,
			previousVisibility?: string[],
		) => {
			return nodes.map((node) => ({
				...node,
				data: {
					...node.data,
					previousVisibility:
						node.id === nodeId
							? previousVisibility
							: node.data?.previousVisibility,
				},
				hidden: newHidden.has(node.id),
			}));
		},
		[],
	);

	const toggleNodeVisibility = useCallback(
		(nodeId: string) => {
			setHiddenNodes((prev) => {
				const newHidden = new Set(prev);
				const descendants = getAllDescendants(nodeId, treeData);
				const directChildren = treeData[nodeId]?.children || [];

				const anyDirectChildVisible = directChildren.some(
					(id) => !prev.has(id),
				);

				if (anyDirectChildVisible) {
					const visibilityState = descendants.filter((id) => !prev.has(id));
					for (const id of descendants) {
						newHidden.add(id);
					}

					setNodes((nodes) =>
						updateNodesVisibility(nodes, nodeId, newHidden, visibilityState),
					);
				} else {
					const previousVisibility = nodes.find((n) => n.id === nodeId)?.data
						?.previousVisibility as string[] | undefined;

					if (previousVisibility?.length) {
						for (const id of previousVisibility) {
							newHidden.delete(id);
						}
					} else {
						for (const id of directChildren) {
							newHidden.delete(id);
						}
					}

					setNodes((nodes) =>
						updateNodesVisibility(nodes, nodeId, newHidden, undefined),
					);
				}

				return newHidden;
			});
		},
		[nodes, updateNodesVisibility, treeData],
	);

	const getVisibleNodes = useCallback(() => {
		return nodes.map((node) => {
			const nodeDescendants = getAllDescendants(node.id, treeData);
			return {
				...node,
				data: {
					...node.data,
					onToggleChildren: toggleNodeVisibility,
					isCollapsed: nodeDescendants.some((descendantId) =>
						hiddenNodes.has(descendantId),
					),
				},
			};
		});
	}, [nodes, hiddenNodes, toggleNodeVisibility, treeData]);

	return {
		nodes: getVisibleNodes(),
		setNodes,
		onNodesChange,
		hiddenNodes,
		toggleNodeVisibility,
	};
}
