import type { Node, ReactFlowInstance } from '@xyflow/react';

const VIEWPORT_DURATION = 600;
const VIEWPORT_PADDING = 0.2;
const VIEWPORT_INITIAL_MAX_ZOOM = 1.2;

export function safeFitView(
  reactFlow: ReactFlowInstance,
  options?: { retries?: number; delayMs?: number },
) {
  const retries = options?.retries ?? 8;
  const delayMs = options?.delayMs ?? 40;

  const attempt = (remaining: number) => {
    const nodes = reactFlow.getNodes();
    const hasMeasuredNodes = nodes.some(
      (node) => Boolean(node.width) && Boolean(node.height),
    );

    if (!hasMeasuredNodes && remaining > 0) {
      window.setTimeout(() => attempt(remaining - 1), delayMs);
      return;
    }

    reactFlow.fitView({
      padding: VIEWPORT_PADDING,
      includeHiddenNodes: true,
      maxZoom: VIEWPORT_INITIAL_MAX_ZOOM,
      duration: VIEWPORT_DURATION,
    });
  };

  attempt(retries);
}

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
