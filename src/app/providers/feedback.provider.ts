import {
  Event,
  EventEmitter,
  l10n,
  ProviderResult,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
} from 'vscode';

import { EXTENSION_ID } from '../configs';
import { FeedbackController } from '../controllers';
import { NodeModel } from '../models';

/**
 * Provides the feedback tree for the VSCode JSON Flow extension.
 * Responsible for displaying feedback actions in the explorer view.
 */
export class FeedbackProvider implements TreeDataProvider<TreeItem> {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  /**
   * Event triggered when the feedback tree data is updated, prompting the VSCode view to refresh.
   */
  readonly onDidChangeTreeData: Event<NodeModel | undefined | null | void>;

  /**
   * Internal event emitter for feedback tree data changes. Used to signal the view to update.
   * @private
   */
  private _onDidChangeTreeData: EventEmitter<
    NodeModel | undefined | null | void
  >;

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Constructs a FeedbackProvider responsible for managing feedback actions in the explorer view.
   * @param controller FeedbackController instance providing feedback-related actions.
   */
  constructor(readonly controller: FeedbackController) {
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
   * Returns the tree item representation for the given element.
   * @param element The element for which to return the tree item.
   */
  getTreeItem(element: NodeModel): TreeItem | Thenable<TreeItem> {
    return element;
  }

  /**
   * Returns the child nodes for the given element, or the root feedback actions if no element is provided.
   * @param element The parent node, or undefined for root nodes.
   */
  getChildren(element?: NodeModel): ProviderResult<NodeModel[]> {
    if (element) {
      return element.children ?? [];
    }
    return this.getListFeedback();
  }

  /**
   * Refreshes the feedback tree view, causing it to be re-rendered in the explorer.
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Returns the feedback actions for the feedback tree view as NodeModel instances.
   * @private
   * @returns Promise<NodeModel[]> Array of feedback action nodes.
   */
  private async getListFeedback(): Promise<NodeModel[]> {
    return this.buildFeedbackActions();
  }

  /**
   * Creates the feedback action nodes (e.g., open website, report bug, rate extension) for the tree view.
   * @returns Array of NodeModel instances representing feedback actions.
   */
  private buildFeedbackActions(): NodeModel[] {
    const actions = [
      {
        label: l10n.t('Extension Website'),
        icon: new ThemeIcon('globe'),
        command: {
          command: `${EXTENSION_ID}.feedback.aboutUs`,
          title: l10n.t('Open Extension Website'),
        },
      },
      {
        label: l10n.t('Report a Bug'),
        icon: new ThemeIcon('bug'),
        command: {
          command: `${EXTENSION_ID}.feedback.reportIssues`,
          title: l10n.t('Report a Bug'),
        },
      },
      {
        label: l10n.t('Rate Us'),
        icon: new ThemeIcon('star-full'),
        command: {
          command: `${EXTENSION_ID}.feedback.rateUs`,
          title: l10n.t('Rate Us'),
        },
      },
    ];
    return actions.map(
      (action) => new NodeModel(action.label, action.icon, action.command),
    );
  }
}
