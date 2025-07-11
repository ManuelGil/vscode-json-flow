import { Dispatch, useCallback, useEffect } from 'react';

import { FlowAction } from '@webview/context/FlowContext';
import { vscodeService } from '@webview/services/vscodeService';
import type { Direction } from '@webview/types';

/**
 * Hook that handles VSCode message events for the Flow Canvas.
 * Sets up a message listener for VSCode messages and dispatches appropriate actions.
 *
 * @param dispatch - Dispatch function from useReducer to update flow state
 * @returns Handler function for VSCode messages
 */
export function useVscodeMessageHandler(dispatch: Dispatch<FlowAction>) {
  // Memoized handler with proper dependencies
  const handleVscodeMessage = useCallback(
    (event: MessageEvent) => {
      const message = event.data;
      const stateData = vscodeService.getState();

      switch (message.command) {
        case 'update': {
          const orientation = (stateData?.orientation ||
            message.orientation ||
            'TB') as Direction;

          // Update local state
          dispatch({
            type: 'UPDATE',
            payload: {
              data: message.data,
              orientation,
              fileName: message.fileName,
              path: message.path,
            },
          });

          // Also update VSCode state
          vscodeService.saveState({
            data: message.data,
            orientation,
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
  ); // Include dispatch in dependencies

  // Register message handler once with proper cleanup
  useEffect(() => {
    window.addEventListener('message', handleVscodeMessage);
    return () => {
      window.removeEventListener('message', handleVscodeMessage);
    };
  }, [handleVscodeMessage]);

  return handleVscodeMessage;
}
