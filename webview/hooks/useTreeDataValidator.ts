import type { TreeMap } from '@webview/types';
import { validateTreeSafe } from '@webview/utils/validateTreeSafe';
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

    // Legacy gate kept for backward compatibility with existing behavior.
    const legacyCheck = Object.keys(safeTreeData).length > 0;
    const isValidTree = legacyCheck && validateTreeSafe(safeTreeData);

    return {
      safeTreeData,
      isValidTree,
    };
  }, [treeData]);
}
