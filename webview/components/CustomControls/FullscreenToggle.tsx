import { Button } from "@webview/components";
import { Minimize2, Maximize } from "lucide-react";
import { useCallback, useState } from "react";

export function FullscreenToggle() {
	const [isFullscreen, setIsFullscreen] = useState(false);

	const toggleFullscreen = useCallback(() => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
			setIsFullscreen(true);
		} else {
			document.exitFullscreen();
			setIsFullscreen(false);
		}
	}, []);

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={toggleFullscreen}
			tooltip={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
		>
			{isFullscreen ? <Minimize2 /> : <Maximize />}
		</Button>
	);
}
