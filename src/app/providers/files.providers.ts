import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
} from 'vscode';

import { FilesController } from '../controllers';
import { NodeModel } from '../models';

/**
 * Provides the file tree for the VSCode JSON Flow extension.
 * Responsible for managing and grouping file nodes for display in the explorer view.
 */
export class FilesProvider implements TreeDataProvider<NodeModel> {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  /**
   * Event fired when the file tree data changes.
   */
  readonly onDidChangeTreeData: Event<NodeModel | undefined | null | void>;

  /**
   * Internal event emitter for file tree data changes. Used to signal the view to update.
   * @private
   */
  private _onDidChangeTreeData: EventEmitter<
    NodeModel | undefined | null | void
  >;

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Constructs a FilesProvider responsible for managing and grouping file nodes in the explorer view.
   * @param controller FilesController instance providing file data and configuration.
   */
  constructor(readonly controller: FilesController) {
    this._onDidChangeTreeData = new EventEmitter<
      NodeModel | undefined | null | void
    >();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  /**
   * Disposes internal resources and event listeners to prevent memory leaks.
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  /**
   * Returns the tree item representation for the given file node.
   * @param element The node for which to return the tree item.
   */
  getTreeItem(element: NodeModel): TreeItem {
    return element;
  }

  /**
   * Returns the child nodes for the given file node, or the root file groups if no node is provided.
   * @param element The parent node, or undefined for root nodes.
   */
  async getChildren(element?: NodeModel): Promise<NodeModel[] | undefined> {
    if (element) {
      return element.children;
    }

    return this.getListFiles();
  }

  /**
   * Refreshes the file tree view, causing it to be re-rendered in the explorer.
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Retrieves and groups files by type, constructing NodeModel nodes for the tree view.
   * Only NodeModel instances are used to ensure type consistency.
   * @returns Promise resolving to an array of grouped NodeModel nodes or undefined if none.
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
