import { Panel } from '@xyflow/react';
import { ModeToggle } from './ModeToggle';
import { ImageDownload } from './ImageDownload';
import { RotateLayout } from './RotateLayout';
import { ZoomControl } from './ZoomControl';
import { InteractivityToggle } from './InteractivityToggle';
import { GoToLine } from './GoToLine';
import { Settings } from './Settings';
import type { Direction } from '@webview/types';

interface CustomControlsProps {
  isDraggable: boolean;
  setIsDraggable: (value: boolean) => void;
  currentDirection: Direction;
  onLayoutRotate: () => void;
}

export function CustomControls({
  isDraggable,
  setIsDraggable,
  currentDirection,
  onLayoutRotate,
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
      <Settings />
    </Panel>
  );
}
