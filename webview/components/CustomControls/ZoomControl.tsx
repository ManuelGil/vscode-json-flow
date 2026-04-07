import { GRAPH_ROOT_ID } from '@src/shared/graph-identity';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@webview/components';
import { focusNode } from '@webview/utils/viewport';
import { useReactFlow, useViewport } from '@xyflow/react';
import { ChevronDown, Focus, Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback } from 'react';

/**
 * ZoomControl component for managing zoom and focus in the flow diagram.
 * Provides zoom in/out, fit view, and focus node actions.
 * All handlers are memoized for performance.
 */
export function ZoomControl({ onFitView }: { onFitView: () => void }) {
  const reactFlow = useReactFlow();
  const { zoomIn, zoomOut } = reactFlow;
  const { zoom } = useViewport();

  /**
   * Sets the zoom level of the canvas.
   * Memoized for performance.
   */
  const setZoomLevel = useCallback(
    (level: number) => {
      reactFlow.zoomTo(level / 100, { duration: 600 });
    },
    [reactFlow],
  );

  /**
   * Focuses the first node in the diagram.
   * Memoized for performance.
   */
  const focusFirstNode = useCallback(() => {
    const allNodes = reactFlow.getNodes();
    if (!allNodes.length) {
      return;
    }

    const selectedNode = allNodes.find((n) => n.selected);
    const rootNode = allNodes.find((n) => n.id === GRAPH_ROOT_ID);

    const nodeToFocus = selectedNode ?? rootNode;

    if (nodeToFocus) {
      focusNode(reactFlow, nodeToFocus);
    }
  }, [reactFlow]);

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
        <DropdownMenuItem onClick={onFitView}>
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
