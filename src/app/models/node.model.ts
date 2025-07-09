import {
  Command,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  TreeItemLabel,
  Uri,
} from 'vscode';

/**
 * NodeModel represents a node in the custom tree view for the VSCode extension explorer.
 * Encapsulates label, icon, command, children, and other VSCode-specific metadata.
 * Follows SOLID principles for maintainability and extensibility.
 *
 * @example
 * const node = new NodeModel('Settings', undefined, undefined, undefined, 'settings', []);
 *
 * @see https://code.visualstudio.com/api/references/vscode-api#TreeItem
 */
export class NodeModel extends TreeItem {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  /**
   * Child nodes of this tree node, used for hierarchical tree structures in the explorer.
   */
  children?: NodeModel[];

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Creates a new node for the tree view, encapsulating label, icon, command, and child nodes.
   * @param {string | TreeItemLabel} label The label for the node.
   * @param {string | Uri | { light: Uri; dark: Uri } | ThemeIcon} [iconPath] Optional icon for the node.
   * @param {Command} [command] Optional command to execute when the node is activated.
   * @param {Uri} [resourceUri] Optional resource URI associated with this node.
   * @param {string} [contextValue] Optional context value for VSCode context menus.
   * @param {NodeModel[]} [children] Optional array of child NodeModel instances.
   */
  constructor(
    readonly label: string | TreeItemLabel,
    readonly iconPath?: string | Uri | { light: Uri; dark: Uri } | ThemeIcon,
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

  /**
   * Assigns an array of child nodes to this node and updates its collapsible state.
   * @param children Array of NodeModel instances to set as children.
   */
  setChildren(children: NodeModel[]): void {
    this.collapsibleState = TreeItemCollapsibleState.Expanded;
    this.children = children;
  }

  /**
   * Checks whether this node has any child nodes.
   * @returns True if children exist, false otherwise.
   */
  hasChildren(): boolean {
    return !!this.children && this.children.length > 0;
  }
}
