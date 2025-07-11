/** Unique identifier for the extension. */
export const EXTENSION_ID: string = 'jsonFlow';

/** Repository ID for the extension. */
export const EXTENSION_NAME: string = 'vscode-json-flow';

/** Display name for the extension. */
export const EXTENSION_DISPLAY_NAME: string = 'JSON Flow';

/** GitHub username for the extension author. */
export const GITHUB_USER_NAME: string = 'ManuelGil';

/** Publisher ID for the extension. */
export const EXTENSION_USER_PUBLISHER: string = 'imgildev';

/** Repository URL for the extension. */
export const EXTENSION_REPOSITORY_URL: string = `https://github.com/${GITHUB_USER_NAME}/${EXTENSION_NAME}`;

/** Marketplace URL for the extension. */
export const EXTENSION_MARKETPLACE_URL: string = `https://marketplace.visualstudio.com/items?itemName=${EXTENSION_USER_PUBLISHER}.${EXTENSION_NAME}`;

/** Website URL for the extension. */
export const EXTENSION_WEBSITE_URL: string = `https://json-flow.com`;

/** Issues URL for the extension. */
export const EXTENSION_BUGS_URL: string = `${EXTENSION_REPOSITORY_URL}/issues`;

/** File patterns to include by default. */
export const DEFAULT_INCLUDE_PATTERNS: string[] = [
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

/** File patterns to exclude by default. */
export const DEFAULT_EXCLUDE_PATTERNS: string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/out/**',
  '**/build/**',
  '**/vendor/**',
];

/** Default recursion depth for file search (0 = unlimited). */
export const DEFAULT_MAX_SEARCH_RECURSION_DEPTH: number = 0;

/** Default for supporting hidden files. */
export const DEFAULT_SUPPORTS_HIDDEN_FILES: boolean = true;

/** Default for preserving .gitignore settings. */
export const DEFAULT_PRESERVE_GITIGNORE_SETTINGS: boolean = false;

/** Default for showing file path in results. */
export const IS_INCLUDE_FILE_PATH_DEFAULT: boolean = true;

/** Default layout direction for the graph. */
export const LAYOUT_DIRECTION: 'TB' | 'LR' | 'BT' | 'RL' = 'TB';
