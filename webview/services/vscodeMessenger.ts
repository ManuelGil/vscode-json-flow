import { throwError } from '@webview/helpers';
import { z } from 'zod';

import { getVscodeApi } from '../getVscodeApi';

/** Union of all webview-to-extension messages */
const messageSchema = z.discriminatedUnion('command', [
  z.object({
    command: z.literal('graphSelectionChanged'),
    nodeId: z.string().optional(),
    origin: z.enum(['webview', 'extension']).optional(),
    nonce: z.string().optional(),
    path: z.string().optional(),
  }),
]);

export type VSCodeMessage = z.infer<typeof messageSchema>;
export type OutgoingVscodeMessage = VSCodeMessage;

/**
 * Internal queue to debounce/batch messages by command key.
 * Each command keeps only the last payload within the time window.
 */
const messageQueue = new Map<
  VSCodeMessage['command'],
  { timerId: ReturnType<typeof setTimeout>; payload: Record<string, unknown> }
>();
const MESSAGE_DELAY = 200;

/**
 * Validates message against the schema and sends it via VSCode API.
 * Returns true if the message is valid and was posted.
 */
function validateAndSendMessage(message: unknown): boolean {
  try {
    const validMessage = messageSchema.parse(message);
    const vscode = getVscodeApi();
    vscode.postMessage(validMessage);
    return true;
  } catch (error) {
    throwError('Invalid message format', error);
    return false;
  }
}

export const vscodeMessenger = {
  /**
   * Batch messages by command to avoid posting a burst of updates.
   * Only the last payload within the debounce window is sent.
   */
  batchPostMessage(
    command: VSCodeMessage['command'],
    payload: Record<string, unknown>,
  ) {
    if (messageQueue.has(command)) {
      clearTimeout(messageQueue.get(command)!.timerId);
    }
    const timerId = setTimeout(() => {
      const message = { command, ...payload };
      validateAndSendMessage(message);
      messageQueue.delete(command);
    }, MESSAGE_DELAY);
    messageQueue.set(command, { timerId, payload });
  },
  /**
   * Send a message immediately (no batching).
   */
  sendMessage(message: OutgoingVscodeMessage) {
    return validateAndSendMessage(message);
  },
  cleanup() {
    messageQueue.forEach(({ timerId }) => clearTimeout(timerId));
    messageQueue.clear();
  },
};
