import { useEffect } from 'react';

import { throwError } from '@webview/helpers';
import { useFlowDispatch } from '../context/FlowContext';
import vscodeSyncService from '../services/vscodeSyncService';

/**
 * React hook that subscribes to VSCode webview messages and dispatches them to the global flow context.
 * Ensures state stays in sync with backend events.
 *
 * Side effect: subscribes/unsubscribes to VSCode message events on mount/unmount.
 */
export function useVscodeSync() {
  const dispatch = useFlowDispatch();

  useEffect(() => {
    /**
     * Handler for messages from VSCode extension backend.
     * Dispatches update/clear actions to the global flow context.
     *
     * @param message - Message object from VSCode backend.
     */
    const handler = (message: any) => {
      try {
        switch (message.command) {
          case 'update':
            dispatch({
              type: 'UPDATE',
              payload: {
                data: message.data,
                orientation: message.orientation || 'TB',
                fileName: message.fileName,
                path: message.path,
              },
            });
            break;
          case 'clear':
            dispatch({ type: 'CLEAR' });
            break;
        }
      } catch (err) {
        throwError('Error handling message', err);
      }
    };
    vscodeSyncService.subscribe(handler);
    // Cleanup: Unsubscribe handler when component unmounts to prevent memory leaks.
    return () => {
      vscodeSyncService.unsubscribe(handler);
    };
  }, [dispatch]);
}
