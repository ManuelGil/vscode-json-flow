/**
 * JsonLayoutWorker.ts
 * Web Worker for processing heavy JSON layout operations
 * Handles data transformation and node positioning to offload work from main thread
 */

/// <reference lib="webworker" />

import type { JsonValue } from '@webview/types';
// Define types for messages
import type { Edge, Node } from '@xyflow/react';

type WorkerNodeData = {
  label: string;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  childrenCount?: number;
  depth: number;
  value?: JsonValue;
};

type WorkerRequestMessage =
  | {
      type: 'PROCESS_JSON';
      payload: {
        jsonData: JsonValue | string;
        options?: {
          // Various options for layout calculations
          spacing?: number;
          direction?: 'horizontal' | 'vertical';
          optimizeForLargeData?: boolean;
          maxNodesToProcess?: number;
          compact?: boolean;
          autoTune?: boolean;
          preallocate?: boolean;
        };
        requestId: string; // Unique ID to track requests and avoid race conditions
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

// String interning to reduce memory duplication across nodes/edges
const internTable = new Map<string, string>();
function intern(str: string): string {
  const cached = internTable.get(str);
  if (cached !== undefined) {
    return cached;
  }
  internTable.set(str, str);
  return str;
}

// Safe own-property check compatible with older TS lib targets
function hasOwn(obj: object, key: PropertyKey): boolean {
  const anyObj = Object as unknown as {
    hasOwn?: (o: object, k: PropertyKey) => boolean;
  };
  if (typeof anyObj.hasOwn === 'function') {
    return anyObj.hasOwn(obj, key);
  }
  // biome-ignore lint/suspicious/noPrototypeBuiltins: fallback for older runtimes/TS lib targets
  return Object.prototype.hasOwnProperty.call(obj, key);
}
const STR_OBJECT = intern('object');
const STR_ARRAY = intern('array');
const STR_STRING = intern('string');
const STR_NUMBER = intern('number');
const STR_BOOLEAN = intern('boolean');
const STR_NULL = intern('null');
const ROOT_OBJECT_LABEL = intern('Root Object');
const ROOT_ARRAY_LABEL = intern('Root Array');

/**
 * Process JSON data and convert to nodes and edges
 * This function handles the CPU-intensive task of transforming raw JSON
 * into properly formatted and positioned nodes/edges
 */
type JsonLayoutOptions = {
  spacing?: number;
  direction?: 'horizontal' | 'vertical';
  optimizeForLargeData?: boolean;
  maxNodesToProcess?: number;
  compact?: boolean;
  autoTune?: boolean;
  preallocate?: boolean;
};

function processJsonData(
  jsonData: JsonValue | string,
  requestId: string,
  options: JsonLayoutOptions = {},
): { nodes: Node<WorkerNodeData>[]; edges: Edge[]; processingTime: number } {
  if (!jsonData) {
    throw new Error('Invalid JSON data provided');
  }

  // Start timing for performance metrics
  const startTime = performance.now();
  // Reset intern table per request to avoid unbounded growth across runs
  internTable.clear();

  try {
    // Track progress for large datasets
    const totalSteps = 3; // Data parsing, node creation, edge creation
    let currentStep = 0;

    // Send progress updates (extra throttle in compact mode to reduce main-thread churn)
    const minProgressInterval = options?.compact ? 50 : 33; // ms
    let lastProgressTime = 0;
    let lastProgressValue = -1;
    const updateProgress = (step: number, substep = 0, totalSubsteps = 1) => {
      if (processingCanceled) {
        throw new Error('Processing canceled');
      }

      const baseProgress = (step / totalSteps) * 100;
      const subProgress =
        substep > 0 ? (substep / totalSubsteps) * (100 / totalSteps) : 0;
      const progress = Math.min(Math.round(baseProgress + subProgress), 99); // Cap at 99% until complete

      // Throttle by time and minimal delta to avoid flooding the main thread
      const now = performance.now();
      const deltaTime = now - lastProgressTime;
      const deltaVal = progress - lastProgressValue;
      if (progress < 99 && deltaTime < minProgressInterval && deltaVal < 1) {
        return;
      }
      lastProgressTime = now;
      lastProgressValue = progress;

      self.postMessage({
        type: 'PROCESSING_PROGRESS',
        payload: {
          progress,
          requestId,
        },
      });
    };

    // Step 1: Parse and validate JSON (if needed)
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

    // Step 2: Generate nodes with positions
    const nodes: Node<WorkerNodeData>[] = [];
    const edges: Edge[] = [];
    // Optional preallocation: provide capacity hints to reduce reallocations
    if (
      options?.preallocate &&
      typeof options.maxNodesToProcess === 'number' &&
      options.maxNodesToProcess > 0
    ) {
      const nodeEstimate = Math.min(options.maxNodesToProcess, 1_000_000);
      const edgeEstimate = Math.min(nodeEstimate * 2, 2_000_000);
      try {
        // Capacity hinting trick for V8: temporarily increase length then reset to 0
        (nodes as unknown as { length: number }).length = nodeEstimate;
        (nodes as unknown as { length: number }).length = 0;
        (edges as unknown as { length: number }).length = edgeEstimate;
        (edges as unknown as { length: number }).length = 0;
      } catch {
        // If the engine ignores or errors on capacity hints, safely ignore
      }
    }

    // Incremental streaming buffers/thresholds (non-destructive streaming)
    let lastNodesSent = 0;
    let lastEdgesSent = 0;
    let lastPartialTime = performance.now();
    // Adaptive flushing parameters (auto-tuned unless disabled)
    // Tune initial thresholds by payload mode to reduce main-thread churn
    const isCompact = !!options?.compact;
    let partialTimeInterval = isCompact ? 120 : 80; // ms between partial flushes (initial)
    let partialMinBatch = isCompact ? 600 : 300; // minimal number of new nodes to flush by count (initial)
    const autoTune = options?.autoTune !== false; // default ON to reduce CPU overhead
    const targetInterval = isCompact ? 150 : 100; // aim interval between UI updates
    const minTimeInterval = isCompact ? 90 : 60;
    const maxTimeInterval = isCompact ? 300 : 250;
    const minBatch = isCompact ? 200 : 150;
    const maxBatch = isCompact ? 8000 : 5000;

    // Scratch arrays for compact packing (non-transferable arrays can be safely reused across posts)
    // This reduces array allocations during frequent partial flushes.
    const compactScratch = {
      nodeIds: [] as string[],
      labels: [] as string[],
      types: [] as WorkerNodeData['type'][],
      values: [] as (string | number | boolean | null)[],
      edgeSources: [] as string[],
      edgeTargets: [] as string[],
    };

    const packCompact = (
      nodeSlice: Node<WorkerNodeData>[],
      edgeSlice: Edge[],
    ) => {
      const n = nodeSlice.length;
      // Ensure scratch arrays have the correct logical length (capacity grows automatically)
      const nodeIds = compactScratch.nodeIds;
      const labels = compactScratch.labels;
      const types = compactScratch.types;
      const values = compactScratch.values;
      nodeIds.length = n;
      labels.length = n;
      types.length = n;
      values.length = n;
      // Transferable typed arrays must be freshly allocated per postMessage as buffers are neutered after transfer
      const depths = new Uint16Array(n);
      const positions = new Float32Array(n * 2);
      const childrenCounts = new Uint16Array(n);

      for (let i = 0; i < n; i++) {
        const nd = nodeSlice[i]!;
        nodeIds[i] = nd.id;
        labels[i] = nd.data.label;
        types[i] = nd.data.type;
        depths[i] = nd.data.depth as number;
        positions[i * 2] = nd.position.x;
        positions[i * 2 + 1] = nd.position.y;
        childrenCounts[i] = (nd.data.childrenCount || 0) as number;
        // Only primitives are included; otherwise null
        const t = nd.data.type;
        if (
          t === 'string' ||
          t === 'number' ||
          t === 'boolean' ||
          t === 'null'
        ) {
          values[i] =
            (nd.data.value as string | number | boolean | null | undefined) ??
            null;
        } else {
          values[i] = null;
        }
      }

      const m = edgeSlice.length;
      const edgeSources = compactScratch.edgeSources;
      const edgeTargets = compactScratch.edgeTargets;
      edgeSources.length = m;
      edgeTargets.length = m;
      for (let i = 0; i < m; i++) {
        const e = edgeSlice[i]!;
        edgeSources[i] = e.source;
        edgeTargets[i] = e.target;
      }

      return {
        nodeIds,
        labels,
        types,
        depths,
        positions,
        childrenCounts,
        values,
        edgeSources,
        edgeTargets,
      } as const;
    };

    const flushPartialIfNeeded = (force = false) => {
      const now = performance.now();
      const newNodesCount = nodes.length - lastNodesSent;
      const newEdgesCount = edges.length - lastEdgesSent;
      if (
        force ||
        newNodesCount >= partialMinBatch ||
        newEdgesCount >= partialMinBatch ||
        (now - lastPartialTime >= partialTimeInterval &&
          (newNodesCount > 0 || newEdgesCount > 0))
      ) {
        const interval = now - lastPartialTime;
        const nodesSlice = nodes.slice(lastNodesSent);
        const edgesSlice = edges.slice(lastEdgesSent);
        lastNodesSent = nodes.length;
        lastEdgesSent = edges.length;
        if (!processingCanceled) {
          if (options?.compact) {
            const compact = packCompact(nodesSlice, edgesSlice);
            self.postMessage(
              {
                type: 'PROCESSING_PARTIAL_COMPACT',
                payload: {
                  requestId,
                  ...compact,
                  totalNodesSoFar: nodes.length,
                  totalEdgesSoFar: edges.length,
                },
              },
              [
                compact.positions.buffer,
                compact.depths.buffer,
                compact.childrenCounts.buffer,
              ],
            );
          } else {
            self.postMessage({
              type: 'PROCESSING_PARTIAL',
              payload: {
                requestId,
                nodes: nodesSlice,
                edges: edgesSlice,
                totalNodesSoFar: nodes.length,
                totalEdgesSoFar: edges.length,
              },
            });
          }
          // Adaptive tuning to minimize CPU while keeping UI responsive
          if (autoTune && !force) {
            // If we flushed too frequently or with tiny batches, increase thresholds
            if (
              interval < targetInterval ||
              newNodesCount < partialMinBatch / 2
            ) {
              partialTimeInterval = Math.min(
                maxTimeInterval,
                Math.round(partialTimeInterval + 10),
              );
              partialMinBatch = Math.min(
                maxBatch,
                Math.round(partialMinBatch * 1.2),
              );
            } else if (
              interval > targetInterval * 1.6 &&
              newNodesCount > partialMinBatch * 2
            ) {
              // If we flushed too slowly with large backlog, slightly relax thresholds
              partialTimeInterval = Math.max(
                minTimeInterval,
                Math.round(partialTimeInterval - 10),
              );
              partialMinBatch = Math.max(
                minBatch,
                Math.round(partialMinBatch * 0.9),
              );
            }
          }
        }
        // Update last flush time after compute
        lastPartialTime = now;
      }
    };

    // This is where the actual heavy computation happens
    // Transform JSON data structure into React Flow nodes
    // Iterative traversal (DFS) to avoid call stack overflows on deep JSON
    type StackItem = {
      data: JsonValue;
      parentId: string | null;
      depth: number;
      index: number | string;
    };

    const visited = new WeakSet<object>();
    const stack: StackItem[] = [];
    const stackPool: StackItem[] = [];
    const allocStackItem = (
      data: JsonValue,
      parentId: string | null,
      depth: number,
      index: number | string,
    ): StackItem => {
      const item = stackPool.pop() || ({} as StackItem);
      item.data = data;
      item.parentId = parentId;
      item.depth = depth;
      item.index = index;
      return item;
    };
    stack.push(allocStackItem(parsedData, null, 0, 0));
    let processedItems = 0;
    let lastCancelCheck = performance.now();
    const cancelCheckInterval = 16; // ms

    while (stack.length > 0) {
      // Pop last for DFS order
      const current = stack.pop() as StackItem;
      const { data, parentId, depth, index } = current;

      // Cooperative cancellation checks (time-based and flag-based)
      if (processingCanceled) {
        throw new Error('Processing canceled');
      }
      const now2 = performance.now();
      if (now2 - lastCancelCheck >= cancelCheckInterval) {
        lastCancelCheck = now2;
        // Also surface progress periodically even without exact totals
        if (++processedItems % 250 === 0) {
          updateProgress(currentStep);
        }
      }

      // Generate unique ID using route-by-indices format consistent with
      // the extension host selection mappers (e.g., root-0-2-5).
      const nodeId = parentId ? `${parentId}-${index}` : 'root';

      if (Array.isArray(data)) {
        // Array node
        nodes.push({
          id: nodeId,
          type: 'custom',
          position: calculatePosition(
            depth,
            index,
            options?.direction || 'horizontal',
            options?.spacing ?? 200,
          ),
          data: {
            label: parentId ? intern(String(index)) : ROOT_ARRAY_LABEL,
            type: STR_ARRAY as WorkerNodeData['type'],
            childrenCount: data.length,
            depth,
          },
        });

        // Avoid re-traversing cyclic structures
        if (!visited.has(data)) {
          visited.add(data);
          // Push children in reverse order so they are processed in natural order (0..n-1)
          for (let i = data.length - 1; i >= 0; i--) {
            const childId = `${nodeId}-${i}`;
            edges.push({
              id: `edge-${nodeId}-${childId}`,
              source: nodeId,
              target: childId,
            });
            stack.push(
              allocStackItem(data[i] as JsonValue, nodeId, depth + 1, i),
            );
          }
        }
      } else if (data !== null && typeof data === 'object') {
        // Object node
        const obj = data as Record<string, JsonValue>;
        // Build keys list via for..in to avoid creating intermediate arrays from Object.keys
        const keys: string[] = [];
        for (const k in obj) {
          if (hasOwn(obj, k)) {
            keys.push(k);
          }
        }
        nodes.push({
          id: nodeId,
          type: 'custom',
          position: calculatePosition(
            depth,
            index,
            options?.direction || 'horizontal',
            options?.spacing ?? 200,
          ),
          data: {
            label: parentId ? intern(String(index)) : ROOT_OBJECT_LABEL,
            type: STR_OBJECT as WorkerNodeData['type'],
            childrenCount: keys.length,
            depth,
          },
        });

        if (!visited.has(data as object)) {
          visited.add(data as object);
          // Push children in reverse order for natural processing order
          for (let i = keys.length - 1; i >= 0; i--) {
            const key = keys[i];
            const childIndex = i; // maintain numeric index for id stability
            const childId = `${nodeId}-${childIndex}`;
            edges.push({
              id: `edge-${nodeId}-${childId}`,
              source: nodeId,
              target: childId,
            });
            // Note: we pass the value, label remains computed at render time using index for consistency
            stack.push(allocStackItem(obj[key], nodeId, depth + 1, childIndex));
          }
        }
      } else {
        // Primitive node
        nodes.push({
          id: nodeId,
          type: 'custom',
          position: calculatePosition(
            depth,
            index,
            options?.direction || 'horizontal',
            options?.spacing ?? 200,
          ),
          data: {
            label: intern(
              parentId ? `${index}: ${String(data)}` : String(data),
            ),
            type: (data === null
              ? STR_NULL
              : typeof data === 'string'
                ? STR_STRING
                : typeof data === 'number'
                  ? STR_NUMBER
                  : typeof data === 'boolean'
                    ? STR_BOOLEAN
                    : STR_STRING) as WorkerNodeData['type'],
            value: data,
            depth,
          },
        });
      }

      // Stream out partial results periodically to keep UI responsive
      flushPartialIfNeeded(false);
      // Recycle the popped stack item to reduce GC pressure
      stackPool.push(current);
    }

    // End of traversal
    // Ensure any remaining items are flushed prior to completion
    flushPartialIfNeeded(true);
    currentStep++;
    updateProgress(currentStep);

    // Step 3: Optimize for large datasets if needed
    if (
      options?.optimizeForLargeData &&
      nodes.length > (options?.maxNodesToProcess || 1000)
    ) {
      // Apply optimization strategies for large datasets
      optimizeForLargeDataset(nodes, edges, options?.maxNodesToProcess || 1000);
    }

    // Calculate elapsed time
    const endTime = performance.now();
    const processingTime = Math.round(endTime - startTime);

    return { nodes, edges, processingTime };
  } catch (error) {
    if (
      processingCanceled &&
      error instanceof Error &&
      error.message === 'Processing canceled'
    ) {
      processingCanceled = false; // Reset for next run
      throw error; // Re-throw for proper handling
    }
    throw error;
  }
}

/**
 * Calculate position for a node based on its depth and index
 * This helps create a visually appealing layout
 */
function calculatePosition(
  depth: number,
  index: number | string,
  direction: 'horizontal' | 'vertical',
  spacing: number = 200,
): { x: number; y: number } {
  // Base spacing between nodes (overridden via options.spacing)

  const idx = typeof index === 'number' ? index : parseInt(index) || 0;

  if (direction === 'horizontal') {
    // Horizontal tree layout (left to right)
    return {
      x: depth * spacing,
      y: idx * spacing,
    };
  } else {
    // Vertical tree layout (top to bottom)
    return {
      x: idx * spacing,
      y: depth * spacing,
    };
  }
}

/**
 * Optimize the dataset for large JSON files in a non-destructive way.
 * This implementation preserves 100% of nodes and edges and only adjusts
 * ordering to help downstream renderers perform better.
 */
function optimizeForLargeDataset(
  nodes: Node<WorkerNodeData>[],
  edges: Edge[],
  maxNodes: number,
): void {
  // Early exit for small datasets (kept for symmetry; no destructive action)
  if (nodes.length === 0) {
    return;
  }

  // Stable-sort by depth and childrenCount to improve traversal locality.
  // Note: this is non-destructive; edges remain untouched and all nodes are kept.
  nodes.sort((a, b) => {
    if (a.data.depth !== b.data.depth) {
      return a.data.depth - b.data.depth;
    }
    return (b.data.childrenCount || 0) - (a.data.childrenCount || 0);
  });
}

/**
 * Main worker message handler
 * Processes incoming messages and returns results to main thread
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

        // Process the JSON data
        try {
          const { nodes, edges, processingTime } = processJsonData(
            jsonData,
            requestId,
            options,
          );

          // Send completed result
          if (options?.compact) {
            const compact = (function () {
              const n = nodes.length;
              const m = edges.length;
              const nodeIds = new Array<string>(n);
              const labels = new Array<string>(n);
              const types = new Array<WorkerNodeData['type']>(n);
              const depths = new Uint16Array(n);
              const positions = new Float32Array(n * 2);
              const childrenCounts = new Uint16Array(n);
              const values = new Array<string | number | boolean | null>(n);
              for (let i = 0; i < n; i++) {
                const nd = nodes[i]!;
                nodeIds[i] = nd.id;
                labels[i] = nd.data.label;
                types[i] = nd.data.type;
                depths[i] = nd.data.depth as number;
                positions[i * 2] = nd.position.x;
                positions[i * 2 + 1] = nd.position.y;
                childrenCounts[i] = (nd.data.childrenCount || 0) as number;
                const t = nd.data.type;
                if (
                  t === 'string' ||
                  t === 'number' ||
                  t === 'boolean' ||
                  t === 'null'
                ) {
                  values[i] =
                    (nd.data.value as
                      | string
                      | number
                      | boolean
                      | null
                      | undefined) ?? null;
                } else {
                  values[i] = null;
                }
              }
              const edgeSources = new Array<string>(m);
              const edgeTargets = new Array<string>(m);
              for (let i = 0; i < m; i++) {
                const e = edges[i]!;
                edgeSources[i] = e.source;
                edgeTargets[i] = e.target;
              }
              return {
                nodeIds,
                labels,
                types,
                depths,
                positions,
                childrenCounts,
                values,
                edgeSources,
                edgeTargets,
              } as const;
            })();

            self.postMessage(
              {
                type: 'PROCESSING_COMPLETE_COMPACT',
                payload: {
                  requestId,
                  ...compact,
                  processingTime,
                  nodesCount: nodes.length,
                },
              },
              [
                compact.positions.buffer,
                compact.depths.buffer,
                compact.childrenCounts.buffer,
              ],
            );
          } else {
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
          }
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
