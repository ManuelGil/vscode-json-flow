/**
 * JsonLayoutWorker.ts
 * Web Worker that delegates tree generation and layout to the shared
 * layout-core engine, guaranteeing structural identity with the
 * synchronous path.
 */

/// <reference lib="webworker" />

import type { Direction, JsonValue } from '@webview/types';
import type { Edge, Node } from '@xyflow/react';
import { generateTree, getRootId } from '@webview/helpers';
import {
  DEFAULT_EDGE_SETTINGS,
  layoutElementsCore,
} from '@webview/services/layout-core';

type JsonLayoutOptions = {
  direction?: 'horizontal' | 'vertical';
  compact?: boolean;
};

type WorkerRequestMessage =
  | {
      type: 'PROCESS_JSON';
      payload: {
        jsonData: JsonValue | string;
        options?: JsonLayoutOptions;
        requestId: string;
      };
    }
  | {
      type: 'CANCEL';
      payload: {
        requestId: string;
      };
    };

// Track active processing
let activeRequestId: string | null = null;
let processingCanceled = false;

const TOTAL_STEPS = 3;
const MIN_PROGRESS_INTERVAL = 33; // ms

/**
 * Maps the worker direction option to a layout Direction constant.
 * Matches the inverse of FlowCanvas: 'vertical' -> 'TB', 'horizontal' -> 'LR'.
 */
function toDirection(
  optionDir: 'horizontal' | 'vertical' | undefined,
): Direction {
  return optionDir === 'horizontal' ? 'LR' : 'TB';
}

/**
 * Processes JSON data using the shared tree generation and layout engine.
 * Produces output structurally identical to the synchronous
 * layoutElements(generateTree(json), rootId, direction) path.
 */
function processJsonData(
  jsonData: JsonValue | string,
  requestId: string,
  options: JsonLayoutOptions = {},
): { nodes: Node[]; edges: Edge[]; processingTime: number } {
  if (!jsonData) {
    throw new Error('Invalid JSON data provided');
  }

  const startTime = performance.now();
  let currentStep = 0;
  let lastProgressTime = 0;
  let lastProgressValue = -1;

  const updateProgress = (step: number): void => {
    if (processingCanceled) {
      throw new Error('Processing canceled');
    }
    const progress = Math.min(
      Math.round((step / TOTAL_STEPS) * 100),
      99,
    );
    const now = performance.now();
    if (
      progress < 99 &&
      now - lastProgressTime < MIN_PROGRESS_INTERVAL &&
      progress - lastProgressValue < 1
    ) {
      return;
    }
    lastProgressTime = now;
    lastProgressValue = progress;
    self.postMessage({
      type: 'PROCESSING_PROGRESS',
      payload: { progress, requestId },
    });
  };

  try {
    // Step 1: Parse and validate JSON
    updateProgress(0);
    let parsedData: JsonValue = jsonData as JsonValue;
    if (typeof jsonData === 'string') {
      try {
        parsedData = JSON.parse(jsonData) as JsonValue;
      } catch {
        throw new Error('Invalid JSON format');
      }
    }
    currentStep++;
    updateProgress(currentStep);

    // Cancellation check between stages
    if (processingCanceled) {
      throw new Error('Processing canceled');
    }

    // Step 2: Generate tree (same function as synchronous path)
    const treeMap = generateTree(parsedData);
    const rootId = getRootId(treeMap);
    currentStep++;
    updateProgress(currentStep);

    // Cancellation check between stages
    if (processingCanceled) {
      throw new Error('Processing canceled');
    }

    // Step 3: Compute layout (same engine as synchronous path)
    const direction: Direction = toDirection(options?.direction);
    const { nodes, edges } = layoutElementsCore(
      treeMap,
      rootId,
      direction,
      DEFAULT_EDGE_SETTINGS,
    );
    currentStep++;
    updateProgress(currentStep);

    const processingTime = Math.round(performance.now() - startTime);
    return { nodes, edges, processingTime };
  } catch (error) {
    if (
      processingCanceled &&
      error instanceof Error &&
      error.message === 'Processing canceled'
    ) {
      processingCanceled = false;
      throw error;
    }
    throw error;
  }
}

/**
 * Main worker message handler.
 * Processes incoming messages and returns results to main thread.
 */
self.onmessage = (event: MessageEvent<WorkerRequestMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'PROCESS_JSON': {
        const { jsonData, options = {}, requestId } = payload;

        // Cancel any active processing
        if (activeRequestId && activeRequestId !== requestId) {
          processingCanceled = true;
        }

        // Set new active request
        activeRequestId = requestId;
        processingCanceled = false;

        try {
          const { nodes, edges, processingTime } = processJsonData(
            jsonData,
            requestId,
            options,
          );

          // Send completed result
          self.postMessage({
            type: 'PROCESSING_COMPLETE',
            payload: {
              requestId,
              nodes,
              edges,
              processingTime,
              nodesCount: nodes.length,
            },
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'Processing canceled'
          ) {
            // Notify main thread if still the active request
            if (activeRequestId === requestId) {
              self.postMessage({
                type: 'PROCESSING_CANCELED',
                payload: { requestId },
              });
            }
          } else {
            throw error;
          }
        } finally {
          // Clear active request if it's still the same
          if (activeRequestId === requestId) {
            activeRequestId = null;
          }
        }
        break;
      }

      case 'CANCEL': {
        const { requestId } = payload;
        if (activeRequestId === requestId) {
          processingCanceled = true;
          // Immediately notify cancellation to main thread
          self.postMessage({
            type: 'PROCESSING_CANCELED',
            payload: { requestId },
          });
          activeRequestId = null;
        }
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    // Send error message back to main thread
    self.postMessage({
      type: 'PROCESSING_ERROR',
      payload: {
        error:
          error instanceof Error ? error.message : 'Unknown error in worker',
        requestId: payload.requestId || 'unknown',
      },
    });
  }
};
