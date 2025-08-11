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
 * Message emitted when the current processing request is cancelled.
 */
export type WorkerProcessingCancelled = {
  type: 'PROCESSING_CANCELLED';
  payload: { requestId: string };
};

/**
 * Message emitted with incremental partial results while processing.
 * The worker may send multiple of these before the final PROCESSING_COMPLETE.
 * Consumers should merge nodes/edges by simple append in order of arrival.
 */
export type WorkerProcessingPartial = {
  type: 'PROCESSING_PARTIAL';
  payload: {
    requestId: string;
    nodes: Node[];
    edges: Edge[];
    totalNodesSoFar: number;
    totalEdgesSoFar: number;
  };
};

/**
 * Discriminated union of all worker-to-main messages.
 */
export type WorkerMessage =
  | WorkerProcessingComplete
  | WorkerProcessingProgress
  | WorkerProcessingError
  | WorkerProcessingCancelled
  | WorkerProcessingPartial
  | WorkerProcessingCompleteCompact
  | WorkerProcessingPartialCompact;

/**
 * Compact payload variants for transferable-friendly streaming.
 * These are sent only when the worker runs in compact mode.
 */
export type WorkerProcessingPartialCompact = {
  type: 'PROCESSING_PARTIAL_COMPACT';
  payload: {
    requestId: string;
    // Nodes compact
    nodeIds: string[];
    labels: string[];
    types: Array<'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'>;
    depths: Uint16Array; // transferable
    positions: Float32Array; // transferable, [x0,y0,x1,y1,...]
    childrenCounts: Uint16Array; // transferable
    values: Array<string | number | boolean | null>; // primitives only; null when not applicable
    // Edges compact (string ids for compatibility)
    edgeSources: string[];
    edgeTargets: string[];
    totalNodesSoFar: number;
    totalEdgesSoFar: number;
  };
};

export type WorkerProcessingCompleteCompact = {
  type: 'PROCESSING_COMPLETE_COMPACT';
  payload: {
    requestId: string;
    nodeIds: string[];
    labels: string[];
    types: Array<'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'>;
    depths: Uint16Array; // transferable
    positions: Float32Array; // transferable
    childrenCounts: Uint16Array; // transferable
    values: Array<string | number | boolean | null>;
    edgeSources: string[];
    edgeTargets: string[];
    processingTime: number;
    nodesCount: number;
  };
};
