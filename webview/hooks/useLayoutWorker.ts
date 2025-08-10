/**
 * useLayoutWorker.ts
 * Custom hook for managing JSON layout Web Worker lifecycle and communication
 * Provides a clean interface for offloading heavy layout calculations to a background thread
 */
import type { WorkerMessage } from '@webview/types/workerMessages';
import * as logger from '@webview/utils/logger';
import type { Edge, Node } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed for request tracking

// Worker request options
export interface LayoutWorkerOptions {
  spacing?: number;
  direction?: 'horizontal' | 'vertical';
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
   */
  const ensureWorker = useCallback(() => {
    if (workerRef.current) {
      return;
    }

    try {
      // Resolve the worker URL via import.meta.url so the bundler rewrites it correctly in production
      const workerPath = new URL(
        '../workers/JsonLayoutWorker.ts',
        import.meta.url,
      );

      // Prefer module worker (modern bundlers output ESM); gracefully fallback to classic if needed
      try {
        workerRef.current = new Worker(workerPath, {
          type: 'module' as WorkerOptions['type'],
        });
      } catch (err1) {
        logger.warn(
          'Module worker failed, falling back to classic worker',
          err1,
        );
        try {
          workerRef.current = new Worker(workerPath);
        } catch (err2) {
          logger.warn(
            'Classic worker with URL failed, falling back to relative path',
            err2,
          );
          // Last resort: legacy relative string (only if bundler placed the file alongside the bundle)
          workerRef.current = new Worker('./JsonLayoutWorker.js');
        }
      }

      // Set up error handlers (message handler is attached after definition via effect)
      workerRef.current.onerror = (error) => {
        setError(`Worker error: ${error.message}`);
        setIsProcessing(false);
        logger.error('Worker error:', error);
      };
      workerRef.current.onmessageerror = (ev: MessageEvent) => {
        setError('Worker message error');
        setIsProcessing(false);
        logger.error('Worker messageerror:', ev);
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error creating worker';
      setError(errorMessage);
      setIsProcessing(false);
      logger.error('Error setting up worker:', err);
    }
  }, []);

  // Pre-warm the worker as soon as the hook mounts to reduce first-use latency
  useEffect(() => {
    ensureWorker();
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
      obj.type === 'PROCESSING_ERROR'
    );
  }, []);

  /**
   * Handle worker messages based on type
   */
  /**
   * Handle messages coming from the worker. Only the messages whose
   * requestId matches the current in-flight job are processed.
   */
  const handleWorkerMessage = useCallback(
    (event: MessageEvent) => {
      const data = event?.data;
      if (!isWorkerMessage(data)) {
        return;
      }
      const { type, payload } = data;

      // Only process messages for the current request
      if (payload.requestId !== currentRequestId.current) {
        return;
      }

      switch (type) {
        case 'PROCESSING_COMPLETE': {
          // Commit results synchronously to avoid race with hiding the loader
          setNodes(payload.nodes);
          setEdges(payload.edges);
          logger.log(
            `Worker complete: nodes=${payload.nodes.length}, edges=${payload.edges.length}`,
          );
          // Keep the loading animation until after paint
          setProgress(99);
          setProcessingStats({
            time: payload.processingTime,
            nodesCount: payload.nodesCount,
          });
          // Defer hiding the loader until after React has painted the new content
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              logger.log('Finalizing processing: hiding loader');
              setIsProcessing(false);
              setProgress(100);
              currentRequestId.current = null;
            });
          });
          break;
        }
        case 'PROCESSING_PROGRESS': {
          setProgress(payload.progress);
          break;
        }
        case 'PROCESSING_ERROR': {
          setError(payload.error);
          setIsProcessing(false);
          setProgress(0);
          currentRequestId.current = null;
          logger.error('Worker error:', payload.error);
          break;
        }
        default: {
          logger.warn('Unknown message from worker:', event.data);
          break;
        }
      }
    },
    [isWorkerMessage],
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
    (jsonData: unknown, options?: LayoutWorkerOptions) => {
      // Reset state before starting
      setError(null);
      setProgress(0);
      setNodes(null);
      setEdges(null);
      setProcessingStats(null);

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
      }

      // Generate unique request ID for the new job
      const requestId = uuidv4();
      currentRequestId.current = requestId;

      try {
        // Create worker if it doesn't exist (pre-warmed in mount effect as well)
        if (!workerRef.current) {
          ensureWorker();
        }

        // Start processing
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
