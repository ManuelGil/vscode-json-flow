import {
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
} from 'lucide-react';

import { Button } from '@webview/components';

/**
 * Direction types for the RotateLayout component.
 */
type Direction = 'TB' | 'LR' | 'BT' | 'RL';

/**
 * Props for the RotateLayout component.
 */
type RotateLayoutProps = {
  /**
   * The current direction of the layout.
   */
  currentDirection: Direction;
  /**
   * Handler for the rotate button click event.
   */
  onRotate: () => void;
};

export function RotateLayout({
  currentDirection,
  onRotate,
}: RotateLayoutProps) {
  /**
   * Returns the icon for the current direction.
   */
  const getDirectionIcon = () => {
    switch (currentDirection) {
      case 'TB':
        return <AlignVerticalJustifyStart className="h-4 w-4" />;
      case 'LR':
        return <AlignHorizontalJustifyStart className="h-4 w-4" />;
      case 'BT':
        return <AlignVerticalJustifyEnd className="h-4 w-4" />;
      case 'RL':
        return <AlignHorizontalJustifyEnd className="h-4 w-4" />;
    }
  };

  const getDirectionText = () => {
    switch (currentDirection) {
      case 'TB':
        return 'Top to Bottom';
      case 'LR':
        return 'Left to Right';
      case 'BT':
        return 'Bottom to Top';
      case 'RL':
        return 'Right to Left';
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onRotate}
      tooltip={`Current: ${getDirectionText()}`}
    >
      {getDirectionIcon()}
    </Button>
  );
}
