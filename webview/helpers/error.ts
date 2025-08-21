/**
 * Throws a new Error with a message and optional cause.
 * Provides consistent error handling with message chaining.
 *
 * @param message - Primary error message
 * @param error - Optional underlying error to chain
 * @returns Never returns (always throws)
 * @throws {Error} Always throws an Error with the provided message
 *
 * @example
 * ```typescript
 * try {
 *   riskyOperation();
 * } catch (err) {
 *   throwError('Operation failed', err);
 * }
 * ```
 */
export function throwError(message: string, error?: unknown): never {
  if (error instanceof Error) {
    throw new Error(`${message}: ${error.message}`);
  }
  throw new Error(message);
}
