import type { IncomingVscodeMessage } from '@webview/services/types';
import type { OutgoingVscodeMessage } from '@webview/services/vscodeMessenger';
import { vscodeService } from '@webview/services/vscodeService';
import vscodeSyncService from '@webview/services/vscodeSyncService';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseEditorSyncOptions {
  selectedNodeId?: string | null;
  onApplyGraphSelection?: (nodeId?: string) => void;
}

export function useEditorSync({
  selectedNodeId,
  onApplyGraphSelection,
}: UseEditorSyncOptions) {
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(false);
  const lastSentNodeIdRef = useRef<string | null | undefined>(undefined);

  // Listen to VSCode messages for Live Sync state and selection apply
  useEffect(() => {
    const handler = (msg: IncomingVscodeMessage) => {
      switch (msg.command) {
        case 'liveSyncState': {
          setLiveSyncEnabled(!!msg.enabled);
          break;
        }
        case 'applyGraphSelection': {
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
    const msg: OutgoingVscodeMessage = {
      command: 'graphSelectionChanged',
      nodeId: selectedNodeId ?? undefined,
    } as OutgoingVscodeMessage;
    vscodeService.sendMessage(msg);
  }, [selectedNodeId, liveSyncEnabled]);

  const forceSendSelection = useCallback((nodeId?: string) => {
    lastSentNodeIdRef.current = nodeId ?? null;
    const msg: OutgoingVscodeMessage = {
      command: 'graphSelectionChanged',
      nodeId: nodeId ?? undefined,
    } as OutgoingVscodeMessage;
    vscodeService.sendMessage(msg);
  }, []);

  return { liveSyncEnabled, setLiveSyncEnabled, forceSendSelection };
}
