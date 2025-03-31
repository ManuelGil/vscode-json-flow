import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@webview/lib';
import { Badge, Button } from './ui';
import { Eye, EyeOff } from 'lucide-react';
import type { CustomNodeData } from '@webview/types';

const { Top, Bottom, Left, Right } = Position;

const colors = {
  node: [
    'bg-card border-border hover:border-muted focus:ring-ring',
  ],
  nodeSelected: 'border-primary',
  handle: [
    'bg-popover border-muted hover:border-primary',
  ],
  toggleButton: [
    'border-muted bg-secondary hover:bg-secondary/80'
  ],
  label: 'text-card-foreground',
  icon: 'text-muted-foreground'
};

interface CustomNodeProps {
  data: CustomNodeData;
  selected?: boolean;
}

export const CustomNode = memo<CustomNodeProps>(({ data, selected }) => {
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
    <div
      tabIndex={0}
      className={cn(
        'selectable relative inline-flex h-9 text-sm rounded-lg border shadow-sm',
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
      <div className="flex h-full gap-2">
        <div className="flex items-center px-4">
          <div className={cn('font-medium truncate', colors.label)}>
            {label}
          </div>
        </div>
        {childrenCount > 1 && (
          <div className="flex items-center">
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
            className={cn('h-full w-9 rounded-none rounded-r-lg p-0', ...colors.toggleButton)}
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
  );
});
