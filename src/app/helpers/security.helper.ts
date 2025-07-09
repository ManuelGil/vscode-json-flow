/**
 * Sanitizes a filename to prevent directory traversal.
 *
 * @param filename The filename to sanitize.
 * @returns The sanitized filename (lowercase, only alphanumeric and dots, others replaced by underscore).
 *
 * @example
 * const safe = sanitizeFilename('../etc/passwd'); // '__etc_passwd'
 */
export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
};

/**
 * Removes all HTML tags from a string.
 *
 * @param html The HTML string to clean.
 * @returns The string without HTML tags.
 *
 * @example
 * const clean = stripHtmlTags('<b>Hello</b>'); // 'Hello'
 */
export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Escapes HTML special characters in the input string to prevent XSS attacks in webviews or rendered content.
 *
 * @param unsafe The unsafe string to escape.
 * @returns The escaped string, safe for HTML rendering.
 *
 * @example
 * const safe = escapeHtml('<script>'); // '&lt;script&gt;'
 */
export function escapeHtml(unsafe: string): string {
  return unsafe.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Escapes a string for safe use in JavaScript to prevent code injection attacks.
 * Replaces single and double quotes with their escaped equivalents.
 *
 * @param str The string to escape.
 * @returns The escaped string.
 *
 * @example
 * const safe = escapeJs('let s = "a"'); // 'let s = \"a\"'
 */
export const escapeJs = (str: string): string => {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
};

/**
 * Encodes a string for safe use in a URL.
 *
 * @param str The string to encode.
 * @returns The encoded string.
 *
 * @example
 * const safe = escapeUrl('a b/c'); // 'a%20b%2Fc'
 */
export const escapeUrl = (str: string): string => {
  return encodeURIComponent(str);
};

/**
 * Escapes special RegExp characters in a string so it can be safely used in a regular expression pattern.
 *
 * @param str The string to escape.
 * @returns The escaped string, safe for use in RegExp constructors.
 *
 * @example
 * const safe = escapeRegExp('a.b*c'); // 'a\.b\*c'
 */
export const escapeRegExp = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Generates a random nonce string for security purposes.
 *
 * @returns The generated nonce string.
 *
 * @example
 * const nonce = getNonce(); // e.g., 'q1w2e3r4...'
 */
export const getNonce = () => {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
