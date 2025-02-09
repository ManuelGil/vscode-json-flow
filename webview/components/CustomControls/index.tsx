import { Panel } from '@xyflow/react';
import { ModeToggle } from './ModeToggle';
import { ImageDownload } from './ImageDownload';
import { RotateLayout } from './RotateLayout';
import { ZoomControl } from './ZoomControl';
import { FullscreenToggle } from './FullscreenToggle';
import { InteractivityToggle } from './InteractivityToggle';
import { GoToLine } from './GoToLine';
import { Settings } from './Settings';
interface CustomControlsProps {
  isInteractive: boolean;
  setIsInteractive: (value: boolean) => void;
  currentDirection: 'TB' | 'LR' | 'BT' | 'RL';
  onRotate: () => void;
}

export function CustomControls({
  isInteractive,
  setIsInteractive,
  currentDirection,
  onRotate,
}: CustomControlsProps) {
  return (
    <Panel position="top-center" className="flex gap-2">
      <RotateLayout currentDirection={currentDirection} onRotate={onRotate} />
      <ZoomControl />
      <InteractivityToggle
        isInteractive={isInteractive}
        setIsInteractive={setIsInteractive}
      />
      <FullscreenToggle />
      <ImageDownload />
      <ModeToggle />
      <GoToLine />
      <Settings />
    </Panel>
  );
}
