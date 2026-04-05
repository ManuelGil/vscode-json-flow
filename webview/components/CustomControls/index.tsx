import type { Direction, SearchProjectionMode } from '@webview/types';
import type { InternalNode, Node } from '@xyflow/react';
import { Panel } from '@xyflow/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../molecules/Tooltip';
import { GoToSearch } from './GoToSearch';
import { ImageDownload } from './ImageDownload';
import { InteractivityToggle } from './InteractivityToggle';
import { ModeToggle } from './ModeToggle';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { RotateLayout } from './RotateLayout';
import type { SettingsConfig } from './Settings';
import { Settings } from './Settings';
import { ZoomControl } from './ZoomControl';

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
  selectedNode: Node | null;
  rootNode: Node | null;
  onNavigatePointer?: (pointer: string) => void;
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
  selectedNode,
  rootNode,
  onNavigatePointer,
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
      <ZoomControl />
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
        node={selectedNode}
        rootNode={rootNode}
        onNavigatePointer={onNavigatePointer}
      />
      <Settings onSettingsChange={onSettingsChange} />
    </Panel>
  );
}
