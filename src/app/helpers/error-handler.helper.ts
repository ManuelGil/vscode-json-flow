/**
 * Centralized error handler for parsing and provider modules.
 * Throws or formats errors in a consistent way across the codebase.
 *
 * @param message The error message.
 * @param originalError (Optional) The original error object.
 * @throws Error
 *
 * @example
 * throwError('Invalid format', err);
 */
export function throwError(message: string, originalError?: unknown): never {
  const details =
    originalError instanceof Error ? `: ${originalError.message}` : '';
  throw new Error(`[JSON Flow] ${message}${details}`);
}

/**
 * Formats an error for display or logging.
 * @param message The error message.
 * @param originalError (Optional) The original error object.
 * @returns Formatted error string.
 */
export function formatError(message: string, originalError?: unknown): string {
  const details =
    originalError instanceof Error ? `: ${originalError.message}` : '';
  return `[JSON Flow] ${message}${details}`;
}
