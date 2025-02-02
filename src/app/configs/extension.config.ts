import { WorkspaceConfiguration } from 'vscode';

import {
  EXCLUDE,
  IMAGE_FOLDER,
  INCLUDE,
  LAYOUT_DIRECTION,
  SHOW_PATH,
} from './constants.config';

/**
 * The Config class.
 *
 * @class
 * @classdesc The class that represents the configuration of the extension.
 * @export
 * @public
 * @property {boolean} enable - Whether the extension is enabled or not
 * @property {string[]} includedFilePatterns - The extension files to include in the search
 * @property {string[]} excludedFilePatterns - The pattern to exclude files or folders from the search
 * @property {boolean} includeFilePath - Whether to show the path or not in the search results
 * @property {'TB' | 'LR' | 'BT' | 'RL'} graphLayoutOrientation - The layout direction of the graph
 * @property {string} storagePathForImages - The image folder
 * @example
 * const config = new Config(workspace.getConfiguration());
 * console.log(config.include);
 * console.log(config.exclude);
 */
export class ExtensionConfig {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  // Public properties
  /**
   * Whether the extension is enabled or not.
   * @type {boolean}
   * @public
   * @memberof ExtensionConfig
   * @example
   * const config = new ExtensionConfig(workspace.getConfiguration());
   * console.log(config.enable);
   */
  enable: boolean;

  /**
   * The extension files to include in the search.
   * @type {string[]}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.includedFilePatterns);
   */
  includedFilePatterns: string[];
  /**
   * The pattern to exclude files or folders from the search.
   * @type {string[]}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.excludedFilePatterns);
   */
  excludedFilePatterns: string[];
  /**
   * Whether to show the path or not in the search results.
   * @type {boolean}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.includeFilePath);
   */
  includeFilePath: boolean;
  /**
   * The layout direction of the graph.
   * @type {'TB' | 'LR' | 'BT' | 'RL'}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.graphLayoutOrientation);
   */
  graphLayoutOrientation: 'TB' | 'LR' | 'BT' | 'RL';
  /**
   * The image folder.
   * @type {string}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.storagePathForImages);
   */
  storagePathForImages: string;

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Constructor for the Config class.
   *
   * @constructor
   * @param {WorkspaceConfiguration} config - The workspace configuration
   * @public
   * @memberof Config
   */
  constructor(readonly config: WorkspaceConfiguration) {
    this.enable = config.get<boolean>('enable', true);
    this.includedFilePatterns = config.get<string[]>(
      'files.includedFilePatterns',
      INCLUDE,
    );
    this.excludedFilePatterns = config.get<string[]>(
      'files.excludedFilePatterns',
      EXCLUDE,
    );
    this.includeFilePath = config.get<boolean>(
      'files.includeFilePath',
      SHOW_PATH,
    );
    this.graphLayoutOrientation = config.get<'TB' | 'LR' | 'BT' | 'RL'>(
      'graph.layoutOrientation',
      LAYOUT_DIRECTION,
    );
    this.storagePathForImages = config.get<string>(
      'storage.pathForImages',
      IMAGE_FOLDER,
    );
  }

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  // Public methods
  /**
   * The update method.
   *
   * @function update
   * @param {WorkspaceConfiguration} config - The workspace configuration
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * config.update(workspace.getConfiguration());
   */
  update(config: WorkspaceConfiguration): void {
    this.enable = config.get<boolean>('enable', this.enable);
    this.includedFilePatterns = config.get<string[]>(
      'files.includedFilePatterns',
      this.includedFilePatterns,
    );
    this.excludedFilePatterns = config.get<string[]>(
      'files.excludedFilePatterns',
      this.excludedFilePatterns,
    );
    this.includeFilePath = config.get<boolean>(
      'files.includeFilePath',
      this.includeFilePath,
    );
    this.graphLayoutOrientation = config.get<'TB' | 'LR' | 'BT' | 'RL'>(
      'graph.layoutOrientation',
      this.graphLayoutOrientation,
    );
    // Set the folder to store the images
    this.storagePathForImages = config.get<string>(
      'storage.pathForImages',
      this.storagePathForImages,
    );
  }
}
