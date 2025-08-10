/**
 * VSCode API singleton instance
 * We only want to call acquireVsCodeApi() once as per VS Code recommendations
 */
import * as logger from '@webview/utils/logger';

interface VsCodeApi {
  postMessage: (message: unknown) => void;
  setState: (newState: unknown) => void;
  getState: () => unknown;
}

let vscodeInstance: VsCodeApi | null = null;

/**
 * Gets the VSCode API instance, implementing the singleton pattern
 * Creates a new instance only on first call and returns cached instance thereafter
 * @returns VSCode API instance
 */
export function getVscodeApi() {
  if (import.meta.env.DEV) {
    return {
      postMessage: (_msg: unknown) => {
        logger.info('[MOCK VSCode] postMessage:', _msg);
      },
      setState: (_state: unknown) => {
        logger.info('[MOCK VSCode] setState:', _state);
      },
      getState: () => {
        logger.info('[MOCK VSCode] getState');
        return undefined;
      },
    };
  }

  if (vscodeInstance) {
    return vscodeInstance;
  }

  if (typeof window !== 'undefined') {
    // @ts-ignore
    // biome-ignore lint/correctness/noUndeclaredVariables: acquireVsCodeApi is a global function provided by VS Code
    vscodeInstance = acquireVsCodeApi() as VsCodeApi;
    return vscodeInstance;
  }

  throw new Error(
    'VSCode API not available. Run inside VSCode or use mock mode.',
  );
}
