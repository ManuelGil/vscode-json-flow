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
let processingCancelled = false;

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

  try {
    // Track progress for large datasets
    const totalSteps = 3; // Data parsing, node creation, edge creation
    let currentStep = 0;

    // Send progress updates
    const updateProgress = (step: number, substep = 0, totalSubsteps = 1) => {
      if (processingCancelled) {
        throw new Error('Processing cancelled');
      }

      const baseProgress = (step / totalSteps) * 100;
      const subProgress =
        substep > 0 ? (substep / totalSubsteps) * (100 / totalSteps) : 0;
      const progress = Math.min(Math.round(baseProgress + subProgress), 99); // Cap at 99% until complete

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

    // This is where the actual heavy computation happens
    // Transform JSON data structure into React Flow nodes
    const processNode = (
      data: JsonValue,
      parentId: string | null = null,
      depth = 0,
      index = 0,
    ): string => {
      // Check for processing cancellation
      if (processingCancelled) {
        throw new Error('Processing cancelled');
      }

      // Generate unique ID
      const nodeId = parentId ? `${parentId}-${index}` : `node-${index}`;

      // Process based on data type
      if (Array.isArray(data)) {
        // Array processing
        nodes.push({
          id: nodeId,
          type: 'custom', // Assuming you have a custom node type
          position: calculatePosition(
            depth,
            index,
            options?.direction || 'horizontal',
          ),
          data: {
            label: parentId ? `${index}` : 'Root Array',
            type: 'array',
            childrenCount: data.length,
            depth,
          },
        });

        // Process children with progress tracking
        data.forEach((item, idx) => {
          if (idx % 10 === 0) {
            // Update progress every 10 items to avoid too many messages
            updateProgress(currentStep, idx, data.length);
          }
          const childId = processNode(item, nodeId, depth + 1, idx);

          // Create edge to child
          edges.push({
            id: `edge-${nodeId}-${childId}`,
            source: nodeId,
            target: childId,
          });
        });
      } else if (data !== null && typeof data === 'object') {
        // Object processing
        nodes.push({
          id: nodeId,
          type: 'custom',
          position: calculatePosition(
            depth,
            index,
            options?.direction || 'horizontal',
          ),
          data: {
            label: parentId ? `${index}` : 'Root Object',
            type: 'object',
            childrenCount: Object.keys(data).length,
            depth,
          },
        });

        // Process children with progress tracking
        const keys = Object.keys(data);
        keys.forEach((key, idx) => {
          if (idx % 10 === 0) {
            // Update progress every 10 items
            updateProgress(currentStep, idx, keys.length);
          }
          const childId = processNode(data[key], nodeId, depth + 1, idx);

          // Create edge to child
          edges.push({
            id: `edge-${nodeId}-${childId}`,
            source: nodeId,
            target: childId,
          });
        });
      } else {
        // Primitive value processing
        nodes.push({
          id: nodeId,
          type: 'custom',
          position: calculatePosition(
            depth,
            index,
            options?.direction || 'horizontal',
          ),
          data: {
            label: parentId ? `${index}: ${data}` : `${data}`,
            type: typeof data as WorkerNodeData['type'],
            value: data,
            depth,
          },
        });
      }

      return nodeId;
    };

    // Begin processing from root
    processNode(parsedData);
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
      processingCancelled &&
      error instanceof Error &&
      error.message === 'Processing cancelled'
    ) {
      processingCancelled = false; // Reset for next run
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
): { x: number; y: number } {
  const spacing = 200; // Base spacing between nodes

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
 * Optimize the dataset for large JSON files by reducing visual complexity
 * while preserving important structural information
 */
function optimizeForLargeDataset(
  nodes: Node<WorkerNodeData>[],
  edges: Edge[],
  maxNodes: number,
): void {
  if (nodes.length <= maxNodes) {
    return;
  }

  // Sort nodes by importance (root nodes first, then by depth)
  nodes.sort((a, b) => {
    if (a.data.depth !== b.data.depth) {
      return a.data.depth - b.data.depth;
    }
    // Prefer nodes with more children
    return (b.data.childrenCount || 0) - (a.data.childrenCount || 0);
  });

  // Keep only the most important nodes
  const importantNodeIds = new Set(
    nodes.slice(0, maxNodes).map((node) => node.id),
  );

  // Filter nodes and edges
  const filteredNodes = nodes.filter((node) => importantNodeIds.has(node.id));
  const filteredEdges = edges.filter(
    (edge) =>
      importantNodeIds.has(edge.source) && importantNodeIds.has(edge.target),
  );

  // Replace original arrays
  nodes.length = 0;
  edges.length = 0;
  nodes.push(...filteredNodes);
  edges.push(...filteredEdges);
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
          processingCancelled = true;
        }

        // Set new active request
        activeRequestId = requestId;
        processingCancelled = false;

        // Process the JSON data
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
              nodes,
              edges,
              requestId,
              processingTime: processingTime,
              nodesCount: nodes.length,
            },
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'Processing cancelled'
          ) {
            // Silently handle cancellations
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
          processingCancelled = true;
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
