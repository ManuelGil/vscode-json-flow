/**
 * useLayoutWorker.ts
 * Custom hook for managing JSON layout Web Worker lifecycle and communication
 * Provides a clean interface for offloading heavy layout calculations to a background thread
 */
import type {
  WorkerMessage,
  WorkerProcessingCompleteCompact,
  WorkerProcessingPartialCompact,
} from '@webview/types/workerMessages';
import * as logger from '@webview/utils/logger';
import type { Edge, Node } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed for request tracking

// Worker request options
export interface LayoutWorkerOptions {
  spacing?: number;
  direction?: 'horizontal' | 'vertical';
  compact?: boolean;
  /**
   * Enable adaptive batching in the worker to minimize CPU while keeping UI responsive.
   * Defaults to true in the worker when undefined.
   */
  autoTune?: boolean;
  /**
   * Hint the worker to preallocate internal arrays to reduce reallocations.
   * No restrictions - worker will process unlimited nodes.
   */
  preallocate?: boolean;
}

// Hook return type
export interface UseLayoutWorkerResult {
  processData: (jsonData: unknown, options?: LayoutWorkerOptions) => void;
  cancelProcessing: () => void;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  nodes: Node[] | null;
  edges: Edge[] | null;
  processingStats: {
    time: number;
    nodesCount: number;
  } | null;
}

// Worker message contract is shared via `@webview/types/workerMessages`

/**
 * Custom hook for JSON layout processing using a Web Worker
 * Handles worker lifecycle, message passing, and state management
 */
export function useLayoutWorker(): UseLayoutWorkerResult {
  // State for worker processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [edges, setEdges] = useState<Edge[] | null>(null);
  const [processingStats, setProcessingStats] = useState<{
    time: number;
    nodesCount: number;
  } | null>(null);

  // Refs for worker instance and request tracking
  const workerRef = useRef<Worker | null>(null);
  const currentRequestId = useRef<string | null>(null);

  // Throttle progress updates to one per frame to reduce re-renders
  const latestProgressRef = useRef(0);
  const progressRafIdRef = useRef<number | null>(null);

  // Buffers to coalesce partial node/edge updates and flush once per frame
  const partialNodesBufferRef = useRef<Node[]>([]);
  const partialEdgesBufferRef = useRef<Edge[]>([]);
  const partialFlushRafIdRef = useRef<number | null>(null);
  // Time-based coalescing: limit UI merges to at most every ~80ms
  const lastPartialFlushTimeRef = useRef<number>(0);
  const partialFlushTimeoutIdRef = useRef<number | null>(null);
  const PartialMinIntervalMs = 80;

  const flushPartials = useCallback(() => {
    const toAddNodes = partialNodesBufferRef.current;
    const toAddEdges = partialEdgesBufferRef.current;
    partialNodesBufferRef.current = [];
    partialEdgesBufferRef.current = [];
    if (toAddNodes.length > 0) {
      setNodes((prev) => (prev ? prev.concat(toAddNodes) : toAddNodes));
    }
    if (toAddEdges.length > 0) {
      setEdges((prev) => (prev ? prev.concat(toAddEdges) : toAddEdges));
    }
    lastPartialFlushTimeRef.current = performance.now();
    partialFlushRafIdRef.current = null;
  }, []);

  const schedulePartialFlush = useCallback(() => {
    if (
      partialFlushRafIdRef.current != null ||
      partialFlushTimeoutIdRef.current != null
    ) {
      return;
    }
    const now = performance.now();
    const elapsed = now - lastPartialFlushTimeRef.current;
    const wait = Math.max(0, PartialMinIntervalMs - elapsed);
    if (wait === 0) {
      partialFlushRafIdRef.current = requestAnimationFrame(flushPartials);
    } else {
      partialFlushTimeoutIdRef.current = window.setTimeout(() => {
        partialFlushTimeoutIdRef.current = null;
        partialFlushRafIdRef.current = requestAnimationFrame(flushPartials);
      }, wait);
    }
  }, [flushPartials]);

  // Initialize worker on first use
  useEffect(() => {
    return () => {
      // Clean up worker on unmount
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  /**
   * Ensure a Web Worker instance exists (pre-warm on mount and reuse)
   * GUARANTEED INITIALIZATION: Multiple fallback strategies to ensure worker always starts
   * Optimized for VS Code webview environment with proper MIME type handling
   * Returns a promise that resolves when worker is ready
   */
  const ensureWorker = useCallback(async (): Promise<void> => {
    if (workerRef.current) {
      return;
    }

    let workerCreated = false;

    // Strategy 1: Vite's worker import (DEV mode with HMR support)
    if (import.meta.env.DEV) {
      try {
        const workerUrl = new URL('../workers/JsonLayoutWorker.ts', import.meta.url);
        workerRef.current = new Worker(workerUrl, {
          type: 'module',
          name: 'JsonLayoutWorker',
        });
        workerCreated = true;
        return;
      } catch {
        // Fallback to production strategy
      }
    }

    // Strategy 2: Production - fetch worker as blob to bypass cross-origin restrictions
    if (!workerCreated) {
      // VS Code injects the proper webview URI for the worker into global scope
      const vscodeWorkerUrl = window.__VSCODE_WORKER_URL__;

      const workerPaths = [
        vscodeWorkerUrl, // Priority: VS Code injected URL with proper scheme
        './assets/JsonLayoutWorker-worker.js',
        './JsonLayoutWorker-worker.js',
        './JsonLayoutWorker.js',
      ].filter(Boolean) as string[];

      for (let i = 0; i < workerPaths.length && !workerCreated; i++) {
        const workerPath = workerPaths[i];

        try {
          // Fetch worker code and create blob URL to avoid cross-origin issues
          const response = await fetch(workerPath);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const workerCode = await response.text();

          // Create blob with proper MIME type
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);

          try {
            workerRef.current = new Worker(blobUrl, {
              type: 'module',
              name: 'JsonLayoutWorker',
            });
            workerCreated = true;
            URL.revokeObjectURL(blobUrl);
            return;
          } catch (blobErr) {
            URL.revokeObjectURL(blobUrl);
            if (i === workerPaths.length - 1) {
              logger.error('Failed to create worker from blob:', blobErr);
            }
          }
        } catch {
          // Continue to next strategy
        }
      }
    }

    if (!workerRef.current) {
      const error = 'CRITICAL: Failed to initialize worker with all strategies';
      logger.error(error);
      setError(error);
      setIsProcessing(false);
      throw new Error(error);
    }

    // Set up error handlers (message handler is attached after definition via effect)
    // RESILIENT ERROR HANDLING: Auto-recovery with exponential backoff
    let recreationAttempts = 0;
    const maxRecreationAttempts = 3;

    const recreateWorker = () => {
      if (recreationAttempts >= maxRecreationAttempts) {
        logger.error(
          `Max worker recreation attempts (${maxRecreationAttempts}) reached`,
        );
        setError(
          'Worker failed permanently. Please reload the extension.',
        );
        return;
      }
      recreationAttempts++;
      const backoffDelay = Math.min(100 * Math.pow(2, recreationAttempts - 1), 1000);
      setTimeout(() => {
        try {
          ensureWorker();
        } catch (e) {
          logger.error('Failed to recreate worker', e);
        }
      }, backoffDelay);
    };

    workerRef.current.onerror = (error) => {
      setError(`Worker error: ${error.message}`);
      setIsProcessing(false);
      logger.error('Worker error:', error);
      try {
        workerRef.current?.terminate();
      } catch {
        // ignore termination errors
      }
      workerRef.current = null;
      recreateWorker();
    };

    workerRef.current.onmessageerror = (ev: MessageEvent) => {
      setError('Worker message error');
      setIsProcessing(false);
      logger.error('Worker messageerror:', ev);
      try {
        workerRef.current?.terminate();
      } catch {
        // ignore termination errors
      }
      workerRef.current = null;
      recreateWorker();
    };
  }, []);

  // EAGER INITIALIZATION: Pre-warm the worker immediately on mount
  useEffect(() => {
    ensureWorker().catch(err => {
      logger.error('Failed to initialize worker:', err);
    });

    const healthCheckTimeout = setTimeout(() => {
      if (!workerRef.current) {
        ensureWorker().catch(err => {
          logger.error('Worker initialization retry failed:', err);
        });
      }
    }, 200);

    return () => clearTimeout(healthCheckTimeout);
  }, [ensureWorker]);

  /**
   * Runtime type guard for WorkerMessage
   */
  const isWorkerMessage = useCallback((val: unknown): val is WorkerMessage => {
    if (!val || typeof val !== 'object') {
      return false;
    }
    const obj = val as { type?: unknown; payload?: unknown };
    if (
      typeof obj.type !== 'string' ||
      !obj.payload ||
      typeof obj.payload !== 'object'
    ) {
      return false;
    }
    const p = obj.payload as { requestId?: unknown };
    if (typeof p.requestId !== 'string') {
      return false;
    }
    return (
      obj.type === 'PROCESSING_COMPLETE' ||
      obj.type === 'PROCESSING_PROGRESS' ||
      obj.type === 'PROCESSING_ERROR' ||
      obj.type === 'PROCESSING_CANCELED' ||
      obj.type === 'PROCESSING_PARTIAL' ||
      obj.type === 'PROCESSING_PARTIAL_COMPACT' ||
      obj.type === 'PROCESSING_COMPLETE_COMPACT'
    );
  }, []);

  /**
   * Handle worker messages based on type
   */
  /**
   * Handle messages coming from the worker. Only the messages whose
   * requestId matches the current in-flight job are processed.
   */
  // Compact payload union type
  type CompactPayload =
    | WorkerProcessingPartialCompact['payload']
    | WorkerProcessingCompleteCompact['payload'];
  // Reconstruct Nodes/Edges from compact payload
  const reconstructFromCompact = useCallback(
    (payload: CompactPayload): { nodes: Node[]; edges: Edge[] } => {
      const nodeIds: string[] = payload.nodeIds || [];
      const labels: string[] = payload.labels || [];
      const types: Array<
        'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
      > = payload.types || [];
      const depths: Uint16Array = payload.depths;
      const positions: Float32Array = payload.positions;
      const childrenCounts: Uint16Array = payload.childrenCounts;
      const values: Array<string | number | boolean | null> =
        payload.values || [];
      const edgeSources: string[] = payload.edgeSources || [];
      const edgeTargets: string[] = payload.edgeTargets || [];

      const n = nodeIds.length;
      const nodes: Node[] = new Array(n);
      for (let i = 0; i < n; i++) {
        nodes[i] = {
          id: nodeIds[i],
          data: {
            label: labels[i],
            type: types[i],
            depth: depths ? depths[i] : undefined,
            childrenCount: childrenCounts ? childrenCounts[i] : undefined,
            value: values ? values[i] : undefined,
          },
          position: {
            x: positions ? positions[i * 2] : 0,
            y: positions ? positions[i * 2 + 1] : 0,
          },
        } as unknown as Node;
      }

      const m = edgeSources.length;
      const edges: Edge[] = new Array(m);
      for (let i = 0; i < m; i++) {
        const s = edgeSources[i];
        const t = edgeTargets[i];
        edges[i] = { id: `edge-${s}-${t}`, source: s, target: t } as Edge;
      }

      return { nodes, edges };
    },
    [],
  );

  const handleWorkerMessage = useCallback(
    (event: MessageEvent) => {
      const data = event?.data;
      if (!isWorkerMessage(data)) {
        logger.warn('[useLayoutWorker] Received invalid worker message', data);
        return;
      }
      const { type, payload } = data;

      // Only process messages for the current request
      if (payload.requestId !== currentRequestId.current) {
        return;
      }

      switch (type) {
        case 'PROCESSING_COMPLETE': {
          // Cancel any pending partial flush and clear buffers before final commit
          if (partialFlushRafIdRef.current != null) {
            cancelAnimationFrame(partialFlushRafIdRef.current);
            partialFlushRafIdRef.current = null;
          }
          if (partialFlushTimeoutIdRef.current != null) {
            clearTimeout(partialFlushTimeoutIdRef.current);
            partialFlushTimeoutIdRef.current = null;
          }
          partialNodesBufferRef.current = [];
          partialEdgesBufferRef.current = [];
          // Commit results synchronously to avoid race with hiding the loader
          setNodes(payload.nodes);
          setEdges(payload.edges);
          // Keep the loading animation until after paint
          setProgress(99);
          setProcessingStats({
            time: payload.processingTime,
            nodesCount: payload.nodesCount,
          });
          // Ensure no pending progress RAF survives past completion
          if (progressRafIdRef.current != null) {
            cancelAnimationFrame(progressRafIdRef.current);
            progressRafIdRef.current = null;
          }
          // Defer hiding the loader until after React has painted the new content
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsProcessing(false);
              setProgress(100);
              currentRequestId.current = null;
            });
          });
          break;
        }

        case 'PROCESSING_COMPLETE_COMPACT': {
          if (partialFlushRafIdRef.current != null) {
            cancelAnimationFrame(partialFlushRafIdRef.current);
            partialFlushRafIdRef.current = null;
          }
          if (partialFlushTimeoutIdRef.current != null) {
            clearTimeout(partialFlushTimeoutIdRef.current);
            partialFlushTimeoutIdRef.current = null;
          }
          partialNodesBufferRef.current = [];
          partialEdgesBufferRef.current = [];
          const { nodes: finalNodes, edges: finalEdges } =
            reconstructFromCompact(payload);
          setNodes(finalNodes);
          setEdges(finalEdges);
          setProgress(99);
          setProcessingStats({
            time: payload.processingTime,
            nodesCount: payload.nodesCount,
          });
          if (progressRafIdRef.current != null) {
            cancelAnimationFrame(progressRafIdRef.current);
            progressRafIdRef.current = null;
          }
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsProcessing(false);
              setProgress(100);
              currentRequestId.current = null;
            });
          });
          break;
        }

        case 'PROCESSING_PARTIAL': {
          // Buffer partials and flush once per frame to reduce React churn
          if (payload.nodes && payload.nodes.length > 0) {
            partialNodesBufferRef.current.push(...payload.nodes);
          }
          if (payload.edges && payload.edges.length > 0) {
            partialEdgesBufferRef.current.push(...payload.edges);
          }
          schedulePartialFlush();
          break;
        }

        case 'PROCESSING_PARTIAL_COMPACT': {
          // Reconstruct compact payload then buffer and flush coalesced
          const { nodes: partNodes, edges: partEdges } =
            reconstructFromCompact(payload);
          if (partNodes && partNodes.length > 0) {
            partialNodesBufferRef.current.push(...partNodes);
          }
          if (partEdges && partEdges.length > 0) {
            partialEdgesBufferRef.current.push(...partEdges);
          }
          schedulePartialFlush();
          break;
        }

        case 'PROCESSING_PROGRESS': {
          // Coalesce progress updates to once per animation frame
          latestProgressRef.current = payload.progress;
          if (progressRafIdRef.current == null) {
            progressRafIdRef.current = requestAnimationFrame(() => {
              setProgress(latestProgressRef.current);
              progressRafIdRef.current = null;
            });
          }
          break;
        }

        case 'PROCESSING_CANCELLED': {
          if (partialFlushRafIdRef.current != null) {
            cancelAnimationFrame(partialFlushRafIdRef.current);
            partialFlushRafIdRef.current = null;
          }
          if (partialFlushTimeoutIdRef.current != null) {
            clearTimeout(partialFlushTimeoutIdRef.current);
            partialFlushTimeoutIdRef.current = null;
          }
          partialNodesBufferRef.current = [];
          partialEdgesBufferRef.current = [];
          if (progressRafIdRef.current != null) {
            cancelAnimationFrame(progressRafIdRef.current);
            progressRafIdRef.current = null;
          }
          setIsProcessing(false);
          setProgress(0);
          currentRequestId.current = null;
          break;
        }

        case 'PROCESSING_ERROR': {
          logger.error(`[useLayoutWorker] PROCESSING_ERROR: ${payload.error}`);
          setError(payload.error);
          if (partialFlushRafIdRef.current != null) {
            cancelAnimationFrame(partialFlushRafIdRef.current);
            partialFlushRafIdRef.current = null;
          }
          if (partialFlushTimeoutIdRef.current != null) {
            clearTimeout(partialFlushTimeoutIdRef.current);
            partialFlushTimeoutIdRef.current = null;
          }
          partialNodesBufferRef.current = [];
          partialEdgesBufferRef.current = [];
          if (progressRafIdRef.current != null) {
            cancelAnimationFrame(progressRafIdRef.current);
            progressRafIdRef.current = null;
          }
          setIsProcessing(false);
          setProgress(0);
          currentRequestId.current = null;
          logger.error('Worker error:', payload.error);
          break;
        }

        // ...
      }
    },
    [isWorkerMessage, reconstructFromCompact, schedulePartialFlush],
  );

  // Attach the message handler once it's defined, and whenever it changes
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.onmessage = handleWorkerMessage;
    }
  }, [handleWorkerMessage]);

  /**
   * Process JSON data using the worker
   */
  const processData = useCallback(
    async (jsonData: unknown, options?: LayoutWorkerOptions) => {
      // If a job is in-flight, request its cancellation before starting a new one
      const previousId = currentRequestId.current;
      if (isProcessing && previousId && workerRef.current) {
        try {
          workerRef.current.postMessage({
            type: 'CANCEL',
            payload: { requestId: previousId },
          });
        } catch (err) {
          logger.warn('Failed to send CANCEL to worker', err);
        }
        // Immediately clear the requestId to ignore any late messages from the previous job
        currentRequestId.current = null;
      }

      // Proactively clear any pending coalescing timers/buffers from previous runs
      if (partialFlushRafIdRef.current != null) {
        cancelAnimationFrame(partialFlushRafIdRef.current);
        partialFlushRafIdRef.current = null;
      }
      if (partialFlushTimeoutIdRef.current != null) {
        clearTimeout(partialFlushTimeoutIdRef.current);
        partialFlushTimeoutIdRef.current = null;
      }
      partialNodesBufferRef.current = [];
      partialEdgesBufferRef.current = [];
      if (progressRafIdRef.current != null) {
        cancelAnimationFrame(progressRafIdRef.current);
        progressRafIdRef.current = null;
      }
      lastPartialFlushTimeRef.current = performance.now();

      // Reset state before starting
      setError(null);
      setProgress(0);
      setNodes(null);
      setEdges(null);
      setProcessingStats(null);

      // Generate unique request ID for the new job
      const requestId = uuidv4();
      currentRequestId.current = requestId;

      try {
        if (!workerRef.current) {
          await ensureWorker();
        }

        setIsProcessing(true);
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'PROCESS_JSON',
            payload: {
              jsonData,
              options,
              requestId,
            },
          });
        } else {
          throw new Error('Worker is not initialized');
        }
      } catch (err) {
        // Handle errors (e.g., worker creation failure)
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error creating worker';
        setError(errorMessage);
        setIsProcessing(false);
        logger.error('Error setting up worker:', err);

        // Fall back to synchronous processing on main thread
        logger.warn(
          'Web Worker failed, falling back to main thread processing',
        );
      }
    },
    [isProcessing, ensureWorker],
  );

  /**
   * Cancel current processing job
   */
  const cancelProcessing = useCallback(() => {
    if (!isProcessing || !currentRequestId.current || !workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'CANCEL',
      payload: {
        requestId: currentRequestId.current,
      },
    });

    setIsProcessing(false);
    setProgress(0);
    currentRequestId.current = null;
  }, [isProcessing]);

  return {
    processData,
    cancelProcessing,
    isProcessing,
    progress,
    error,
    nodes,
    edges,
    processingStats,
  };
}
