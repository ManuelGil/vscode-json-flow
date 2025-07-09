import { Panel } from '@xyflow/react';

import type { Direction } from '@webview/types';
import { ImageDownload } from './ImageDownload';
import { InteractivityToggle } from './InteractivityToggle';
import { ModeToggle } from './ModeToggle';
import { RotateLayout } from './RotateLayout';
import { DEFAULT_SETTINGS, Settings } from './Settings';
import { ZoomControl } from './ZoomControl';

interface CustomControlsProps {
  isDraggable: boolean;
  setIsDraggable: (value: boolean) => void;
  currentDirection: Direction;
  onLayoutRotate: () => void;
  onSettingsChange: (newSettings: typeof DEFAULT_SETTINGS) => void;
}

export function CustomControls({
  isDraggable,
  setIsDraggable,
  currentDirection,
  onLayoutRotate,
  onSettingsChange,
}: CustomControlsProps) {
  return (
    <Panel position="top-center" className="flex gap-2">
      <RotateLayout
        currentDirection={currentDirection}
        onRotate={onLayoutRotate}
      />
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
