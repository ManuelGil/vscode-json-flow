/**
 * Node type definitions for React Flow
 */
import type { NodeTypes } from '@xyflow/react';

import { CustomNode } from '@webview/components';

/**
 * Node types mapping for React Flow.
 * Centralizes all custom node type registrations.
 */
export const nodeTypes: NodeTypes = {
  custom: CustomNode,
};
