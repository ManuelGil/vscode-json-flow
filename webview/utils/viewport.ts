import type { Node, ReactFlowInstance } from '@xyflow/react';

const VIEWPORT_DURATION = 600;
const VIEWPORT_PADDING = 0.2;
const VIEWPORT_INITIAL_MAX_ZOOM = 1.2;

export function fitGraph(reactFlow: ReactFlowInstance) {
  reactFlow.fitView({
    padding: VIEWPORT_PADDING,
    includeHiddenNodes: true,
    maxZoom: VIEWPORT_INITIAL_MAX_ZOOM,
    duration: VIEWPORT_DURATION,
  });
}

export function focusNode(reactFlow: ReactFlowInstance, node: Node) {
  if (!node?.position) {
    return;
  }

  const width = node.width ?? node.measured?.width ?? 0;
  const height = node.height ?? node.measured?.height ?? 0;

  const centerX = node.position.x + width / 2;
  const centerY = node.position.y + height / 2;

  reactFlow.setCenter(centerX, centerY, {
    zoom: VIEWPORT_INITIAL_MAX_ZOOM,
    duration: VIEWPORT_DURATION,
  });
}
