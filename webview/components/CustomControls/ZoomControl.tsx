import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@webview/components';
import { useNodes, useReactFlow, useViewport } from '@xyflow/react';
import { ChevronDown, Focus, Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback } from 'react';

/**
 * ZoomControl component for managing zoom and focus in the flow diagram.
 * Provides zoom in/out, fit view, and focus node actions.
 * All handlers are memoized for performance.
 */
export function ZoomControl() {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();
  const { zoom } = useViewport();
  const nodes = useNodes();

  /**
   * Sets the zoom level of the canvas.
   * Memoized for performance.
   */
  const setZoomLevel = useCallback(
    (level: number) => {
      setCenter(0, 0, { zoom: level / 100, duration: 800 });
    },
    [setCenter],
  );

  /**
   * Focuses the first node in the diagram.
   * Memoized for performance.
   */
  const focusFirstNode = useCallback(() => {
    if (nodes.length > 0) {
      const node = nodes[0];
      const width = node.measured?.width ?? 0;
      const height = node.measured?.height ?? 0;
      const x = node.position.x + width / 2;
      const y = node.position.y + height / 2;
      setCenter(x, y, { zoom: 1.5, duration: 800 });
    }
  }, [nodes, setCenter]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2"
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
