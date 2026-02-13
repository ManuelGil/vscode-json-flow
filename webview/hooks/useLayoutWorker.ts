/**
 * useLayoutWorker.ts
 * Custom hook for managing JSON layout Web Worker lifecycle and communication
 * Provides a clean interface for offloading heavy layout calculations to a background thread
 */
import { IS_DEV } from '@webview/env';
import type { Direction } from '@webview/types';
import type { WorkerMessage } from '@webview/types/workerMessages';
import * as logger from '@webview/utils/logger';
import type { Edge, Node } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed for request tracking

// Worker request options
export interface LayoutWorkerOptions {
  direction?: Direction;
}

// Hook return type
export interface UseLayoutWorkerResult {
  processData: (jsonData: unknown, options?: LayoutWorkerOptions) => void;
  cancelProcessing: () => void;
  isProcessing: boolean;
  progress: number | null;
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
  const [progress, setProgress] = useState<number | null>(null);
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

  // Stable ref for the message handler so ensureWorker can attach it
  // without a circular dependency on handleWorkerMessage.
  const handleWorkerMessageRef = useRef<((event: MessageEvent) => void) | null>(
    null,
  );

  // Blob Worker refs: the script is fetched once via the asWebviewUri URL
  // (allowed by CSP connect-src), then wrapped in a same-origin blob: URL
  // so that `new Worker(blobUrl)` passes the browser same-origin check.
  const workerBlobUrlRef = useRef<string | null>(null);
  const workerBlobPromiseRef = useRef<Promise<string> | null>(null);

  // Throttle progress updates to one per frame to reduce re-renders
  const latestProgressRef = useRef(0);
  const progressRafIdRef = useRef<number | null>(null);

  // Clean up worker, blob URL, and pending async timers on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (workerBlobUrlRef.current) {
        URL.revokeObjectURL(workerBlobUrlRef.current);
        workerBlobUrlRef.current = null;
      }
      if (progressRafIdRef.current != null) {
        cancelAnimationFrame(progressRafIdRef.current);
        progressRafIdRef.current = null;
      }
    };
  }, []);

  /**
   * Fetch the worker script (once) and return a same-origin blob: URL.
   *
   * VSCode webview origin is `vscode-webview://<uuid>` but asWebviewUri
   * produces `https://file+.vscode-resource.vscode-cdn.net/...`.
   * The Worker constructor enforces same-origin, so a direct URL fails.
   * Fetching the script (allowed by CSP connect-src) and wrapping it in
   * a blob: URL gives us a same-origin URL the Worker can load.
   */
  const getWorkerBlobUrl = useCallback(async (): Promise<string> => {
    if (workerBlobUrlRef.current) {
      return workerBlobUrlRef.current;
    }

    // Deduplicate concurrent calls — share one in-flight fetch
    if (!workerBlobPromiseRef.current) {
      workerBlobPromiseRef.current = (async (): Promise<string> => {
        const scriptUrl = (
          window as unknown as {
            __jsonFlowWorkerUrl?: string;
          }
        ).__jsonFlowWorkerUrl;

        if (!scriptUrl) {
          throw new Error('Worker URL not injected by extension host');
        }

        const response = await fetch(scriptUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch worker script: ${response.status} ${response.statusText}`,
          );
        }

        const text = await response.text();
        const blob = new Blob([text], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        workerBlobUrlRef.current = blobUrl;
        return blobUrl;
      })();
    }

    return workerBlobPromiseRef.current;
  }, []);

  /**
   * Ensure a Web Worker instance exists (pre-warm on mount and reuse).
   * Async because the first call fetches the worker script to create a
   * same-origin blob: URL.
   */
  const ensureWorker = useCallback(async (): Promise<void> => {
    if (workerRef.current) {
      return;
    }

    try {
      const blobUrl = await getWorkerBlobUrl();

      // Guard against concurrent ensureWorker calls both reaching this point
      if (workerRef.current) {
        return;
      }

      workerRef.current = new Worker(blobUrl);

      // Attach message handler immediately to avoid losing early messages.
      // The ref is kept in sync by the handleWorkerMessage effect below.
      workerRef.current.onmessage = (event: MessageEvent) => {
        handleWorkerMessageRef.current?.(event);
      };

      workerRef.current.onerror = (error) => {
        setError(`Worker error: ${error.message}`);
        setIsProcessing(false);
        currentRequestId.current = null;
        workerRef.current?.terminate();
        workerRef.current = null;
      };

      workerRef.current.onmessageerror = () => {
        setError('Worker message error');
        setIsProcessing(false);
        currentRequestId.current = null;
        workerRef.current?.terminate();
        workerRef.current = null;
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown worker init error';

      setError(errorMessage);
      setIsProcessing(false);
    }
  }, [getWorkerBlobUrl]);

  // EAGER INITIALIZATION: Pre-warm the worker immediately on mount
  useEffect(() => {
    let cancelled = false;
    ensureWorker().catch((err: unknown) => {
      if (!cancelled) {
        logger.error('Failed to pre-warm worker:', err);
      }
    });
    return () => {
      cancelled = true;
    };
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
      obj.type === 'PROCESSING_CANCELED'
    );
  }, []);

  /**
   * Handle messages coming from the worker. Only the messages whose
   * requestId matches the current in-flight job are processed.
   */
  const handleWorkerMessage = useCallback(
    (event: MessageEvent) => {
      const data = event?.data;

      if (!isWorkerMessage(data)) {
        logger.error('[useLayoutWorker] Received invalid worker message', data);
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
          // Defer hiding the loader until after React has painted the new content.
          // Scope to this requestId so a newer job is not clobbered.
          const completedId = payload.requestId;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (currentRequestId.current !== completedId) {
                return;
              }
              setIsProcessing(false);
              setProgress(100);
              currentRequestId.current = null;
            });
          });
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

        case 'PROCESSING_CANCELED': {
          if (progressRafIdRef.current != null) {
            cancelAnimationFrame(progressRafIdRef.current);
            progressRafIdRef.current = null;
          }
          setIsProcessing(false);
          setProgress(null);
          currentRequestId.current = null;
          break;
        }

        case 'PROCESSING_ERROR': {
          logger.error(`[useLayoutWorker] PROCESSING_ERROR: ${payload.error}`);
          setError(payload.error);
          if (progressRafIdRef.current != null) {
            cancelAnimationFrame(progressRafIdRef.current);
            progressRafIdRef.current = null;
          }
          setIsProcessing(false);
          setProgress(null);
          currentRequestId.current = null;
          break;
        }
      }
    },
    [isWorkerMessage],
  );

  // Keep the ref in sync so the stable onmessage wrapper inside ensureWorker
  // always delegates to the latest handleWorkerMessage closure.
  useEffect(() => {
    handleWorkerMessageRef.current = handleWorkerMessage;
  }, [handleWorkerMessage]);

  /**
   * Process JSON data using the worker
   */
  const processData = useCallback(
    async (jsonData: unknown, options?: LayoutWorkerOptions) => {
      // If a job is in-flight, request its cancellation before starting a new one
      const previousId = currentRequestId.current;
      if (previousId && workerRef.current) {
        try {
          workerRef.current.postMessage({
            type: 'CANCEL',
            payload: { requestId: previousId },
          });
        } catch {
          // Swallowed: worker may already be terminated
        }
        // Immediately clear the requestId to ignore any late messages from the previous job
        currentRequestId.current = null;
      }

      // Proactively clear any pending progress RAF from previous runs
      if (progressRafIdRef.current != null) {
        cancelAnimationFrame(progressRafIdRef.current);
        progressRafIdRef.current = null;
      }

      // Reset state before starting
      setError(null);
      setProgress(null);
      setNodes(null);
      setEdges(null);
      setProcessingStats(null);

      // Generate unique request ID for the new job
      const requestId = uuidv4();
      currentRequestId.current = requestId;

      // Kick off the async worker initialization + postMessage.
      // The outer function stays sync (returns void) so callers in
      // useEffect are not forced to handle a promise.
      const startWorker = async (): Promise<void> => {
        try {
          // Create worker if it doesn't exist (pre-warmed in mount effect as well)
          if (!workerRef.current) {
            await ensureWorker();
          }

          // Guard: a newer processData call may have fired while we awaited
          if (currentRequestId.current !== requestId) {
            return;
          }

          // Start processing
          setIsProcessing(true);
          const workerPayload = {
            jsonData,
            options: options?.direction
              ? { direction: options.direction }
              : undefined,
            requestId,
          };
          if (IS_DEV) {
            try {
              const payloadSize = JSON.stringify(workerPayload).length;
              const jsonDataSize = JSON.stringify(jsonData).length;
              logger.error(
                `[useLayoutWorker] PROCESS_JSON payload: ${(payloadSize / 1024).toFixed(1)}KB total, ` +
                  `jsonData: ${(jsonDataSize / 1024).toFixed(1)}KB (${((jsonDataSize / payloadSize) * 100).toFixed(0)}%), ` +
                  `options: ${JSON.stringify(workerPayload.options)}, requestId: ${requestId}`,
              );
            } catch {
              // Measurement failed — ignore
            }
          }
          if (workerRef.current) {
            workerRef.current.postMessage({
              type: 'PROCESS_JSON',
              payload: workerPayload,
            });
          } else {
            throw new Error('Worker is not initialized');
          }
        } catch (err) {
          // Handle errors (e.g., worker creation failure)
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Unknown error creating worker';
          setError(errorMessage);
          setIsProcessing(false);
          setProgress(null);
          currentRequestId.current = null;
          logger.error('Error setting up worker:', err);

          // The worker failed — the error state is now visible to the UI.
          // FlowCanvas falls back to useFlowController nodes via
          // `finalNodes = workerNodes || nodes` so the graph still renders,
          // but without worker-driven progress or layout optimizations.
        }
      };

      startWorker();
    },
    [ensureWorker],
  );

  /**
   * Cancel current processing job
   */
  const cancelProcessing = useCallback(() => {
    if (!currentRequestId.current || !workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'CANCEL',
      payload: {
        requestId: currentRequestId.current,
      },
    });

    setIsProcessing(false);
    setProgress(null);
    currentRequestId.current = null;
  }, []);

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
