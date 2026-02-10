/**
 * Lightweight logger utility.
 *
 * In production builds, logs are silenced to avoid leaking internal
 * details or cluttering the devtools console inside VSCode webviews.
 */
const isDev = !!import.meta.env?.DEV;

/** Dev-only console.error for unexpected-state diagnostics. */
export const error = (...args: unknown[]): void => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
};
