// Servicio aislado para manejar la comunicación con VSCode

type VscodeMessage = {
  command: string;
  [key: string]: any;
};

type VscodeMessageHandler = (message: VscodeMessage) => void;

class VscodeSyncService {
  private handlers: Set<VscodeMessageHandler> = new Set();
  private isListening = false;

  private handleMessage = (event: MessageEvent) => {
    const message = event.data;
    this.handlers.forEach(handler => handler(message));
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
