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
      const n = Number.parseInt(raw.slice(6), 10);

      if (!Number.isNaN(n)) {
        tokens.push({ kind: 'depth', op, n });
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
  const label = String((node.data as Record<string, unknown>)?.label || '');
  const lowerLabel = label.toLowerCase();

  switch (token.kind) {
    case 'text':
      return lowerLabel.includes(token.value.toLowerCase());

    case 'key':
      return extractKey(label)
        .toLowerCase()
        .includes(token.value.toLowerCase());

    case 'value':
      return extractValue(label)
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
