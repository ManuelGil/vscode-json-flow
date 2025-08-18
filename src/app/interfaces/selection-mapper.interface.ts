/**
 * Half-open range within a text buffer.
 * `start` is inclusive, `end` is exclusive.
 */
export interface TextRange {
  start: number;
  end: number; // exclusive end
}

/**
 * Maps between editor offsets and graph node IDs for a specific format.
 */
export interface SelectionMapper {
  /**
   * Given the full document text and a byte/char offset, return a route-by-indices node ID.
   */
  nodeIdFromOffset(text: string, offset: number): string | undefined;
  /**
   * Given the full document text and a route-by-indices node ID, return the corresponding range.
   */
  rangeFromNodeId(text: string, nodeId: string): TextRange | undefined;
}
