import { FlowAction } from '@webview/context/FlowContext';
import { vscodeService } from '@webview/services/vscodeService';
import type { Direction, JsonValue } from '@webview/types';
import { Dispatch, useCallback, useEffect } from 'react';

/**
 * Hook that handles VSCode message events for the Flow Canvas.
 * Sets up a message listener for VSCode messages and dispatches appropriate actions.
 *
 * @param dispatch - Dispatch function from useReducer to update flow state
 * @returns Handler function for VSCode messages
 */
// Runtime guard to validate JsonValue
const isJsonValue = (val: unknown): val is JsonValue => {
  if (
    val === null ||
    typeof val === 'string' ||
    typeof val === 'number' ||
    typeof val === 'boolean'
  ) {
    return true;
  }
  if (Array.isArray(val)) {
    return val.every(isJsonValue);
  }
  if (typeof val === 'object') {
    return Object.values(val as Record<string, unknown>).every(isJsonValue);
  }
  return false;
};

export function useVscodeMessageHandler(dispatch: Dispatch<FlowAction>) {
  const handleVscodeMessage = useCallback(
    (event: MessageEvent) => {
      const message = event.data;
      // Ignore non-VSCode messages to avoid unnecessary getState calls
      if (!message || typeof message !== 'object' || !('command' in message)) {
        return;
      }
      const prev = vscodeService.getStateOrDefaults();

      switch (message.command) {
        case 'update': {
          const orientation = (message.orientation ||
            prev.orientation) as Direction;

          const isObj = typeof message === 'object' && message !== null;
          const hasIncomingData = isObj && 'data' in message;
          const nextData = hasIncomingData
            ? ((message as { data?: unknown }).data ?? null)
            : prev.data;
          const nextFileName =
            isObj &&
            'fileName' in message &&
            typeof (message as { fileName?: unknown }).fileName !== 'undefined'
              ? ((message as { fileName?: string }).fileName ?? prev.fileName)
              : prev.fileName;
          const nextPath =
            isObj &&
            'path' in message &&
            typeof (message as { path?: unknown }).path !== 'undefined'
              ? ((message as { path?: string }).path ?? prev.path)
              : prev.path;

          if (nextData === null || typeof nextData === 'undefined') {
            // If we still don't have data, clear the view to avoid inconsistent state
            dispatch({ type: 'CLEAR' });
            // Avoid redundant writes if state is already cleared
            if (
              prev.data !== null ||
              prev.fileName !== '' ||
              prev.path !== ''
            ) {
              vscodeService.saveState(null);
            }
            break;
          }

          if (!isJsonValue(nextData)) {
            // Invalid payload; clear to avoid inconsistent state
            dispatch({ type: 'CLEAR' });
            if (
              prev.data !== null ||
              prev.fileName !== '' ||
              prev.path !== ''
            ) {
              vscodeService.saveState(null);
            }
            break;
          }

          // Dispatch the merged update
          dispatch({
            type: 'UPDATE',
            payload: {
              data: nextData as JsonValue,
              orientation,
              fileName: nextFileName,
              path: nextPath,
            },
          });

          // Persist only if something actually changed to avoid noisy writes
          const shouldPersist =
            prev.data !== nextData ||
            prev.orientation !== orientation ||
            prev.fileName !== nextFileName ||
            prev.path !== nextPath;

          if (shouldPersist) {
            vscodeService.saveState({
              data: nextData as JsonValue,
              orientation,
              fileName: nextFileName,
              path: nextPath,
            });
          }
          break;
        }

        case 'clear':
          dispatch({ type: 'CLEAR' });
          vscodeService.saveState(null);
          break;
      }
    },
    [dispatch],
  );

  useEffect(() => {
    window.addEventListener('message', handleVscodeMessage);
    return () => {
      window.removeEventListener('message', handleVscodeMessage);
    };
  }, [handleVscodeMessage]);

  return handleVscodeMessage;
}
