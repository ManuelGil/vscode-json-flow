import { DEFAULT_SETTINGS } from '@webview/components/CustomControls/Settings';
import { useDebounce } from '@webview/hooks/useDebounce';
import { vscodeService } from '@webview/services/vscodeService';
import type { Direction, EdgeType, JsonValue, TreeMap } from '@webview/types';
import { Edge, MarkerType } from '@xyflow/react';
import { useCallback } from 'react';

// Settings interface matches the one in CustomControls/Settings.tsx
interface Settings {
  edgeType: EdgeType;
  animated: boolean;
  hasArrow?: boolean;
  backgroundVariant?: string;
  color?: string;
}

/**
 * Flow data structure with tree data and layout information
 */
type FlowData = {
  data: JsonValue | null;
  treeData: TreeMap | null;
  orientation: Direction;
  path: string;
  fileName: string;
};

/**
 * Hook to manage flow layout rotation and settings changes.
 * Handles layout direction changes and edge appearance settings.
 *
 * @param rotateLayout - Function to rotate the layout direction
 * @param flowData - Current flow data object
 * @param setEdges - Function to update edges
 * @returns Object containing handler functions for layout rotation and settings changes
 */
export function useFlowSettings(
  rotateLayout: () => Direction,
  flowData: FlowData,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
) {
  /**
   * Handles layout direction change and updates VSCode state
   * Uses debounce to prevent excessive state updates
   */
  const updateVscodeOrientation = useCallback(
    (newDirection: Direction) => {
      const current = vscodeService.getState();
      vscodeService.saveState({
        data: flowData.data ?? null,
        orientation: newDirection,
        path: current?.path ?? flowData.path,
        fileName: current?.fileName ?? flowData.fileName,
      });
      // Also update VSCode configuration
      vscodeService.updateConfig({ orientation: newDirection });
    },
    [flowData.data, flowData.path, flowData.fileName],
  );

  // Debounced version of the VSCode state update function
  const debouncedUpdateOrientation = useDebounce(updateVscodeOrientation, 300, [
    updateVscodeOrientation,
  ]);

  const handleRotation = useCallback(() => {
    const newDirection = rotateLayout();
    // Use debounced version for VSCode communication
    debouncedUpdateOrientation(newDirection);
  }, [rotateLayout, debouncedUpdateOrientation]);

  /**
   * Handles edge settings changes
   * Uses debounce to optimize performance when settings change rapidly
   */
  const applyEdgeSettingsChange = useCallback(
    (settings: Settings) => {
      setEdges((edges) =>
        edges.map((edge) => ({
          ...edge,
          type: settings.edgeType || DEFAULT_SETTINGS.edgeType,
          animated: settings.animated,
          markerEnd: settings.hasArrow
            ? {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
              }
            : undefined,
        })),
      );
    },
    [setEdges],
  );

  // Apply debounce to edge settings changes for better performance
  const handleEdgeSettingsChange = useDebounce(applyEdgeSettingsChange, 100, [
    applyEdgeSettingsChange,
  ]);

  return {
    handleRotation,
    handleEdgeSettingsChange,
  };
}
