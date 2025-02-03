import { Position } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import { layoutFromMap } from "entitree-flex";
import type { TreeMap } from "@webview/types";

const nodeWidth = 150;
const nodeHeight = 36;

const Orientation = {
	Vertical: "vertical",
	Horizontal: "horizontal",
} as const;

type OrientationType = (typeof Orientation)[keyof typeof Orientation];
type Direction = "TB" | "LR" | "BT" | "RL";

interface EntitreeNode {
	id: string;
	name: string;
	x: number;
	y: number;
	isSpouse?: boolean;
	isSibling?: boolean;
}

interface EntitreeEdge {
	source: {
		id: string;
	};
	target: {
		id: string;
		isSpouse?: boolean;
		isSibling?: boolean;
	};
}

interface EntitreeSettings {
	clone: boolean;
	enableFlex: boolean;
	firstDegreeSpacing: number;
	nextAfterAccessor: string;
	nextAfterSpacing: number;
	nextBeforeAccessor: string;
	nextBeforeSpacing: number;
	nodeHeight: number;
	nodeWidth: number;
	orientation: OrientationType;
	rootX: number;
	rootY: number;
	secondDegreeSpacing: number;
	sourcesAccessor: string;
	sourceTargetSpacing: number;
	targetsAccessor: string;
}

const entitreeSettings: EntitreeSettings = {
	clone: true,
	enableFlex: true,
	firstDegreeSpacing: 100,
	nextAfterAccessor: "spouses",
	nextAfterSpacing: 100,
	nextBeforeAccessor: "siblings",
	nextBeforeSpacing: 100,
	nodeHeight,
	nodeWidth,
	orientation: Orientation.Vertical,
	rootX: 0,
	rootY: 0,
	secondDegreeSpacing: 100,
	sourcesAccessor: "parents",
	sourceTargetSpacing: 100,
	targetsAccessor: "children",
};

const { Top, Bottom, Left, Right } = Position;

export const layoutElements = (
	tree: TreeMap,
	rootId: string,
	direction: Direction = "TB",
): { nodes: Node[]; edges: Edge[] } => {
	const isHorizontal = direction === "LR" || direction === "RL";
	const isReversed = direction === "BT" || direction === "RL";

	const { nodes: entitreeNodes, rels: entitreeEdges } = layoutFromMap(
		rootId,
		tree,
		{
			...entitreeSettings,
			orientation: isHorizontal ? Orientation.Horizontal : Orientation.Vertical,
		},
	);

	const nodes: Node[] = [];
	const edges: Edge[] = [];

	for (const edge of entitreeEdges as EntitreeEdge[]) {
		const sourceNode = edge.source.id;
		const targetNode = edge.target.id;

		const newEdge: Edge = {
			id: `e${sourceNode}${targetNode}`,
			source: sourceNode,
			target: targetNode,
			type: "smoothstep",
			animated: true,
			sourceHandle: undefined,
			targetHandle: undefined,
		};

		const isTargetSpouse = !!edge.target.isSpouse;
		const isTargetSibling = !!edge.target.isSibling;

		if (isTargetSpouse) {
			if (isHorizontal) {
				newEdge.sourceHandle = isReversed ? Top : Bottom;
				newEdge.targetHandle = isReversed ? Bottom : Top;
			} else {
				newEdge.sourceHandle = isReversed ? Left : Right;
				newEdge.targetHandle = isReversed ? Right : Left;
			}
		} else if (isTargetSibling) {
			if (isHorizontal) {
				newEdge.sourceHandle = isReversed ? Bottom : Top;
				newEdge.targetHandle = isReversed ? Top : Bottom;
			} else {
				newEdge.sourceHandle = isReversed ? Right : Left;
				newEdge.targetHandle = isReversed ? Left : Right;
			}
		} else {
			if (isHorizontal) {
				newEdge.sourceHandle = isReversed ? Left : Right;
				newEdge.targetHandle = isReversed ? Right : Left;
			} else {
				newEdge.sourceHandle = isReversed ? Top : Bottom;
				newEdge.targetHandle = isReversed ? Bottom : Top;
			}
		}

		edges.push(newEdge);
	}

	for (const node of entitreeNodes as EntitreeNode[]) {
		const isSpouse = !!node.isSpouse;
		const isSibling = !!node.isSibling;
		const isRoot = node.id === rootId;

		const newNode: Node = {
			id: node.id,
			type: "custom",
			position: {
				x: isReversed && isHorizontal ? -node.x : node.x,
				y: isReversed && !isHorizontal ? -node.y : node.y,
			},
			data: {
				label: node.name,
				direction,
				isRoot,
				line: tree[node.id]?.data?.line,
				...node,
			},
			width: nodeWidth,
			height: nodeHeight,
			sourcePosition: undefined,
			targetPosition: undefined,
		};

		if (isSpouse) {
			if (isHorizontal) {
				newNode.sourcePosition = isReversed ? Top : Bottom;
				newNode.targetPosition = isReversed ? Bottom : Top;
			} else {
				newNode.sourcePosition = isReversed ? Left : Right;
				newNode.targetPosition = isReversed ? Right : Left;
			}
		} else if (isSibling) {
			if (isHorizontal) {
				newNode.sourcePosition = isReversed ? Bottom : Top;
				newNode.targetPosition = isReversed ? Top : Bottom;
			} else {
				newNode.sourcePosition = isReversed ? Right : Left;
				newNode.targetPosition = isReversed ? Left : Right;
			}
		} else {
			if (isHorizontal) {
				newNode.sourcePosition = isReversed ? Left : Right;
				newNode.targetPosition = isReversed ? Right : Left;
			} else {
				newNode.sourcePosition = isReversed ? Top : Bottom;
				newNode.targetPosition = isReversed ? Bottom : Top;
			}
		}

		nodes.push(newNode);
	}

	return { nodes, edges };
};
