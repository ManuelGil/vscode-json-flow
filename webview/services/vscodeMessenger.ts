// NOTE: This service is implemented to provide batching and validation for outgoing VSCode messages.
// It is currently NOT fully integrated in the main flow. For best practices, migrate all outgoing
// vscode.postMessage calls to use vscodeMessenger.batchPostMessage for batching and validation.
import { z } from 'zod';

import { throwError } from '@webview/helpers';
import { getVscodeApi } from '../getVscodeApi';

const configMessageSchema = z.object({
  command: z.literal('updateConfig'),
  orientation: z.enum(['TB', 'RL', 'BT', 'LR']).optional(),
});

const messageSchema = z.discriminatedUnion('command', [
  configMessageSchema,
  z.object({ command: z.literal('clear') }),
  z.object({
    command: z.literal('update'),
    data: z.any(),
    fileName: z.string().optional(),
    path: z.string().optional(),
    orientation: z.enum(['TB', 'RL', 'BT', 'LR']).optional(),
  }),
]);

export type VSCodeMessage = z.infer<typeof messageSchema>;

const messageQueue = new Map<
  string,
  { timerId: ReturnType<typeof setTimeout>; payload: Record<string, any> }
>();
const MESSAGE_DELAY = 200;

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
  batchPostMessage(command: string, payload: Record<string, any>) {
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
  sendMessage(message: VSCodeMessage) {
    return validateAndSendMessage(message);
  },
  cleanup() {
    messageQueue.forEach(({ timerId }) => clearTimeout(timerId));
    messageQueue.clear();
  },
};
