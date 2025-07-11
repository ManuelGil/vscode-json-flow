import { Panel } from '@xyflow/react';

import type { Direction } from '@webview/types';
import { Button } from '../atoms/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../molecules/Tooltip';
import { ImageDownload } from './ImageDownload';
import { InteractivityToggle } from './InteractivityToggle';
import { ModeToggle } from './ModeToggle';
import { RotateLayout } from './RotateLayout';
import { DEFAULT_SETTINGS, Settings } from './Settings';
import { ZoomControl } from './ZoomControl';

/**
 * Props for the CustomControls component.
 */
type CustomControlsProps = {
  isDraggable: boolean;
  setIsDraggable: (value: boolean) => void;
  currentDirection: Direction;
  onLayoutRotate: () => void;
  onSettingsChange: (newSettings: typeof DEFAULT_SETTINGS) => void;
};

/**
 * CustomControls component for flow controls UI.
 * @param isDraggable - If nodes are draggable
 * @param setIsDraggable - Setter for draggable state
 * @param currentDirection - Current layout direction
 * @param onLayoutRotate - Handler to rotate layout
 * @param onSettingsChange - Handler for settings change
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
      {/* <GoToLine /> */}
      <Settings onSettingsChange={onSettingsChange} />
    </Panel>
  );
}
