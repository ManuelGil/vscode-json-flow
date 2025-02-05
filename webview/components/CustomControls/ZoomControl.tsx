import { useReactFlow, useViewport, useNodes } from '@xyflow/react';
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@webview/components';
import { ZoomIn, ZoomOut, Maximize, Focus, ChevronDown } from 'lucide-react';

export function ZoomControl() {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();
  const { zoom } = useViewport();
  const nodes = useNodes();

  const setZoomLevel = (level: number) => {
    setCenter(0, 0, { zoom: level / 100, duration: 800 });
  };

  const focusFirstNode = () => {
    if (nodes.length > 0) {
      const node = nodes[0];
      const x = node.position.x + (node.width ?? 0) / 2;
      const y = node.position.y + (node.height ?? 0) / 2;
      setCenter(x, y, { zoom: 1.5, duration: 800 });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex gap-2 items-center"
          tooltip={`Current: ${Math.round(zoom * 100)}%`}
        >
          <span>{Math.round(zoom * 100)}%</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <div className="flex items-center px-2 py-2">
          <Input
            type="number"
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
          />
          <span className="ml-1">%</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => zoomIn()}>
          <ZoomIn className="mr-2 h-4 w-4" />
          <span>Zoom in</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => zoomOut()}>
          <ZoomOut className="mr-2 h-4 w-4" />
          <span>Zoom out</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => fitView()}>
          <Maximize className="mr-2 h-4 w-4" />
          <span>Zoom to fit</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setZoomLevel(50)}>
          <span>Zoom to 50%</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setZoomLevel(100)}>
          <span>Zoom to 100%</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setZoomLevel(200)}>
          <span>Zoom to 200%</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={focusFirstNode}>
          <Focus className="mr-2 h-4 w-4" />
          <span>Focus First Node</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
