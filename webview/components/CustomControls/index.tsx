import { GoToSearch } from '@webview/components/CustomControls/GoToSearch';
import { ImageDownload } from '@webview/components/CustomControls/ImageDownload';
import { InteractivityToggle } from '@webview/components/CustomControls/InteractivityToggle';
import { ModeToggle } from '@webview/components/CustomControls/ModeToggle';
import { NodePropertiesPanel } from '@webview/components/CustomControls/NodePropertiesPanel';
import { RotateLayout } from '@webview/components/CustomControls/RotateLayout';
import {
  Settings,
  type SettingsConfig,
} from '@webview/components/CustomControls/Settings';
import { ZoomControl } from '@webview/components/CustomControls/ZoomControl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@webview/components/molecules/Tooltip';
import type { Direction, SearchProjectionMode } from '@webview/types';
import type { InternalNode, Node } from '@xyflow/react';
import { Panel } from '@xyflow/react';

/**
 * Props for the {@link CustomControls} component.
 */
type CustomControlsProps = {
  isDraggable: boolean;
  setIsDraggable: (value: boolean) => void;
  currentDirection: Direction;
  onLayoutRotate: () => void;
  onSettingsChange: (newSettings: SettingsConfig) => void;
  nodes: InternalNode[];
  searchableNodes: InternalNode[];
  allNodes?: InternalNode[];
  searchProjectionMode: SearchProjectionMode;
  onSearchProjectionModeChange: (mode: SearchProjectionMode) => void;
  onSearchMatchChange?: (matchedIds: Set<string>) => void;
  selectedNodeId: string | null;
  selectedNode: Node | null;
  rootNode: Node | null;
  canEdit: boolean;
  languageId: string;
  onFitView: () => void;
  onFocusNode?: (nodeId: string) => void;
};

/**
 * Renders the set of custom controls for manipulating the flow graph UI.
 */
export function CustomControls({
  isDraggable,
  setIsDraggable,
  currentDirection,
  onLayoutRotate,
  onSettingsChange,
  nodes,
  searchableNodes,
  allNodes,
  searchProjectionMode,
  onSearchProjectionModeChange,
  onSearchMatchChange,
  selectedNodeId,
  selectedNode,
  rootNode,
  canEdit,
  languageId,
  onFitView,
  onFocusNode,
}: CustomControlsProps) {
  return (
    <Panel className="flex justify-between gap-2" position="top-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <RotateLayout
                currentDirection={currentDirection}
                onRotate={onLayoutRotate}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>Rotate the layout direction</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ZoomControl onFitView={onFitView} />
      <InteractivityToggle
        isInteractive={isDraggable}
        setIsInteractive={setIsDraggable}
      />
      <ImageDownload />
      <ModeToggle />
      <GoToSearch
        nodes={nodes}
        searchableNodes={searchableNodes}
        allNodes={allNodes}
        searchProjectionMode={searchProjectionMode}
        onSearchProjectionModeChange={onSearchProjectionModeChange}
        onMatchChange={onSearchMatchChange}
      />
      <NodePropertiesPanel
        selectedNodeId={selectedNodeId}
        node={selectedNode}
        rootNode={rootNode}
        allNodes={allNodes}
        canEdit={canEdit}
        languageId={languageId}
        onFocusNode={onFocusNode}
      />
      <Settings onSettingsChange={onSettingsChange} />
    </Panel>
  );
}
