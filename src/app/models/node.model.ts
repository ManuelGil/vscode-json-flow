import {
  Command,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  TreeItemLabel,
  Uri,
} from 'vscode';

/**
 * The Node class
 *
 * @class
 * @classdesc The class that represents a node in the tree view.
 * @export
 * @public
 * @extends {TreeItem}
 * @property {string | TreeItemLabel} label - The label
 * @property {string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon} [iconPath] - The icon path
 * @property {Command} [command] - The command
 * @property {Uri} [resourceUri] - The resource URI
 * @property {string} [contextValue] - The context value
 * @property {Node[]} [children] - The children
 * @example
 * const node = new Node('About Us', TreeItemCollapsibleState.None, 'about', {
 *   title: 'About Us',
 *   command: 'extension-stater-kit.aboutUs',
 * });
 *
 * @see https://code.visualstudio.com/api/references/vscode-api#TreeItem
 */
export class NodeModel extends TreeItem {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  // Public properties
  /**
   * The children.
   * @type {NodeModel[]}
   * @public
   * @memberof NodeModel
   * @example
   * node.children = [];
   */
  children?: NodeModel[];

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * The constructor
   *
   * @constructor
   * @param {string | TreeItemLabel} label - The label
   * @param {string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon} [iconPath] - The icon path
   * @param {Command} [command] - The command
   * @param {Uri} [resourceUri] - The resource URI
   * @param {string} [contextValue] - The context value
   * @param {NodeModel[]} [children] - The children
   * @example
   * const node = new Node('About Us', new ThemeIcon('info'), {
   *   title: 'About Us',
   *   command: 'extension-stater-kit.aboutUs',
   * });
   */
  constructor(
    readonly label: string | TreeItemLabel,
    readonly iconPath?:
      | string
      | Uri
      | { light: string | Uri; dark: string | Uri }
      | ThemeIcon,
    readonly command?: Command,
    readonly resourceUri?: Uri,
    readonly contextValue?: string,
    children?: NodeModel[],
  ) {
    super(
      label,
      children
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.None,
    );
    this.iconPath = iconPath;
    this.resourceUri = resourceUri;
    this.command = command;
    this.contextValue = contextValue;
    this.children = children;
  }

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  // Public methods
  /**
   * The setChildren method
   *
   * @function setChildren
   * @param {NodeModel[]} children - The children
   * @public
   * @memberof NodeModel
   * @example
   * node.setChildren([]);
   *
   * @returns {void} The result
   */
  setChildren(children: NodeModel[]): void {
    this.collapsibleState = TreeItemCollapsibleState.Expanded;
    this.children = children;
  }

  /**
   * The hasChildren method
   *
   * @function hasChildren
   * @public
   * @memberof NodeModel
   * @example
   * const hasChildren = node.hasChildren();
   *
   * @returns {boolean} The result
   */
  hasChildren(): boolean {
    return !!(this.children && this.children.length);
  }
}
