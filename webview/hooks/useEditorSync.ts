import type { IncomingVscodeMessage } from '@webview/services/types';
import type { OutgoingVscodeMessage } from '@webview/services/vscodeMessenger';
import { vscodeMessenger } from '@webview/services/vscodeMessenger';
import vscodeSyncService from '@webview/services/vscodeSyncService';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseEditorSyncOptions {
  selectedNodeId?: string | null;
  onApplyGraphSelection?: (nodeId?: string) => void;
  path?: string;
}

export function useEditorSync({
  selectedNodeId,
  onApplyGraphSelection,
  path,
}: UseEditorSyncOptions) {
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(false);
  const [liveSyncPaused, setLiveSyncPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<string | undefined>(undefined);
  const lastSentNodeIdRef = useRef<string | null | undefined>(undefined);
  const lastOutNonceRef = useRef<string | undefined>(undefined);

  const makeNonce = useCallback(
    () =>
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  // Listen to VSCode messages for Live Sync state and selection apply
  useEffect(() => {
    const handler = (msg: IncomingVscodeMessage) => {
      switch (msg.command) {
        case 'liveSyncState': {
          setLiveSyncEnabled(!!msg.enabled);
          // Optional paused state + reason for banner UI
          setLiveSyncPaused(!!msg.paused);
          setPauseReason(msg.reason);
          break;
        }
        case 'applyGraphSelection': {
          // Ignore mirrored updates originating from this webview
          if (msg.origin === 'webview') {
            break;
          }
          if (msg.nonce && msg.nonce === lastOutNonceRef.current) {
            break;
          }
          if (onApplyGraphSelection) {
            onApplyGraphSelection(msg.nodeId);
          }
          break;
        }
        default:
          break;
      }
    };
    vscodeSyncService.subscribe(handler);
    return () => {
      vscodeSyncService.unsubscribe(handler);
    };
  }, [onApplyGraphSelection]);

  // When selection changes and Live Sync is enabled, notify the extension
  useEffect(() => {
    if (!liveSyncEnabled) {
      return;
    }
    if (selectedNodeId === lastSentNodeIdRef.current) {
      return;
    }

    lastSentNodeIdRef.current = selectedNodeId ?? null;
    const nonce = makeNonce();
    lastOutNonceRef.current = nonce;
    vscodeMessenger.batchPostMessage('graphSelectionChanged', {
      nodeId: selectedNodeId ?? undefined,
      origin: 'webview',
      nonce,
      path: path || undefined,
    });
  }, [selectedNodeId, liveSyncEnabled, makeNonce, path]);

  const forceSendSelection = useCallback(
    (nodeId?: string) => {
      lastSentNodeIdRef.current = nodeId ?? null;
      const nonce = makeNonce();
      lastOutNonceRef.current = nonce;
      const msg: OutgoingVscodeMessage = {
        command: 'graphSelectionChanged',
        nodeId: nodeId ?? undefined,
        origin: 'webview',
        nonce,
        path: path || undefined,
      } as OutgoingVscodeMessage;
      // Send immediately for explicit interactions
      vscodeMessenger.sendMessage(msg);
    },
    [makeNonce, path],
  );

  return {
    liveSyncEnabled,
    setLiveSyncEnabled,
    forceSendSelection,
    paused: liveSyncPaused,
    pauseReason,
  };
}
