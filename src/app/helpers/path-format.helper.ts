/**
 * @fileoverview Path formatting utilities.
 *
 * Provides cross-platform normalization helpers to ensure
 * consistent POSIX-style paths across the extension.
 */

/**
 * Normalizes a filesystem path to POSIX format.
 *
 * Converts Windows backslashes (`\`) into forward slashes (`/`)
 * to ensure compatibility with glob patterns and path comparisons.
 *
 * @param value - The path to normalize.
 * @returns POSIX-normalized path.
 */
export const toPosixPath = (value: string): string => value.replace(/\\/g, '/');
