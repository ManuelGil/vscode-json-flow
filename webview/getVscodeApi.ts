/**
 * VSCode API singleton instance
 * We only want to call acquireVsCodeApi() once as per VS Code recommendations
 */
interface VsCodeApi {
  postMessage: (message: unknown) => void;
  setState: (newState: unknown) => void;
  getState: () => unknown;
}

let vscodeInstance: VsCodeApi | null = null;

/**
 * Gets the VSCode API instance, implementing the singleton pattern.
 * Creates a new instance only on first call and returns cached instance thereafter.
 * Provides mock implementation in development mode for testing.
 *
 * @returns VSCode API instance with postMessage, setState, and getState methods
 * @throws {Error} When VSCode API is not available and not in development mode
 *
 * @example
 * ```typescript
 * const vscode = getVscodeApi();
 * vscode.postMessage({ type: 'ready' });
 * ```
 */
export function getVscodeApi() {
  if (import.meta.env.DEV) {
    return {
      postMessage: () => {
        void 0;
      },
      setState: () => {
        void 0;
      },
      getState: () => undefined,
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
