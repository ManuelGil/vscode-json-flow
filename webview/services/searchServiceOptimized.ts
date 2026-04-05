import type { InternalNode } from '@xyflow/react';
import type { GraphSnapshot } from '../types';
import {
  computeMatches as computeMatchesLegacy,
  evaluateToken,
  extractKey,
  extractValue,
  getDepth,
  parseSearchTokens,
} from './searchService';

/**
 * Optimized search using Graph indexes when available.
 * Falls back to legacy search if graphData is null.
 *
 * This function provides backward-compatible search optimization:
 * - If graphData exists: uses O(1) type/key indexes for fast filtering
 * - If graphData is null: delegates to legacy computeMatches
 * - Results are identical regardless of path taken
 *
 * @param term - Search term to parse and evaluate
 * @param nodes - React Flow nodes (for legacy fallback)
 * @param labelIndex - Label index (for legacy fallback)
 * @param graphData - Optional GraphSnapshot with indexes
 * @returns Array of matching node IDs
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
    return computeMatchesLegacy(term, nodes, labelIndex);
  }

  // Optimization: detect if we can use graph indexes
  const canUseTypeIndex = tokens.some((t) => t.kind === 'type');
  const canUseKeyIndex = tokens.some((t) => t.kind === 'key');

  // If no indexable tokens, use legacy path
  if (!canUseTypeIndex && !canUseKeyIndex) {
    return computeMatchesLegacy(term, nodes, labelIndex);
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
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const candidateNodes = Array.from(candidateIds)
      .map((id) => nodeMap.get(id))
      .filter((n): n is InternalNode => n !== undefined);

    return candidateNodes
      .filter((node) => tokens.every((token) => evaluateToken(node, token)))
      .map((node) => node.id);
  }

  // If indexes produced empty set, return empty (all tokens must match)
  if (candidateIds !== null && candidateIds.size === 0) {
    return [];
  }

  // Fallback to legacy if indexes didn't help
  return computeMatchesLegacy(term, nodes, labelIndex);
}

// Re-export utilities for backward compatibility
export { evaluateToken, extractKey, extractValue, getDepth, parseSearchTokens };
