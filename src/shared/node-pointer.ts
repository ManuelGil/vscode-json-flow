/**
 * Shared utility for JSON Pointer-based node identity strings.
 *
 * Implements the Node Identity Specification v1.0.0.
 * Compliant with RFC 6901 escaping rules, with one documented
 * deviation: root is represented as "/" instead of "".
 *
 * Zero dependencies. No runtime-specific imports.
 * Safe to import from Extension Host, Webview, and Web Worker.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The canonical root pointer. */
const ROOT_POINTER = '/';

/**
 * Pattern that detects an unescaped tilde: a `~` NOT followed by `0` or `1`.
 * Used by {@link isValidPointer} to reject malformed pointers.
 */
const INVALID_TILDE_PATTERN: RegExp = /~(?![01])/;

// ---------------------------------------------------------------------------
// Encoding / Decoding
// ---------------------------------------------------------------------------

/**
 * Encodes a raw key string into a JSON Pointer reference token (segment).
 *
 * Escaping order (RFC 6901 Section 3):
 *   1. Replace every `~` with `~0`
 *   2. Replace every `/` with `~1`
 *
 * @param rawKey - The unescaped property key or stringified array index.
 * @returns The encoded segment safe for use inside a pointer.
 *
 * @example
 * encodeSegment('foo')   // 'foo'
 * encodeSegment('a/b')   // 'a~1b'
 * encodeSegment('c~d')   // 'c~0d'
 * encodeSegment('~/')    // '~0~1'
 * encodeSegment('')      // ''
 * encodeSegment('0')     // '0'
 */
function encodeSegment(rawKey: string): string {
  // Step 1: escape tildes, Step 2: escape slashes.
  // Order is critical — reversing it corrupts `~/` sequences.
  return rawKey.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Decodes a JSON Pointer reference token (segment) back to the raw key.
 *
 * Unescaping order (inverse of encoding):
 *   1. Replace every `~1` with `/`
 *   2. Replace every `~0` with `~`
 *
 * @param encoded - The escaped segment from a pointer string.
 * @returns The original unescaped key string.
 *
 * @example
 * decodeSegment('foo')    // 'foo'
 * decodeSegment('a~1b')   // 'a/b'
 * decodeSegment('c~0d')   // 'c~d'
 * decodeSegment('~0~1')   // '~/'
 * decodeSegment('')       // ''
 * decodeSegment('0')      // '0'
 */
function decodeSegment(encoded: string): string {
  // Step 1: unescape slashes, Step 2: unescape tildes.
  return encoded.replace(/~1/g, '/').replace(/~0/g, '~');
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Builds a child pointer by appending an encoded segment to a parent pointer.
 *
 * Rules:
 * - If `parent` is `"/"` (root), the result is `"/" + encodeSegment(rawKey)`.
 * - Otherwise, the result is `parent + "/" + encodeSegment(rawKey)`.
 * - `parent` must be a valid pointer (starts with `/`).
 * - `rawKey` must not be `undefined` or `null`.
 *
 * @param parent - The parent node's pointer string.
 * @param rawKey - The raw (unescaped) key or stringified array index.
 * @returns The child pointer string.
 * @throws {Error} If `parent` does not start with `/`.
 *
 * @example
 * buildPointer('/', 'foo')       // '/foo'
 * buildPointer('/', '0')         // '/0'
 * buildPointer('/', 'a/b')       // '/a~1b'
 * buildPointer('/foo', 'bar')    // '/foo/bar'
 * buildPointer('/foo', '0')      // '/foo/0'
 * buildPointer('/foo', 'c~d')    // '/foo/c~0d'
 * buildPointer('/', '')          // '//'
 * buildPointer('/a', '')         // '/a/'
 */
export function buildPointer(parent: string, rawKey: string): string {
  if (!parent.startsWith('/')) {
    throw new Error(
      `buildPointer: parent must start with "/", received "${parent}"`,
    );
  }

  const segment: string = encodeSegment(rawKey);

  if (parent === ROOT_POINTER) {
    return `/${segment}`;
  }

  return `${parent}/${segment}`;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parses a pointer string into an array of decoded segments.
 *
 * - `"/"` (root) returns an empty array `[]`.
 * - `"/foo/bar"` returns `["foo", "bar"]`.
 * - Each segment is decoded via {@link decodeSegment}.
 *
 * @param pointer - A valid pointer string starting with `/`.
 * @returns An array of decoded key strings. Empty array for root.
 * @throws {Error} If the pointer is invalid.
 *
 * @example
 * parsePointer('/')           // []
 * parsePointer('/foo')        // ['foo']
 * parsePointer('/foo/bar')    // ['foo', 'bar']
 * parsePointer('/foo/0')      // ['foo', '0']
 * parsePointer('/a~1b')       // ['a/b']
 * parsePointer('/c~0d')       // ['c~d']
 * parsePointer('/~0~1')       // ['~/']
 * parsePointer('//')          // ['']
 * parsePointer('//foo')       // ['', 'foo']
 */
export function parsePointer(pointer: string): string[] {
  if (!isValidPointer(pointer)) {
    throw new Error(
      `parsePointer: invalid pointer "${pointer}". Must start with "/" and contain no unescaped "~".`,
    );
  }

  // Root pointer has no segments.
  if (pointer === ROOT_POINTER) {
    return [];
  }

  // Remove the leading '/' then split by '/'.
  const rawSegments: string[] = pointer.substring(1).split('/');

  return rawSegments.map(decodeSegment);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Checks whether a string is a valid node pointer.
 *
 * A valid pointer:
 * 1. Is a non-empty string.
 * 2. Starts with `/`.
 * 3. Contains no unescaped `~` (i.e., every `~` is followed by `0` or `1`).
 *
 * @param value - The string to validate.
 * @returns `true` if the string is a valid pointer, `false` otherwise.
 *
 * @example
 * isValidPointer('/')          // true
 * isValidPointer('/foo')       // true
 * isValidPointer('/a~1b')      // true
 * isValidPointer('/a~0b')      // true
 * isValidPointer('')           // false  (empty)
 * isValidPointer('foo')        // false  (no leading /)
 * isValidPointer('/a~b')       // false  (unescaped ~)
 * isValidPointer('/a~2b')      // false  (invalid escape ~2)
 */
function isValidPointer(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }

  if (value[0] !== '/') {
    return false;
  }

  // Check for unescaped tildes: ~ not followed by 0 or 1.
  if (INVALID_TILDE_PATTERN.test(value)) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Convenience
// ---------------------------------------------------------------------------

/**
 * Returns the last segment of a pointer, decoded.
 * Useful for deriving a display label from a pointer.
 *
 * Returns `undefined` for the root pointer `/`.
 *
 * @param pointer - A valid pointer string.
 * @returns The decoded last segment, or `undefined` for root.
 *
 * @example
 * lastSegment('/')           // undefined
 * lastSegment('/foo')        // 'foo'
 * lastSegment('/foo/bar')    // 'bar'
 * lastSegment('/a~1b/c~0d') // 'c~d'
 * lastSegment('/items/0')   // '0'
 */
export function lastSegment(pointer: string): string | undefined {
  const segments: string[] = parsePointer(pointer);

  if (segments.length === 0) {
    return undefined;
  }

  return segments[segments.length - 1];
}

/** Re-export the root constant for external use. */
export const POINTER_ROOT: string = ROOT_POINTER;
