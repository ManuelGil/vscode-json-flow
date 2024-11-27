import { WorkspaceConfiguration } from 'vscode';

import {
  EDGE_COLOR,
  EXCLUDE,
  IMAGE_FOLDER,
  INCLUDE,
  LAYOUT_DIRECTION,
  NODE_BORDER_COLOR,
  NODE_COLOR,
  NODE_HEIGHT,
  NODE_WIDTH,
  SHOW_PATH,
  SHOW_VALUES,
} from './constants.config';

/**
 * The Config class.
 *
 * @class
 * @classdesc The class that represents the configuration of the extension.
 * @export
 * @public
 * @property {WorkspaceConfiguration} config - The workspace configuration
 * @property {string[]} include - The files to include
 * @property {string[]} exclude - The files to exclude
 * @property {boolean} showPath - Whether to show the path or not
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
   * The files to include.
   * @type {string[]}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.include);
   */
  include: string[];
  /**
   * The files to exclude.
   * @type {string[]}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.exclude);
   */
  exclude: string[];
  /**
   * Whether to show the path or not.
   * @type {boolean}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.showPath);
   */
  showPath: boolean;
  /**
   * Whether to show the values or not.
   * @type {boolean}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.showValues);
   */
  showValues: boolean;
  /**
   * The node width.
   * @type {number}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.nodeWidth);
   */
  nodeWidth: number;
  /**
   * The node height.
   * @type {number}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.nodeHeight);
   */
  nodeHeight: number;
  /**
   * The node border color.
   * @type {string}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.nodeBorderColor);
   */
  nodeBorderColor: string;
  /**
   * The node color.
   * @type {string}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.nodeColor);
   */
  nodeColor: string;
  /**
   * The edge color.
   * @type {string}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.edgeColor);
   */
  edgeColor: string;
  /**
   * The layout direction.
   * @type {'TB' | 'LR'}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.layoutDirection);
   */
  layoutDirection: 'TB' | 'LR';
  /**
   * The image folder.
   * @type {string}
   * @public
   * @memberof Config
   * @example
   * const config = new Config(workspace.getConfiguration());
   * console.log(config.imageFolder);
   */
  imageFolder: string;

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
    this.include = config.get<string[]>('files.include') ?? INCLUDE;
    this.exclude = config.get<string[]>('files.exclude') ?? EXCLUDE;
    this.showPath = config.get<boolean>('files.showPath') ?? SHOW_PATH;
    this.showValues = config.get<boolean>('graph.showValues') ?? SHOW_VALUES;
    this.nodeWidth = config.get<number>('graph.nodeWidth') ?? NODE_WIDTH;
    this.nodeHeight = config.get<number>('graph.nodeHeight') ?? NODE_HEIGHT;
    this.nodeBorderColor = config.get<string>('graph.nodeBorderColor') ?? NODE_BORDER_COLOR;
    this.nodeColor = config.get<string>('graph.nodeColor') ?? NODE_COLOR;
    this.edgeColor = config.get<string>('graph.edgeColor') ?? EDGE_COLOR;
    this.layoutDirection =
      config.get<'TB' | 'LR'>('graph.layoutDirection') ?? LAYOUT_DIRECTION;
    this.imageFolder = config.get<string>('image.folder') ?? IMAGE_FOLDER;
  }
}
