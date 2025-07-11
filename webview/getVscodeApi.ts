/**
 * VSCode API singleton instance
 * We only want to call acquireVsCodeApi() once as per VS Code recommendations
 */
let vscodeInstance: any = null;

/**
 * Gets the VSCode API instance, implementing the singleton pattern
 * Creates a new instance only on first call and returns cached instance thereafter
 * @returns VSCode API instance
 */
export function getVscodeApi() {
  if (import.meta.env.DEV) {
    // Return a mock API in development mode
    return {
      postMessage: (_msg: any) => {
        // Optionally log or ignore
        if (window?.console) {
          console.info('[MOCK VSCode] postMessage:', _msg);
        }
      },
      setState: (_state: any) => {
        if (window?.console) {
          console.info('[MOCK VSCode] setState:', _state);
        }
      },
      getState: () => {
        if (window?.console) {
          console.info('[MOCK VSCode] getState');
        }
        return undefined;
      },
    };
  }

  // Return cached instance if it exists
  if (vscodeInstance) {
    return vscodeInstance;
  }

  // Create new instance if available
  if (typeof window !== 'undefined') {
    // @ts-ignore
    // biome-ignore lint/correctness/noUndeclaredVariables: acquireVsCodeApi is a global function provided by VS Code
    vscodeInstance = acquireVsCodeApi();
    return vscodeInstance;
  }

  // Throw error if API is not available
  throw new Error(
    'VSCode API not available. Run inside VSCode or use mock mode.',
  );
}
