/**
 * Throws a new Error with a message and optional cause.
 * Usage: throwError('Some message', error)
 */
export function throwError(message: string, error?: unknown): never {
  if (error instanceof Error) {
    throw new Error(`${message}: ${error.message}`);
  }
  throw new Error(message);
}
