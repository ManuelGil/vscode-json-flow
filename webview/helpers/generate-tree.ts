import type { TreeMap } from "@webview/types";

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
	[key: string]: JsonValue;
}
interface JsonArray extends Array<JsonValue> {}

function createNodeId(prefix: string, key: string): string {
	return `${prefix}-${key.toLowerCase().replace(/\s+/g, "-")}`;
}

export function generateTree(json: JsonValue, parentId = "root"): TreeMap {
	let tree: TreeMap = {};

	if (Array.isArray(json)) {
		tree[parentId] = {
			id: parentId,
			name:
				parentId === "root" ? "Root" : parentId.split("-").pop() || parentId,
			children: [],
		};

		for (const [index, value] of json.entries()) {
			if (typeof value === "object" && value !== null) {
				const objectId = createNodeId(parentId, `${index}`);
				tree = { ...tree, ...generateTree(value, objectId) };
				tree[parentId].children?.push(objectId);
			} else {
				const valueId = `${parentId}-${index}-value`;
				tree[parentId].children?.push(valueId);
				tree[valueId] = {
					id: valueId,
					name: String(value),
					data: { type: typeof value },
				};
			}
		}
	} else if (typeof json === "object" && json !== null) {
		tree[parentId] = {
			id: parentId,
			name:
				parentId === "root" ? "Root" : parentId.split("-").pop() || parentId,
			children: [],
		};

		for (const [key, value] of Object.entries(json)) {
			const keyId = createNodeId(parentId, key);
			tree[parentId].children?.push(keyId);

			tree[keyId] = {
				id: keyId,
				name: key,
				children: [],
			};

			if (typeof value === "object" && value !== null) {
				tree = { ...tree, ...generateTree(value, keyId) };
			} else {
				const valueId = `${keyId}-value`;
				tree[keyId].children?.push(valueId);
				tree[valueId] = {
					id: valueId,
					name: String(value),
					data: { type: typeof value },
				};
			}
		}
	} else {
		tree[parentId] = {
			id: parentId,
			name: String(json),
			data: { type: typeof json },
		};
	}

	return tree;
}

export function getRootId(treeData: TreeMap): string {
	const allNodes = new Set(Object.keys(treeData));

	for (const node of Object.values(treeData)) {
		if (node.children) for (const id of node.children) allNodes.delete(id);
		if (node.spouses) for (const id of node.spouses) allNodes.delete(id);
		if (node.siblings) for (const id of node.siblings) allNodes.delete(id);
	}

	if (allNodes.size === 1) {
		return Array.from(allNodes)[0];
	}

	return Object.keys(treeData)[0];
}
