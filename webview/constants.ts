/**
 * Global constants for the webview layer.
 *
 * Centralizes default values to avoid magic literals scattered across the codebase
 * and to keep defaults consistent.
 */
import type { Direction } from './types';

/** Default orientation for layouts rendered with React Flow. */
export const DEFAULT_ORIENTATION: Direction = 'TB';

/**
 * Default persisted state for the VSCode webview. This object matches the shape
 * expected by the state service (`WebviewState` without the `undefined` case).
 *
 * Note: We intentionally avoid importing the `WebviewState` type here to prevent
 * circular dependencies. Treat this as the canonical source for default values.
 */
export const DEFAULT_STATE = {
  data: null as unknown, // JsonValue | null at usage sites
  orientation: DEFAULT_ORIENTATION as Direction,
  path: '',
  fileName: '',
} as const;
