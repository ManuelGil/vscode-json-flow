import { Handle, Position } from '@xyflow/react';
import React, { memo } from 'react';
import { NodeProps, nodeStyle } from '../common';

const { Top, Bottom, Left, Right } = Position;

const CustomNode: React.FC<NodeProps> = memo(({ data }) => {
  const { isSpouse, isSibling, label, direction } = data;

  const isTreeHorizontal = direction === 'LR';

  const getTargetPosition = (): Position => {
    if (isSpouse) {
      return isTreeHorizontal ? Top : Left;
    } else if (isSibling) {
      return isTreeHorizontal ? Bottom : Right;
    }
    return isTreeHorizontal ? Left : Top;
  };

  const isRootNode = data?.isRoot;
  const hasChildren = !!data?.children?.length;
  const hasSiblings = !!data?.siblings?.length;
  const hasSpouses = !!data?.spouses?.length;

  return (
    <div className="nodrag">
      {/* For children */}
      {hasChildren && (
        <Handle
          type="source"
          position={isTreeHorizontal ? Right : Bottom}
          id={isTreeHorizontal ? Right : Bottom}
        />
      )}

      {/* For spouses */}
      {hasSpouses && (
        <Handle
          type="source"
          position={isTreeHorizontal ? Bottom : Right}
          id={isTreeHorizontal ? Bottom : Right}
        />
      )}

      {/* For siblings */}
      {hasSiblings && (
        <Handle
          type="source"
          position={isTreeHorizontal ? Top : Left}
          id={isTreeHorizontal ? Top : Left}
        />
      )}

      {/* Target Handle */}
      {!isRootNode && (
        <Handle
          type="target"
          position={getTargetPosition()}
          id={getTargetPosition()}
        />
      )}
      <div className="node__content" style={nodeStyle}>
        {label}
      </div>
    </div>
  );
});

// Nombre para DevTools
CustomNode.displayName = 'CustomNode';

export default CustomNode;
