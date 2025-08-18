import type { SelectionMapper } from '../interfaces';
import { nodeIdFromOffset, rangeFromNodeId } from './jsonc-path.helper';

/**
 * Selection mapper for JSON/JSONC files.
 *
 * Delegates to tolerant helpers in `jsonc-path.helper.ts` to:
 * - map an editor offset to a route-by-indices node id, and
 * - map a node id back to a text range.
 */
export const jsonSelectionMapper: SelectionMapper = {
  nodeIdFromOffset,
  rangeFromNodeId,
};
