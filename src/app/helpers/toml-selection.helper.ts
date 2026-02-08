import type { SelectionMapper } from '../interfaces';
import { envSelectionMapper } from './env-selection.helper';

/**
 * Selection mapper for TOML files.
 *
 * TOML mapping is line-oriented for our use case, so we delegate to the
 * `.env` mapper which maps offsets to JSON Pointer IDs (`/<row>`) and back to line ranges.
 */
export const tomlSelectionMapper: SelectionMapper = {
  nodeIdFromOffset: envSelectionMapper.nodeIdFromOffset,
  rangeFromNodeId: envSelectionMapper.rangeFromNodeId,
};
