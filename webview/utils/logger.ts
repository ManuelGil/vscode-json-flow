/**
 * Lightweight logger utility.
 *
 * In production builds, logs are silenced to avoid leaking internal
 * details or cluttering the devtools console inside VSCode webviews.
 */

import { IS_DEV } from '@webview/env';

/** Dev-only console.error for unexpected-state diagnostics. */
export const error = (...args: unknown[]): void => {
  if (IS_DEV) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
};
