import { Position } from '@xyflow/react';
import React from 'react';

export enum Orientation {
  Vertical = 'vertical',
  Horizontal = 'horizontal',
}

let webviewConfiguration;

if (!window.webviewConfiguration) {
  webviewConfiguration = {
    nodeWidth: 200,
    nodeHeight: 50,
    nodeBorderColor: 'white',
    nodeColor: 'white',
    edgeColor: 'white',
    orientation: Orientation.Vertical,
  };
} else {
  webviewConfiguration = {
    ...window.webviewConfiguration,
    orientation:
      window.webviewConfiguration.layoutDirection === 'LR'
        ? Orientation.Horizontal
        : Orientation.Vertical,
  };
}

export const config = webviewConfiguration;

export const nodeStyle: React.CSSProperties = {
  minHeight: config.nodeHeight,
  minWidth: config.nodeWidth,
  borderColor: config.nodeBorderColor,
  color: config.nodeColor,
};

export const edgeStyle: React.CSSProperties = {
  stroke: config.edgeColor,
};

export const entitreeSettings = {
  clone: true,
  enableFlex: true,
  firstDegreeSpacing: 100,
  nextAfterAccessor: 'spouses',
  nextAfterSpacing: 100,
  nextBeforeAccessor: 'siblings',
  nextBeforeSpacing: 100,
  nodeHeight: config.nodeHeight,
  nodeWidth: config.nodeWidth,
  orientation: config.orientation,
  rootX: 0,
  rootY: 0,
  secondDegreeSpacing: 100,
  sourcesAccessor: 'parents',
  sourceTargetSpacing: 100,
  targetsAccessor: 'children',
};

export type Direction = 'TB' | 'LR';

export type StateType = {
  json: Record<string, Tree> | null;
  layoutDirection: Direction;
};

export interface Coordinates {
  x: number;
  y: number;
}

export interface BaseNode {
  id: string;
  name: string;
  isSpouse?: boolean;
  isSibling?: boolean;
  x?: number;
  y?: number;
  children?: string[];
  parents?: string[];
  siblings?: string[];
  spouses?: string[];
}

export interface Tree extends BaseNode {
  [key: string]: unknown;
}

export interface EntitreeNode extends BaseNode {
  x: number;
  y: number;
}

export interface EntitreeEdge {
  source: BaseNode;
  target: BaseNode;
}

export interface LayoutNode {
  id: string;
  type: string;
  width: number;
  height: number;
  position: Coordinates;
  sourcePosition: Position;
  targetPosition: Position;
  data: {
    label: string;
    direction: Direction;
    isRoot: boolean;
    [key: string]: unknown;
  };
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated: boolean;
  sourceHandle: Position;
  targetHandle: Position;
  style: React.CSSProperties;
}

export interface EntitreeResult {
  nodes: EntitreeNode[];
  rels: EntitreeEdge[];
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

export interface NodeData {
  isSpouse?: boolean;
  isSibling?: boolean;
  isRoot?: boolean;
  label: string;
  direction: 'TB' | 'LR';
  children?: string[];
  siblings?: string[];
  spouses?: string[];
  [key: string]: unknown;
}

export interface NodeProps {
  data: NodeData;
}
