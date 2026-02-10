import { DEFAULT_SETTINGS } from '@webview/components/CustomControls/Settings';
import type { Direction, TreeMap } from '@webview/types';
import * as logger from '@webview/utils/logger';
import type { Edge, Node } from '@xyflow/react';
import { type EdgeSettings, layoutElementsCore } from './layout-core';

/**
 * Main-thread wrapper around the pure {@link layoutElementsCore}.
 *
 * Reads persisted edge settings from localStorage (available only on the
 * main thread) and delegates all layout computation to the shared core.
 *
 * @param tree - The tree data as a TreeMap.
 * @param rootId - The root node ID.
 * @param direction - The layout direction (default: 'TB').
 * @returns An object with arrays of nodes and edges.
 *
 * @example
 * const { nodes, edges } = layoutElements(tree, rootId, 'LR');
 */
export const layoutElements = (
  tree: TreeMap,
  rootId: string,
  direction: Direction = 'TB',
): { nodes: Node[]; edges: Edge[] } => {
  try {
    const edgeSettings: EdgeSettings = localStorage.getItem('settings')
      ? (JSON.parse(localStorage.getItem('settings')!) as EdgeSettings)
      : {
          edgeType: DEFAULT_SETTINGS.edgeType,
          animated: DEFAULT_SETTINGS.animated,
        };

    return layoutElementsCore(tree, rootId, direction, edgeSettings);
  } catch (error) {
    logger.error('Error in layoutElements:', error);
    return { nodes: [], edges: [] };
  }
};
