import {
  Event,
  EventEmitter,
  ProviderResult,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
} from 'vscode';

import { FilesController } from '../controllers';
import { NodeModel } from '../models';

/**
 * The FilesProvider class
 *
 * @class
 * @classdesc The class that represents the files provider.
 * @export
 * @public
 * @implements {TreeDataProvider<NodeModel>}
 * @property {EventEmitter<NodeModel | undefined | null | void>} _onDidChangeTreeData - The onDidChangeTreeData event emitter
 * @property {Event<NodeModel | undefined | null | void>} onDidChangeTreeData - The onDidChangeTreeData event
 * @property {filesController} controller - The files controller
 * @example
 * const provider = new FilesProvider();
 *
 * @see https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider
 */
export class FilesProvider implements TreeDataProvider<NodeModel> {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  // Public properties
  /**
   * The onDidChangeTreeData event.
   * @type {Event<NodeModel | undefined | null | void>}
   * @public
   * @memberof FilesProvider
   * @example
   * readonly onDidChangeTreeData: Event<Node | undefined | null | void>;
   * this.onDidChangeTreeData = this._onDidChangeTreeData.event;
   *
   * @see https://code.visualstudio.com/api/references/vscode-api#Event
   */
  readonly onDidChangeTreeData: Event<NodeModel | undefined | null | void>;

  // Private properties
  /**
   * The onDidChangeTreeData event emitter.
   * @type {EventEmitter<NodeModel | undefined | null | void>}
   * @private
   * @memberof FilesProvider
   * @example
   * this._onDidChangeTreeData = new EventEmitter<Node | undefined | null | void>();
   * this.onDidChangeTreeData = this._onDidChangeTreeData.event;
   *
   * @see https://code.visualstudio.com/api/references/vscode-api#EventEmitter
   */
  private _onDidChangeTreeData: EventEmitter<
    NodeModel | undefined | null | void
  >;

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Constructor for the FilesProvider class
   *
   * @constructor
   * @public
   * @memberof FilesProvider
   */
  constructor(readonly controller: FilesController) {
    this._onDidChangeTreeData = new EventEmitter<
      NodeModel | undefined | null | void
    >();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  // Public methods
  /**
   * Returns the tree item for the supplied element.
   *
   * @function getTreeItem
   * @param {NodeModel} element - The element
   * @public
   * @memberof FilesProvider
   * @example
   * const treeItem = provider.getTreeItem(element);
   *
   * @returns {TreeItem | Thenable<TreeItem>} - The tree item
   *
   * @see https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider
   */
  // biome-ignore lint/correctness/noUndeclaredVariables: we dont control vscode's api
  getTreeItem(element: NodeModel): TreeItem | Thenable<TreeItem> {
    return element;
  }

  /**
   * Returns the children for the supplied element.
   *
   * @function getChildren
   * @param {NodeModel} [element] - The element
   * @public
   * @memberof FilesProvider
   * @example
   * const children = provider.getChildren(element);
   *
   * @returns {ProviderResult<NodeModel[]>} - The children
   *
   * @see https://code.visualstudio.com/api/references/vscode-api#TreeDataProvider
   */
  getChildren(element?: NodeModel): ProviderResult<NodeModel[]> {
    if (element) {
      return element.children;
    }

    return this.getListFiles();
  }

  /**
   * Refreshes the tree data.
   *
   * @function refresh
   * @public
   * @memberof FeedbackProvider
   * @example
   * provider.refresh();
   *
   * @returns {void} - No return value
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // Private methods
  /**
   * Gets the list of files.
   *
   * @function getListFiles
   * @private
   * @memberof FilesProvider
   * @example
   * const files = provider.getListFiles();
   *
   * @returns {Promise<NodeModel[] | undefined>} - The list of files
   */
  private async getListFiles(): Promise<NodeModel[] | undefined> {
    const { includedFilePatterns } = this.controller.config;

    const files = await this.controller.getFiles();

    if (!files) {
      return;
    }

    const nodes: NodeModel[] = [];

    for (const fileType of includedFilePatterns) {
      const children = files.filter((file) =>
        file.label.toString().includes(`.${fileType}`),
      );

      if (children.length !== 0) {
        const node = new NodeModel(
          `${fileType}: ${children.length}`,
          new ThemeIcon('folder-opened'),
          undefined,
          undefined,
          fileType,
          children,
        );

        nodes.push(node);
      }
    }

    if (nodes.length === 0) {
      return;
    }

    return nodes;
  }
}
