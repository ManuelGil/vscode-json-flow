/**
 * Worker message contracts shared between the Web Worker and the main thread.
 *
 * Keeping these in a single place prevents drift between the producer (worker)
 * and the consumer (webview hook) and improves type-safety.
 */
import type { Edge, Node } from '@xyflow/react';

/**
 * Message emitted when the worker completes processing the layout.
 */
export type WorkerProcessingComplete = {
  type: 'PROCESSING_COMPLETE';
  payload: {
    requestId: string;
    nodes: Node[];
    edges: Edge[];
    processingTime: number;
    nodesCount: number;
  };
};

/**
 * Message emitted as progress updates during processing.
 */
export type WorkerProcessingProgress = {
  type: 'PROCESSING_PROGRESS';
  payload: { requestId: string; progress: number };
};

/**
 * Message emitted when the worker encounters an error.
 */
export type WorkerProcessingError = {
  type: 'PROCESSING_ERROR';
  payload: { requestId: string; error: string };
};

/**
 * Discriminated union of all worker-to-main messages.
 */
export type WorkerMessage =
  | WorkerProcessingComplete
  | WorkerProcessingProgress
  | WorkerProcessingError;
