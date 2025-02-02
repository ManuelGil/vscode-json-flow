import { Button } from "@webview/components";
import { Lock, Unlock } from "lucide-react";

interface InteractivityToggleProps {
	isInteractive: boolean;
	setIsInteractive: (value: boolean) => void;
}

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
