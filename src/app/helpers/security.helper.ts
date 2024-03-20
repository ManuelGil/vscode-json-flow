/**
 * Provides protection against directory traversal.
 *
 * @param {string} filename - The filename to sanitize
 * @example
 * sanitizeFilename('foo.bar');
 *
 * @returns {string} - The sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
};

/**
 * Strips HTML tags from a string.
 *
 * @param {string} html - The HTML to strip
 * @example
 * stripHtmlTags('<p>foo</p>');
 *
 * @returns {string} - The stripped HTML
 */
export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Escapes a string for use in HTML.
 * @param {string} str - The string to escape
 * @example
 * escapeHtml('<p>foo</p>');
 *
 * @returns {string} - The escaped string
 */
export const escapeHtml = (str: string): string => {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

/**
 * Escapes a string for use in JavaScript.
 * @param {string} str - The string to escape
 * @example
 * escapeJs('foo "bar"');
 *
 * @returns {string} - The escaped string
 */
export const escapeJs = (str: string): string => {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
};

/**
 * Escapes a string for use in a URL.
 *
 * @param {string} str - The string to escape
 * @example
 * escapeUrl('foo bar');
 *
 * @returns {string} - The escaped string
 */
export const escapeUrl = (str: string): string => {
  return encodeURIComponent(str);
};

/**
 * Escapes a string for use in a regular expression.
 *
 * @param {string} str - The string to escape
 * @example
 * escapeRegExp('foo.bar');
 *
 * @returns {string} - The escaped string
 */
export const escapeRegExp = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Returns a random nonce.
 *
 * @example
 * const nonce = getNonce();
 *
 * @returns {string} - The nonce
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
