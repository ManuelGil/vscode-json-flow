import type { Direction } from '@webview/types';
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
import { RotateLayout } from './RotateLayout';
import { DEFAULT_SETTINGS, Settings } from './Settings';
import { ZoomControl } from './ZoomControl';

/**
 * Props for the {@link CustomControls} component.
 *
 * @property isDraggable - Indicates whether nodes in the graph are draggable.
 * @property setIsDraggable - Setter function to update the draggable state.
 * @property currentDirection - The current layout direction of the graph.
 * @property onLayoutRotate - Handler function to rotate the layout direction.
 * @property onSettingsChange - Handler function to apply new settings to the graph.
 */
type CustomControlsProps = {
  isDraggable: boolean;
  setIsDraggable: (value: boolean) => void;
  currentDirection: Direction;
  onLayoutRotate: () => void;
  onSettingsChange: (newSettings: typeof DEFAULT_SETTINGS) => void;
};

/**
 * Renders the set of custom controls for manipulating the flow graph UI.
 * This includes layout rotation, zoom, interactivity toggle, image export, theme toggle, node search, and settings.
 *
 * @param isDraggable - Indicates whether nodes are draggable.
 * @param setIsDraggable - Setter function for draggable state.
 * @param currentDirection - The current layout direction.
 * @param onLayoutRotate - Handler for rotating the layout direction.
 * @param onSettingsChange - Handler for updating graph settings.
 * @returns The rendered control panel as a React element.
 */
export function CustomControls({
  isDraggable,
  setIsDraggable,
  currentDirection,
  onLayoutRotate,
  onSettingsChange,
}: CustomControlsProps) {
  return (
    <Panel className="flex justify-between gap-2" position="top-center">
      {/* Tooltip molecule integration for RotateLayout */}
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
      <GoToSearch />
      <Settings onSettingsChange={onSettingsChange} />
    </Panel>
  );
}
