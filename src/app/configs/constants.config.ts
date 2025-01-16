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
export const EXTENSION_ID: string = 'jsonFlow';

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
export const EXTENSION_NAME: string = 'JSON Flow';

/**
 * USER_PUBLISHER: The publisher of the extension.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(USER_PUBLISHER);
 *
 * @returns {string} - The publisher of the extension
 */
export const USER_PUBLISHER: string = 'imgildev';

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
  'https://github.com/ManuelGil/vscode-json-flow';

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
  'https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow';

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
  'https://github.com/ManuelGil/vscode-json-flow/issues';

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
export const INCLUDE: string[] = [
  'json',
  'jsonc',
  'json5',
  'cfg',
  'csv',
  'env',
  'hcl',
  'ini',
  'properties',
  'toml',
  'tsv',
  'xml',
  'yaml',
  'yml',
];

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
  '**/vendor/**',
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

/**
 * SHOW_VALUES: Whether to show the values or not.
 * @type {boolean}
 * @public
 * @memberof Constants
 * @example
 * console.log(SHOW_VALUES);
 *
 * @returns {boolean} - Whether to show the values or not
 */
export const SHOW_VALUES: boolean = true;

/**
 * NODE_WIDTH: The node width.
 * @type {number}
 * @public
 * @memberof Constants
 * @example
 * console.log(NODE_WIDTH);
 *
 * @returns {number} - The node width
 */
export const NODE_WIDTH: number = 200;

/**
 * NODE_HEIGHT: The node height.
 * @type {number}
 * @public
 * @memberof Constants
 * @example
 * console.log(NODE_HEIGHT);
 *
 * @returns {number} - The node height
 */
export const NODE_HEIGHT: number = 50;

/**
 * NODE_BORDER_COLOR: The node border color.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(NODE_BORDER_COLOR);
 *
 * @returns {string} - The node border color
 */
export const NODE_BORDER_COLOR = 'white';

/**
 * NODE_COLOR: The node color.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(NODE_COLOR);
 *
 * @returns {string} - The node color
 */
export const NODE_COLOR = 'white';

/**
 * EDGE_COLOR: The edge color.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(EDGE_COLOR);
 *
 * @returns {string} - The edge color
 */
export const EDGE_COLOR = 'white';

/**
 * LAYOUT_DIRECTION: The layout direction.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(LAYOUT_DIRECTION);
 *
 * @returns {string} - The layout direction
 */
export const LAYOUT_DIRECTION: 'TB' | 'LR' = 'TB';

/**
 * IMAGE_FOLDER: The image folder.
 * @type {string}
 * @public
 * @memberof Constants
 * @example
 * console.log(IMAGE_FOLDER);
 *
 * @returns {string} - The image folder
 */
export const IMAGE_FOLDER: string = 'json-flow/images';
