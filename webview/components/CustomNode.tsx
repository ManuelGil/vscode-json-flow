import { Handle, Position } from '@xyflow/react';
import { Eye, EyeOff } from 'lucide-react';
import { memo } from 'react';

import { cn } from '@webview/lib';
import type { CustomNodeData } from '@webview/types';
import { Badge } from './atoms/Badge';
import { Button } from './atoms/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './molecules/Tooltip';

const { Top, Bottom, Left, Right } = Position;

const colors = {
  node: ['bg-card border-border hover:border-muted focus:ring-ring'],
  nodeSelected: 'border-primary',
  handle: ['bg-popover border-muted hover:border-primary'],
  toggleButton: ['border-muted bg-secondary hover:bg-secondary/80'],
  label: 'text-card-foreground',
  icon: 'text-muted-foreground',
};

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
  const {
    isSpouse,
    isSibling,
    label,
    direction,
    onToggleChildren,
    isCollapsed,
    id,
  } = data;
  const isHorizontal = direction === 'LR' || direction === 'RL';
  const isReversed = direction === 'BT' || direction === 'RL';

  const getTargetPosition = () => {
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
  };

  const getSourcePosition = (type: 'children' | 'spouses' | 'siblings') => {
    if (type === 'children') {
      if (isHorizontal) {
        return isReversed ? Left : Right;
      }
      return isReversed ? Top : Bottom;
    }
    if (type === 'spouses') {
      if (isHorizontal) {
        return isReversed ? Top : Bottom;
      }
      return isReversed ? Left : Right;
    }
    if (isHorizontal) {
      return isReversed ? Bottom : Top;
    }
    return isReversed ? Right : Left;
  };

  const isRootNode = data?.isRoot;
  const hasChildren = !!data?.children?.length;
  const hasSiblings = !!data?.siblings?.length;
  const hasSpouses = !!data?.spouses?.length;
  const childrenCount = data?.children?.length || 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        tabIndex={0}
        className={cn(
          'selectable relative inline-flex h-9 text-sm rounded-lg border shadow-sm w-40',
          'focus:ring-2 focus:ring-offset-0 transition-all duration-200',
          ...colors.node,
          selected && colors.nodeSelected,
        )}
      >
        {hasChildren && (
          <Handle
            type="source"
            position={getSourcePosition('children')}
            id={getSourcePosition('children')}
            className={cn(
              '!absolute w-2 h-2 border',
              ...colors.handle,
              getSourcePosition('children') === Bottom && '!bottom-[0px]',
              getSourcePosition('children') === Top && '!top-[0px]',
              getSourcePosition('children') === Left && '!left-[0px]',
              getSourcePosition('children') === Right && '!right-[0px]',
            )}
          />
        )}

        {hasSpouses && (
          <Handle
            type="source"
            position={getSourcePosition('spouses')}
            id={getSourcePosition('spouses')}
            className={cn(
              '!absolute w-2 h-2 border',
              ...colors.handle,
              getSourcePosition('spouses') === Bottom && '!bottom-[0px]',
              getSourcePosition('spouses') === Top && '!top-[0px]',
              getSourcePosition('spouses') === Left && '!left-[0px]',
              getSourcePosition('spouses') === Right && '!right-[0px]',
            )}
          />
        )}

        {hasSiblings && (
          <Handle
            type="source"
            position={getSourcePosition('siblings')}
            id={getSourcePosition('siblings')}
            className={cn(
              '!absolute w-2 h-2 border',
              ...colors.handle,
              getSourcePosition('siblings') === Bottom && '!bottom-[0px]',
              getSourcePosition('siblings') === Top && '!top-[0px]',
              getSourcePosition('siblings') === Left && '!left-[0px]',
              getSourcePosition('siblings') === Right && '!right-[0px]',
            )}
          />
        )}

        {!isRootNode && (
          <Handle
            type="target"
            position={getTargetPosition()}
            id={getTargetPosition()}
            className={cn(
              '!absolute w-2 h-2 border',
              ...colors.handle,
              getTargetPosition() === Bottom && '!bottom-[0px]',
              getTargetPosition() === Top && '!top-[0px]',
              getTargetPosition() === Left && '!left-[0px]',
              getTargetPosition() === Right && '!right-[0px]',
            )}
          />
        )}
        <div className="flex h-full w-full items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-grow items-center justify-center overflow-hidden px-4">
                <div
                  className={cn(
                    'font-medium truncate whitespace-nowrap max-w-64',
                    colors.label,
                  )}
                >
                  {label}
                </div>
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
                className={cn(
                  'h-full w-9 rounded-none rounded-r-lg p-0 shrink-0',
                  ...colors.toggleButton,
                )}
                onClick={() => onToggleChildren(id)}
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
    prevProps.data.isCollapsed === nextProps.data.isCollapsed
  );
});
