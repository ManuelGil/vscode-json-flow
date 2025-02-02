import { Button } from "@webview/components";
import {
	AlignVerticalJustifyStart,
	AlignVerticalJustifyEnd,
	AlignHorizontalJustifyStart,
	AlignHorizontalJustifyEnd,
} from "lucide-react";

interface RotateLayoutProps {
	currentDirection: "TB" | "LR" | "BT" | "RL";
	onRotate: () => void;
}

export function RotateLayout({
	currentDirection,
	onRotate,
}: RotateLayoutProps) {
	const getDirectionIcon = () => {
		switch (currentDirection) {
			case "TB":
				return <AlignVerticalJustifyStart className="h-4 w-4" />;
			case "LR":
				return <AlignHorizontalJustifyStart className="h-4 w-4" />;
			case "BT":
				return <AlignVerticalJustifyEnd className="h-4 w-4" />;
			case "RL":
				return <AlignHorizontalJustifyEnd className="h-4 w-4" />;
		}
	};

	const getDirectionText = () => {
		switch (currentDirection) {
			case "TB":
				return "Top to Bottom";
			case "LR":
				return "Left to Right";
			case "BT":
				return "Bottom to Top";
			case "RL":
				return "Right to Left";
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
