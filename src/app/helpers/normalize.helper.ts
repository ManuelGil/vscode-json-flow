/**
 * Normalize text to a JSON-like string format.
 *
 * Converts common JavaScript/TypeScript object literal notations into a
 * JSON/JSONC-friendly string by quoting keys and normalizing quotes/braces.
 *
 * @param text The raw text to normalize (e.g., copied JS/TS object literal).
 * @param fileType The language id or type hint (e.g., 'typescript', 'json').
 * @returns An object with:
 * - `normalized`: the transformed JSON/JSONC-like string
 * - `detectedType`: either the original `fileType` or 'jsonc' when JS/TS
 *
 * @remarks
 * Heuristic-only. Not a full JS/TS parser. Intended to make quick pastes usable
 * by downstream tolerant parsers. Nested edge cases (e.g., regex literals,
 * quotes within strings) may require manual fixes.
 *
 * @example
 * const { normalized } = normalizeToJsonString("const x = { foo: 'bar' }", 'typescript');
 * // normalized => "{ \"foo\": \"bar\" }"
 */
export function normalizeToJsonString(
  text: string,
  fileType: string,
): { normalized: string; detectedType: string } {
  let normalized = text;
  let detectedType = fileType;

  if (
    ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'].includes(
      fileType,
    )
  ) {
    detectedType = 'jsonc';
    normalized = text
      .replace(/'([^']+)'/g, '"$1"')
      .replace(/(["'])?([a-zA-Z0-9_]+)(["'])?:/g, '"$2":')
      .replace(/,*\s*\n*\]/g, ']')
      .replace(/{\s*\n*/g, '{')
      .replace(/,*\s*\n*};*/g, '}');
  }

  return { normalized, detectedType };
}
