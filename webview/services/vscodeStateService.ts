import type { Direction, JsonValue } from '@webview/types';
import { DEFAULT_ORIENTATION, DEFAULT_STATE } from '../constants';
import { getVscodeApi } from '../getVscodeApi';

export type WebviewState =
  | {
      data: JsonValue | null;
      orientation?: Direction;
      path?: string;
      fileName?: string;
    }
  | undefined;

/** Fully-resolved state with defaults applied (no optional fields). */
export type ResolvedWebviewState = {
  data: JsonValue | null;
  orientation: Direction;
  path: string;
  fileName: string;
};

export const vscodeStateService = {
  /**
   * Persists state to the VSCode webview state store.
   * Accepts `null` to clear state (preserves legacy behavior).
   */
  saveState(state: WebviewState | null) {
    const vscode = getVscodeApi();
    vscode.setState(state);
  },
  getState(): WebviewState {
    const vscode = getVscodeApi();
    return vscode.getState() as WebviewState;
  },
  /**
   * Returns a fully populated state object with safe defaults.
   * Use this instead of `getState()` when you require non-undefined fields.
   */
  getStateOrDefaults(): ResolvedWebviewState {
    const state = this.getState();
    return {
      data: state?.data ?? (DEFAULT_STATE.data as unknown as JsonValue | null),
      orientation: (state?.orientation ?? DEFAULT_ORIENTATION) as Direction,
      path: state?.path ?? '',
      fileName: state?.fileName ?? '',
    };
  },
};
