import { Lock, Unlock } from 'lucide-react';

import { Button } from '@webview/components';

/**
 * Props for the InteractivityToggle component.
 */
type InteractivityToggleProps = {
  isInteractive: boolean;
  setIsInteractive: (value: boolean) => void;
};

export function InteractivityToggle({
  isInteractive,
  setIsInteractive,
}: InteractivityToggleProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setIsInteractive(!isInteractive)}
      tooltip="Toggle Interactivity"
    >
      {isInteractive ? <Unlock /> : <Lock />}
    </Button>
  );
}
