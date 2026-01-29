/**
 * Lightweight logger utility.
 *
 * In production builds, logs are silenced to avoid leaking internal
 * details or cluttering the devtools console inside VSCode webviews.
 */
const isDev = !!import.meta.env?.DEV;

const isDebugEnabled = true;

function makeLogger(method: 'log' | 'info' | 'warn' | 'error') {
  return (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console[method](...args);
    }
  };
}

/** Dev-only console.log */
export const log = makeLogger('log');
/** Dev-only console.info */
export const info = makeLogger('info');
/** Dev-only console.warn */
export const warn = makeLogger('warn');
/** Dev-only console.error */
export const error = makeLogger('error');
