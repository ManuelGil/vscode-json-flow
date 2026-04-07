import type { GraphSnapshot } from '@webview/types';
import type { InternalNode } from '@xyflow/react';

/**
 * searchService.ts
 * Pure search domain logic extracted from GoToSearch component.
 * No React dependencies, no state, no side effects.
 */

export type ParsedToken =
  | { kind: 'key'; value: string }
  | { kind: 'value'; value: string }
  | { kind: 'type'; value: string }
  | { kind: 'path'; value: string }
  | { kind: 'depth'; op: '>' | '<' | '='; n: number }
  | { kind: 'text'; value: string };

const STRUCTURED_PREFIXES = ['key:', 'value:', 'type:', 'path:'] as const;

/**
 * Parses an active search term into structured tokens.
 * Tokens are separated by whitespace with implicit AND semantics.
 *
 * Supported formats: key:v, value:v, type:v, path:v, depth>n, depth<n, depth=n, plainText.
 */
export function parseSearchTokens(term: string): ParsedToken[] {
  if (!term || !term.trim()) {
    return [];
  }

  const parts = term.trim().split(/\s+/);
  const tokens: ParsedToken[] = [];

  for (const rawPart of parts) {
    const raw = rawPart.trim();
    if (!raw) {
      continue;
    }

    const lowerRaw = raw.toLowerCase();

    let matchedStructured = false;

    for (const prefix of STRUCTURED_PREFIXES) {
      if (lowerRaw.startsWith(prefix) && raw.length > prefix.length) {
        const value = raw.slice(prefix.length).trim();
        if (value.length > 0) {
          tokens.push({
            kind: prefix.slice(0, -1) as 'key' | 'value' | 'type' | 'path',
            value,
          });
          matchedStructured = true;
        }
        break;
      }
    }

    if (matchedStructured) {
      continue;
    }

    if (
      lowerRaw.startsWith('depth') &&
      raw.length > 6 &&
      ['>', '<', '='].includes(raw[5])
    ) {
      const op = raw[5] as '>' | '<' | '=';
      const depthValue = Number.parseInt(raw.slice(6), 10);

      if (!Number.isNaN(depthValue)) {
        tokens.push({ kind: 'depth', op, n: depthValue });
        continue;
      }
    }

    tokens.push({ kind: 'text', value: raw });
  }

  return tokens;
}

/** Extracts the key portion from a "key: value" label, or the full label. */
export function extractKey(label: string): string {
  const sepIdx = label.indexOf(': ');
  return sepIdx >= 0 ? label.slice(0, sepIdx) : label;
}

/** Extracts the value portion from a "key: value" label, or empty string. */
export function extractValue(label: string): string {
  const sepIdx = label.indexOf(': ');
  return sepIdx >= 0 ? label.slice(sepIdx + 2) : '';
}

// CONTRACT: Depth derived from JSON Pointer "/" segmentation.
// GRAPH_ROOT_ID must never start with "/".
/** Computes depth from a JSON Pointer node ID. Graph root sentinel returns 0. */
export function getDepth(nodeId: string): number {
  if (!nodeId.startsWith('/')) {
    return 0;
  }
  return nodeId.split('/').length - 1;
}

/**
 * Evaluates a single parsed token against a node.
 * Pure function, O(1) per call.
 * All comparisons are case-insensitive.
 */
export function evaluateToken(node: InternalNode, token: ParsedToken): boolean {
  const nodeData = (node.data as Record<string, unknown>) ?? {};
  const label = String(nodeData.label || '');
  const lowerLabel = label.toLowerCase();

  switch (token.kind) {
    case 'text':
      return lowerLabel.includes(token.value.toLowerCase());

    case 'key':
      return String(nodeData.key ?? extractKey(label))
        .toLowerCase()
        .includes(token.value.toLowerCase());

    case 'value':
      return String(nodeData.value ?? extractValue(label))
        .toLowerCase()
        .includes(token.value.toLowerCase());

    case 'type': {
      const jsonType = String(
        (node.data as Record<string, unknown>)?.type ?? '',
      ).toLowerCase();

      return jsonType === token.value.toLowerCase();
    }

    case 'path':
      return node.id.toLowerCase().includes(token.value.toLowerCase());

    case 'depth': {
      const depth = getDepth(node.id);

      if (token.op === '>') {
        return depth > token.n;
      }

      if (token.op === '<') {
        return depth < token.n;
      }

      return depth === token.n;
    }

    default:
      return false;
  }
}

/**
 * Computes matching node IDs for a search term.
 * Uses label index for fast path when applicable.
 * Returns array of node IDs that match all tokens (AND semantics).
 */
export function computeMatches(
  term: string,
  nodes: InternalNode[],
  labelIndex: Map<string, string[]>,
): string[] {
  const tokens = parseSearchTokens(term);

  if (tokens.length === 0) {
    return [];
  }

  if (!nodes.length) {
    return [];
  }

  // Fast path: single plain-text token with exact match
  if (tokens.length === 1 && tokens[0].kind === 'text') {
    const lowerVal = tokens[0].value.toLowerCase();
    if (labelIndex.has(lowerVal)) {
      return labelIndex.get(lowerVal)!;
    }
  }

  return nodes
    .filter((node) => tokens.every((token) => evaluateToken(node, token)))
    .map((node) => node.id);
}

/**
 * Computes matching node IDs using Graph indexes when available.
 * Falls back to {@link computeMatches} when indexes are unavailable or not helpful.
 *
 * Ordering and final matching semantics remain identical to the canonical path,
 * because all candidates are validated through {@link evaluateToken}.
 */
export function computeMatchesOptimized(
  term: string,
  nodes: InternalNode[],
  labelIndex: Map<string, string[]>,
  graphData: GraphSnapshot | null,
): string[] {
  const tokens = parseSearchTokens(term);

  if (tokens.length === 0) {
    return [];
  }

  if (!nodes.length) {
    return [];
  }

  // Fallback: no graph data available
  if (!graphData) {
    return computeMatches(term, nodes, labelIndex);
  }

  // Optimization: detect if we can use graph indexes
  const canUseTypeIndex = tokens.some((token) => token.kind === 'type');
  const canUseKeyIndex = tokens.some((token) => token.kind === 'key');

  // If no indexable tokens, use canonical path
  if (!canUseTypeIndex && !canUseKeyIndex) {
    return computeMatches(term, nodes, labelIndex);
  }

  // Fast path: use graph indexes to pre-filter candidates
  let candidateIds: Set<string> | null = null;

  // Apply type index filter
  for (const token of tokens) {
    if (token.kind === 'type') {
      const typeMatches =
        graphData.nodesByType.get(token.value.toLowerCase() as never) ?? [];
      if (candidateIds === null) {
        candidateIds = new Set(typeMatches);
      } else {
        const intersection = new Set<string>();
        for (const id of typeMatches) {
          if (candidateIds.has(id)) {
            intersection.add(id);
          }
        }
        candidateIds = intersection;
      }
    }
  }

  // Apply key index filter
  for (const token of tokens) {
    if (token.kind === 'key') {
      const allKeyMatches: string[] = [];
      for (const [key, nodeIds] of graphData.nodesByKey) {
        if (key.toLowerCase().includes(token.value.toLowerCase())) {
          allKeyMatches.push(...nodeIds);
        }
      }

      if (candidateIds === null) {
        candidateIds = new Set(allKeyMatches);
      } else {
        const intersection = new Set<string>();
        for (const id of allKeyMatches) {
          if (candidateIds.has(id)) {
            intersection.add(id);
          }
        }
        candidateIds = intersection;
      }
    }
  }

  // If we have candidates from indexes, filter them with remaining tokens
  if (candidateIds !== null && candidateIds.size > 0) {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const candidateNodes = Array.from(candidateIds)
      .map((id) => nodeById.get(id))
      .filter((node): node is InternalNode => node !== undefined);

    return candidateNodes
      .filter((node) => tokens.every((token) => evaluateToken(node, token)))
      .map((node) => node.id);
  }

  // If indexes produced empty set, return empty (all tokens must match)
  if (candidateIds !== null && candidateIds.size === 0) {
    return [];
  }

  // Fallback to canonical path if indexes didn't help
  return computeMatches(term, nodes, labelIndex);
}
