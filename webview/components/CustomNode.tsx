import { cn } from '@webview/lib';
import type { CustomNodeData } from '@webview/types';
import { Handle, Position } from '@xyflow/react';
import { Eye, EyeOff } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { Badge } from './atoms/Badge';
import { Button } from './atoms/Button';
import { useNodeColors } from './CustomNode/useNodeColors';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './molecules/Tooltip';

const { Top, Bottom, Left, Right } = Position;

/**
 * Props for the {@link CustomNode} component.
 *
 * @property data - The data object describing the node's properties and state.
 * @property selected - Indicates whether the node is currently selected.
 */
interface CustomNodeProps {
  data: CustomNodeData;
  selected?: boolean;
}

/**
 * CustomNode is a memoized React component representing a single node in the flow graph.
 * It visualizes node properties, handles connection points, and provides controls for collapsing/expanding children.
 * Tooltip and badge elements are used for enhanced user experience.
 *
 * @param data - The node's data object containing display and state properties.
 * @param selected - Indicates if the node is currently selected in the graph.
 * @returns The rendered node as a React element.
 */
export const CustomNode = memo<CustomNodeProps>(
  ({ data, selected }) => {
    // Use theme context for dynamic color classes
    const colors = useNodeColors();
    const {
      isSpouse,
      isSibling,
      label,
      direction,
      onToggleChildren,
      isCollapsed,
      isSearchMatch,
      id,
    } = data;
    const isHorizontal = useMemo(
      () => direction === 'LR' || direction === 'RL',
      [direction],
    );
    const isReversed = useMemo(
      () => direction === 'BT' || direction === 'RL',
      [direction],
    );

    const handleToggleChildren = useCallback(() => {
      if (onToggleChildren) {
        onToggleChildren(id);
      }
    }, [onToggleChildren, id]);

    const targetPosition = useMemo(() => {
      if (isSpouse) {
        if (isHorizontal) {
          return isReversed ? Bottom : Top;
        }
        return isReversed ? Right : Left;
      }
      if (isSibling) {
        if (isHorizontal) {
          return isReversed ? Top : Bottom;
        }
        return isReversed ? Left : Right;
      }
      if (isHorizontal) {
        return isReversed ? Right : Left;
      }
      return isReversed ? Bottom : Top;
    }, [isSpouse, isSibling, isHorizontal, isReversed]);

    const sourceChildrenPosition = useMemo(() => {
      if (isHorizontal) {
        return isReversed ? Left : Right;
      }
      return isReversed ? Top : Bottom;
    }, [isHorizontal, isReversed]);

    const sourceSpousesPosition = useMemo(() => {
      if (isHorizontal) {
        return isReversed ? Top : Bottom;
      }
      return isReversed ? Left : Right;
    }, [isHorizontal, isReversed]);

    const sourceSiblingsPosition = useMemo(() => {
      if (isHorizontal) {
        return isReversed ? Bottom : Top;
      }
      return isReversed ? Right : Left;
    }, [isHorizontal, isReversed]);

    const isRootNode = data?.isRoot;
    const hasChildren = !!data?.children?.length;
    const hasSiblings = !!data?.siblings?.length;
    const hasSpouses = !!data?.spouses?.length;
    const childrenCount = data?.children?.length || 0;

    const containerClass = useMemo(
      () =>
        cn(
          'selectable relative inline-flex h-9 text-sm rounded-lg border shadow-sm w-40',
          'focus:ring-2 focus:ring-offset-0 transition-all duration-200',
          ...colors.node,
          selected && colors.nodeSelected,
          isSearchMatch && 'ring-2 ring-primary',
        ),
      [colors.node, colors.nodeSelected, selected, isSearchMatch],
    );

    const labelClass = useMemo(
      () =>
        cn(
          'font-medium truncate whitespace-nowrap max-w-64 text-card-foreground',
          colors.label,
        ),
      [colors.label],
    );

    const childrenHandleClass = useMemo(
      () =>
        cn(
          '!absolute w-2 h-2 border',
          ...colors.handle,
          sourceChildrenPosition === Bottom && '!bottom-[0px]',
          sourceChildrenPosition === Top && '!top-[0px]',
          sourceChildrenPosition === Left && '!left-[0px]',
          sourceChildrenPosition === Right && '!right-[0px]',
        ),
      [colors.handle, sourceChildrenPosition],
    );

    const spousesHandleClass = useMemo(
      () =>
        cn(
          '!absolute w-2 h-2 border',
          ...colors.handle,
          sourceSpousesPosition === Bottom && '!bottom-[0px]',
          sourceSpousesPosition === Top && '!top-[0px]',
          sourceSpousesPosition === Left && '!left-[0px]',
          sourceSpousesPosition === Right && '!right-[0px]',
        ),
      [colors.handle, sourceSpousesPosition],
    );

    const siblingsHandleClass = useMemo(
      () =>
        cn(
          '!absolute w-2 h-2 border',
          ...colors.handle,
          sourceSiblingsPosition === Bottom && '!bottom-[0px]',
          sourceSiblingsPosition === Top && '!top-[0px]',
          sourceSiblingsPosition === Left && '!left-[0px]',
          sourceSiblingsPosition === Right && '!right-[0px]',
        ),
      [colors.handle, sourceSiblingsPosition],
    );

    const targetHandleClass = useMemo(
      () =>
        cn(
          '!absolute w-2 h-2 border',
          ...colors.handle,
          targetPosition === Bottom && '!bottom-[0px]',
          targetPosition === Top && '!top-[0px]',
          targetPosition === Left && '!left-[0px]',
          targetPosition === Right && '!right-[0px]',
        ),
      [colors.handle, targetPosition],
    );

    const toggleButtonClass = useMemo(
      () =>
        cn(
          'h-full w-9 rounded-none rounded-r-lg p-0 shrink-0',
          ...colors.toggleButton,
        ),
      [colors.toggleButton],
    );

    return (
      <TooltipProvider delayDuration={300}>
        <div tabIndex={0} className={containerClass}>
          {hasChildren && (
            <Handle
              type="source"
              position={sourceChildrenPosition}
              id={sourceChildrenPosition}
              className={childrenHandleClass}
            />
          )}

          {hasSpouses && (
            <Handle
              type="source"
              position={sourceSpousesPosition}
              id={sourceSpousesPosition}
              className={spousesHandleClass}
            />
          )}

          {hasSiblings && (
            <Handle
              type="source"
              position={sourceSiblingsPosition}
              id={sourceSiblingsPosition}
              className={siblingsHandleClass}
            />
          )}

          {!isRootNode && (
            <Handle
              type="target"
              position={targetPosition}
              id={targetPosition}
              className={targetHandleClass}
            />
          )}
          <div className="flex h-full w-full items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-grow items-center justify-center overflow-hidden px-4">
                  <div className={labelClass}>{label}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm overflow-auto whitespace-normal break-words">
                {label}
              </TooltipContent>
            </Tooltip>

            <div className="flex h-full shrink-0 items-center">
              {childrenCount > 1 && (
                <div className="flex items-center pr-1">
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {childrenCount}
                  </Badge>
                </div>
              )}
              {hasChildren && onToggleChildren && (
                <Button
                  tooltip="Toggle children"
                  variant="ghost"
                  size="icon"
                  className={toggleButtonClass}
                  onClick={handleToggleChildren}
                >
                  {isCollapsed ? (
                    <EyeOff className={colors.icon} />
                  ) : (
                    <Eye className={colors.icon} />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  },

  /**
   * Memoization comparison function for CustomNode.
   * Only triggers a re-render when critical properties change, optimizing performance for large graphs.
   *
   * @param prevProps - The previous props of the component.
   * @param nextProps - The next props of the component.
   * @returns True if the component should skip re-rendering, false otherwise.
   */
  (prevProps, nextProps) => {
    return (
      prevProps.selected === nextProps.selected &&
      prevProps.data.id === nextProps.data.id &&
      prevProps.data.label === nextProps.data.label &&
      prevProps.data.direction === nextProps.data.direction &&
      prevProps.data.isCollapsed === nextProps.data.isCollapsed &&
      prevProps.data.children?.length === nextProps.data.children?.length &&
      prevProps.data.siblings?.length === nextProps.data.siblings?.length &&
      prevProps.data.spouses?.length === nextProps.data.spouses?.length &&
      prevProps.data.isSpouse === nextProps.data.isSpouse &&
      prevProps.data.isSibling === nextProps.data.isSibling &&
      prevProps.data.isRoot === nextProps.data.isRoot &&
      prevProps.data.isSearchMatch === nextProps.data.isSearchMatch
    );
  },
);
