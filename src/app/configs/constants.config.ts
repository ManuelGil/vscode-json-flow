/**
 * EXTENSION_ID: The unique identifier of the extension.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(EXTENSION_ID);
 *
 * @returns {string} - The unique identifier of the extension
 */
export const EXTENSION_ID: string = 'jsonManager';

/**
 * EXTENSION_NAME: The name of the extension.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(EXTENSION_NAME);
 *
 * @returns {string} - The name of the extension
 */
export const EXTENSION_NAME: string = 'JSON Manager';

/**
 * EXTENSION_REPOSITORY_URL: The repository URL of the extension.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(EXTENSION_REPOSITORY_URL);
 *
 * @returns {string} - The repository URL of the extension
 */
export const EXTENSION_REPOSITORY_URL: string =
  'https://github.com/ManuelGil/vscode-json-manager';

/**
 * EXTENSION_MARKETPLACE_URL: The marketplace URL of the extension.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(EXTENSION_MARKETPLACE_URL);
 *
 * @returns {string} - The marketplace URL of the extension
 */
export const EXTENSION_MARKETPLACE_URL: string =
  'https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-manager';

/**
 * EXTENSION_BUGS_URL: The bugs URL of the extension.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(EXTENSION_BUGS_URL);
 *
 * @returns {string} - The bugs URL of the extension
 */
export const EXTENSION_BUGS_URL: string =
  'https://github.com/ManuelGil/vscode-json-manager/issues';

/**
 * EXTENSION_SOCIAL_MEDIA_URL: The social media URL of the extension.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(EXTENSION_SOCIAL_MEDIA_URL);
 *
 * @returns {string} - The social media URL of the extension
 */
export const EXTENSION_SOCIAL_MEDIA_URL: string =
  'https://github.com/ManuelGil';

/**
 * EXTENSION_SPONSOR_URL: The sponsor URL of the extension.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(EXTENSION_SPONSOR_URL);
 *
 * @returns {string} - The sponsor URL of the extension
 */
export const EXTENSION_SPONSOR_URL: string =
  'https://github.com/sponsors/ManuelGil';

/**
 * EXTENSION_PAYPAL_URL: The PayPal URL of the extension.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(EXTENSION_PAYPAL_URL);
 *
 * @returns {string} - The PayPal URL of the extension
 */
export const EXTENSION_PAYPAL_URL: string =
  'https://www.paypal.com/paypalme/ManuelFGil';

/**
 * INCLUDE: The files to include.
 * @type {string[]}
 * @public
 * @memberof Constants
 * @example
 * console.log(INCLUDE);
 *
 * @returns {string[]} - The files to include
 */
export const INCLUDE: string[] = ['json', 'jsonc'];
/**
 * EXCLUDE: The files to exclude.
 * @type {string[]}
 * @public
 * @memberof Constants
 * @example
 * console.log(EXCLUDE);
 *
 * @returns {string[]} - The files to exclude
 */
export const EXCLUDE: string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/out/**',
  '**/build/**',
  '**/.*/**',
];

/**
 * SHOW_PATH: Whether to show the path or not.
 * @type {boolean}
 * @public
 * @memberof Constants
 * @example
 * console.log(SHOW_PATH);
 *
 * @returns {boolean} - Whether to show the path or not
 */
export const SHOW_PATH: boolean = true;
