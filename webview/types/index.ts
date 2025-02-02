export interface TreeData {
	id: string;
	label?: string;
	children?: string[];
	siblings?: string[];
	spouses?: string[];
}

export interface CustomNodeData {
	id: string;
	isSpouse?: boolean;
	isSibling?: boolean;
	label?: string;
	direction?: "TB" | "LR" | "BT" | "RL";
	isRoot?: boolean;
	children?: TreeData[];
	siblings?: TreeData[];
	spouses?: TreeData[];
	selected?: boolean;
	onToggleChildren?: (id: string) => void;
	isCollapsed?: boolean;
}

export interface TreeNode {
	id: string;
	name: string;
	type?: string;
	children?: string[];
	siblings?: string[];
	spouses?: string[];
	isSpouse?: boolean;
	isSibling?: boolean;
	data?: {
		type?: string;
		value?: string;
		homeTown?: string;
		formed?: number;
		secretBase?: string;
		active?: boolean;
	};
}

export type TreeMap = Record<string, TreeNode>;
