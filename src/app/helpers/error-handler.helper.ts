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
export function throwError(message: string, error?: unknown): never {
  if (error instanceof Error) {
    throw new Error(`${message}: ${error.message}`);
  }
  throw new Error(message);
}
