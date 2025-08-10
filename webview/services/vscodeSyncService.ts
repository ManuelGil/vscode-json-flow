import type { IncomingVscodeMessage } from './types';

type VscodeMessageHandler = (message: IncomingVscodeMessage) => void;

class VscodeSyncService {
  private handlers: Set<VscodeMessageHandler> = new Set();
  private isListening = false;

  private handleMessage = (event: MessageEvent) => {
    const message = event.data as unknown;
    if (
      message &&
      typeof message === 'object' &&
      'command' in message &&
      (message as { command: unknown }).command !== undefined
    ) {
      this.handlers.forEach((handler) =>
        handler(message as IncomingVscodeMessage),
      );
    }
  };

  subscribe(handler: VscodeMessageHandler) {
    this.handlers.add(handler);
    if (!this.isListening) {
      window.addEventListener('message', this.handleMessage);
      this.isListening = true;
    }
  }

  unsubscribe(handler: VscodeMessageHandler) {
    this.handlers.delete(handler);
    if (this.handlers.size === 0 && this.isListening) {
      window.removeEventListener('message', this.handleMessage);
      this.isListening = false;
    }
  }

  cleanup() {
    if (this.isListening) {
      window.removeEventListener('message', this.handleMessage);
      this.isListening = false;
    }
    this.handlers.clear();
  }
}

const vscodeSyncService = new VscodeSyncService();

export default vscodeSyncService;
