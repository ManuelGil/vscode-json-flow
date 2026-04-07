import { FlowAction } from '@webview/context/FlowContext';
import type { IncomingVscodeMessage } from '@webview/services/types';
import { vscodeService } from '@webview/services/vscodeService';
import { Dispatch, useCallback, useEffect } from 'react';

/**
 * Hook that handles VSCode message events for the Flow Canvas.
 * Sets up a message listener for VSCode messages and dispatches appropriate actions.
 *
 * @param dispatch - Dispatch function from useReducer to update flow state
 * @returns Handler function for VSCode messages
 */
export function useVscodeMessageHandler(dispatch: Dispatch<FlowAction>) {
  const handleVscodeMessage = useCallback(
    (event: MessageEvent) => {
      const message = event.data;
      // Ignore non-VSCode messages to avoid unnecessary getState calls
      if (!message || typeof message !== 'object' || !('command' in message)) {
        return;
      }
      switch (message.command) {
        case 'update': {
          const updateMessage = message as IncomingVscodeMessage;
          if (
            updateMessage.command !== 'update' ||
            !updateMessage.metadata ||
            typeof updateMessage.metadata.languageId !== 'string' ||
            typeof updateMessage.metadata.canEdit !== 'boolean'
          ) {
            break;
          }

          dispatch({
            type: 'UPDATE',
            payload: {
              data: updateMessage.data,
              orientation: updateMessage.orientation,
              fileName: updateMessage.fileName,
              path: updateMessage.path,
              languageId: updateMessage.metadata.languageId,
              canEdit: updateMessage.metadata.canEdit,
            },
          });

          vscodeService.saveState({
            data: updateMessage.data,
            orientation: updateMessage.orientation,
            fileName: updateMessage.fileName,
            path: updateMessage.path,
            languageId: updateMessage.metadata.languageId,
            canEdit: updateMessage.metadata.canEdit,
          });
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
