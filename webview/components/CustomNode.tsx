import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

// Tipos
interface NodeData {
  isSpouse?: boolean;
  isSibling?: boolean;
  isRoot?: boolean;
  label: string;
  direction: 'TB' | 'LR';
  children?: string[];
  siblings?: string[];
  spouses?: string[];
  [key: string]: any;  // Para otras propiedades opcionales
}

interface NodeProps {
  data: NodeData;
}

// Estilos
const nodeStyle: React.CSSProperties = {
  height: 36,
  minWidth: 150,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: '1px solid black',
  borderRadius: '4px',
};

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
      <div style={nodeStyle}>{label}</div>
    </div>
  );
});

// Nombre para DevTools
CustomNode.displayName = 'CustomNode';

export default CustomNode;