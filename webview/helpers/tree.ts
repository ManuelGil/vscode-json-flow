
import type { Node } from "@xyflow/react";
import type { TreeMap, TreeData } from "@webview/types";
import { layoutElements } from "./layout-elements";
import { getRootId } from "./generate-tree";

export function getAllDescendants(
	nodeId: string,
	tree: Record<string, TreeData>,
): string[] {
	const descendants: string[] = [];
	const node = tree[nodeId];

	if (!node?.children?.length) {
		return descendants;
	}

	for (const childId of node.children) {
		descendants.push(childId);
		descendants.push(...getAllDescendants(childId, tree));
	}

	return descendants;
}

export function generateNodes(treeData: TreeMap): Node[] {
	const rootId = getRootId(treeData);
	const { nodes } = layoutElements(treeData, rootId, "TB");
	return nodes;
}
