/**
 * Node type definitions for React Flow
 */

import { CustomNode } from '@webview/components';
import type { NodeTypes } from '@xyflow/react';

/**
 * Node types mapping for React Flow.
 * Centralizes all custom node type registrations.
 */
export const nodeTypes: NodeTypes = {
  custom: CustomNode,
};
