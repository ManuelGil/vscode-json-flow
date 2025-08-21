import { WorkspaceConfiguration } from 'vscode';

import {
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_INCLUDE_PATTERNS,
  DEFAULT_MAX_SEARCH_RECURSION_DEPTH,
  DEFAULT_PRESERVE_GITIGNORE_SETTINGS,
  DEFAULT_SUPPORTS_HIDDEN_FILES,
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
   * Maximum recursion depth for file search (0 = unlimited).
   */
  maxSearchRecursionDepth: number;

  /**
   * Whether to include hidden files in search operations.
   */
  supportsHiddenFiles: boolean;

  /**
   * Whether to respect .gitignore settings during file search.
   */
  preserveGitignoreSettings: boolean;

  /**
   * Whether to show the file path in the search results.
   */
  includeFilePath: boolean;

  /**
   * Orientation of the graph layout in the extension's UI (e.g., for visualizations or previews).
   */
  graphLayoutOrientation: 'TB' | 'LR' | 'BT' | 'RL';

  /**
   * Global throttle window in milliseconds for Live Sync messages (selection and editing).
   */
  liveSyncThrottleMs: number;

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
    this.maxSearchRecursionDepth = config.get<number>(
      'files.maxSearchRecursionDepth',
      DEFAULT_MAX_SEARCH_RECURSION_DEPTH,
    );
    this.supportsHiddenFiles = config.get<boolean>(
      'files.supportsHiddenFiles',
      DEFAULT_SUPPORTS_HIDDEN_FILES,
    );
    this.preserveGitignoreSettings = config.get<boolean>(
      'files.preserveGitignoreSettings',
      DEFAULT_PRESERVE_GITIGNORE_SETTINGS,
    );
    this.includeFilePath = config.get<boolean>(
      'files.includeFilePath',
      IS_INCLUDE_FILE_PATH_DEFAULT,
    );
    this.graphLayoutOrientation = config.get<'TB' | 'LR' | 'BT' | 'RL'>(
      'graph.layoutOrientation',
      LAYOUT_DIRECTION,
    );
    this.liveSyncThrottleMs = config.get<number>('liveSync.throttleMs', 100);
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
    this.maxSearchRecursionDepth = config.get<number>(
      'files.maxSearchRecursionDepth',
      this.maxSearchRecursionDepth,
    );
    this.supportsHiddenFiles = config.get<boolean>(
      'files.supportsHiddenFiles',
      this.supportsHiddenFiles,
    );
    this.preserveGitignoreSettings = config.get<boolean>(
      'files.preserveGitignoreSettings',
      this.preserveGitignoreSettings,
    );
    this.includeFilePath = config.get<boolean>(
      'files.includeFilePath',
      this.includeFilePath,
    );
    this.graphLayoutOrientation = config.get<'TB' | 'LR' | 'BT' | 'RL'>(
      'graph.layoutOrientation',
      this.graphLayoutOrientation,
    );
    this.liveSyncThrottleMs = config.get<number>(
      'liveSync.throttleMs',
      this.liveSyncThrottleMs,
    );
  }
}
