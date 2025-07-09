import { WorkspaceConfiguration } from 'vscode';

import {
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_INCLUDE_PATTERNS,
  IS_INCLUDE_FILE_PATH_DEFAULT,
  LAYOUT_DIRECTION,
} from './constants.config';

/**
 * Stores and manages extension configuration options.
 */
export class ExtensionConfig {
  // -----------------------------------------------------------------
  // Properties
  // -----------------------------------------------------------------

  /**
   * Indicates whether the extension is enabled and active in the current workspace.
   */
  enable: boolean;

  /**
   * Glob patterns for files to include in the extension's file operations (e.g., for tree views and search).
   */
  includedFilePatterns: string[];

  /**
   * Glob patterns for files to exclude from the extension's file operations.
   */
  excludedFilePatterns: string[];

  /**
   * Whether to show the file path in the search results.
   */
  includeFilePath: boolean;

  /**
   * Orientation of the graph layout in the extension's UI (e.g., for visualizations or previews).
   */
  graphLayoutOrientation: 'TB' | 'LR' | 'BT' | 'RL';

  // -----------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------

  /**
   * Initializes the extension configuration from the provided VSCode workspace configuration.
   * Loads all relevant settings and applies defaults as needed.
   * @param config The VSCode workspace configuration object.
   */
  constructor(readonly config: WorkspaceConfiguration) {
    this.enable = config.get<boolean>('enable', true);
    this.includedFilePatterns = config.get<string[]>(
      'files.includedFilePatterns',
      DEFAULT_INCLUDE_PATTERNS,
    );
    this.excludedFilePatterns = config.get<string[]>(
      'files.excludedFilePatterns',
      DEFAULT_EXCLUDE_PATTERNS,
    );
    this.includeFilePath = config.get<boolean>(
      'files.includeFilePath',
      IS_INCLUDE_FILE_PATH_DEFAULT,
    );
    this.graphLayoutOrientation = config.get<'TB' | 'LR' | 'BT' | 'RL'>(
      'graph.layoutOrientation',
      LAYOUT_DIRECTION,
    );
  }

  // -----------------------------------------------------------------
  // Methods
  // -----------------------------------------------------------------

  /**
   * Updates the configuration properties from a VSCode workspace configuration.
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
  }
}
