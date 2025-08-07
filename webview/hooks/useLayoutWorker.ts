/**
 * useLayoutWorker.ts
 * Custom hook for managing JSON layout Web Worker lifecycle and communication
 * Provides a clean interface for offloading heavy layout calculations to a background thread
 */

import { Edge, Node } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed for request tracking

// Worker request options
export interface LayoutWorkerOptions {
  spacing?: number;
  direction?: 'horizontal' | 'vertical';
  optimizeForLargeData?: boolean;
  maxNodesToProcess?: number;
}

// Hook return type
export interface UseLayoutWorkerResult {
  processData: (jsonData: any, options?: LayoutWorkerOptions) => void;
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
   * Handle worker messages based on type
   */
  const handleWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, payload } = event.data;

    // Only process messages for the current request
    if (payload.requestId !== currentRequestId.current) {
      return;
    }

    switch (type) {
      case 'PROCESSING_COMPLETE':
        setNodes(payload.nodes);
        setEdges(payload.edges);
        setIsProcessing(false);
        setProgress(100);
        setProcessingStats({
          time: payload.processingTime,
          nodesCount: payload.nodesCount,
        });
        break;

      case 'PROCESSING_PROGRESS':
        setProgress(payload.progress);
        break;

      case 'PROCESSING_ERROR':
        setError(payload.error);
        setIsProcessing(false);
        setProgress(0);
        console.error('Worker error:', payload.error);
        break;

      default:
        console.warn('Unknown message from worker:', event.data);
    }
  }, []);

  /**
   * Process JSON data using the worker
   */
  const processData = useCallback(
    (jsonData: any, options?: LayoutWorkerOptions) => {
      // Reset state before starting
      setError(null);
      setProgress(0);
      setNodes(null);
      setEdges(null);
      setProcessingStats(null);

      // Generate unique request ID
      const requestId = uuidv4();
      currentRequestId.current = requestId;

      try {
        // Create worker if it doesn't exist
        if (!workerRef.current) {
          // Use a static path to the bundled worker file for VSCode webview compatibility
          // Ensure your build outputs JsonLayoutWorker.js in the same directory as your webview bundle
          workerRef.current = new Worker('./JsonLayoutWorker.js');

          // Set up message handler
          workerRef.current.onmessage = handleWorkerMessage;
          workerRef.current.onerror = (error) => {
            setError(`Worker error: ${error.message}`);
            setIsProcessing(false);
            console.error('Worker error:', error);
          };
        }

        // Start processing
        setIsProcessing(true);
        workerRef.current.postMessage({
          type: 'PROCESS_JSON',
          payload: {
            jsonData,
            options,
            requestId,
          },
        });
      } catch (err) {
        // Handle errors (e.g., worker creation failure)
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error creating worker';
        setError(errorMessage);
        setIsProcessing(false);
        console.error('Error setting up worker:', err);

        // Fall back to synchronous processing on main thread
        console.warn(
          'Web Worker failed, falling back to main thread processing',
        );
        // Note: You would implement a synchronous version of your processing logic here
        // or alert the user that processing cannot be completed
      }
    },
    [handleWorkerMessage],
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
