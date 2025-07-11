import type { TreeMap } from '@webview/types';
import { useMemo } from 'react';

/**
 * Hook to validate tree data and provide safe, validated tree data.
 * Ensures the tree data is properly structured before rendering.
 *
 * @param treeData - The raw tree data to validate
 * @returns Object containing validated tree data and validation status
 */
export function useTreeDataValidator(treeData: TreeMap | null | undefined) {
  return useMemo(() => {
    // Always treat treeData as an object (never null)
    const safeTreeData =
      treeData && typeof treeData === 'object' ? treeData : {};

    // Tree is valid if it has at least one node
    const isValidTree = Object.keys(safeTreeData).length > 0;

    return {
      safeTreeData,
      isValidTree,
    };
  }, [treeData]);
}
