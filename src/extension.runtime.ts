/**
 * ExtensionRuntime encapsulates the core runtime behavior of the VSCode JSON Flow extension.
 * Manages lifecycle, command registration, provider setup, and event listeners.
 *
 * @file extension.runtime.ts
 * @author ManuelGil
 */

import {
  commands,
  ExtensionContext,
  env,
  l10n,
  MessageItem,
  StatusBarAlignment,
  TextEditorSelectionChangeKind,
  Uri,
  ViewColumn,
  WebviewPanel,
  WorkspaceFolder,
  window,
  workspace,
} from 'vscode';
import { VSCodeMarketplaceClient } from 'vscode-marketplace-client';

import {
  CommandIds,
  ContextKeys,
  EXTENSION_DISPLAY_NAME,
  EXTENSION_ID,
  EXTENSION_NAME,
  EXTENSION_REPOSITORY_URL,
  EXTENSION_USER_PUBLISHER,
  ExtensionConfig,
  ViewIds,
} from './app/configs';
import {
  FeedbackController,
  FilesController,
  JsonController,
  TransformController,
} from './app/controllers';
import {
  clearCache,
  type FileType,
  getSelectionMapper,
  isEditCapableFileType,
  isFileTypeSupported,
  logger,
  parseJsonContent,
} from './app/helpers';
import { NodeModel } from './app/models';
import { FeedbackProvider, FilesProvider, JSONProvider } from './app/providers';

/**
 * Supported target languages for type conversion.
 */
const TARGET_LANGUAGES = [
  'cpp',
  'csharp',
  'dart',
  'elm',
  'flow',
  'go',
  'haskell',
  'java',
  'javascript',
  'json-schema',
  'kotlin',
  'objective-c',
  'php',
  'pike',
  'prop-types',
  'python',
  'ruby',
  'rust',
  'scala',
  'swift',
  'typescript',
];

/**
 * Core runtime for the JSON Flow extension.
 *
 * Orchestrates extension lifecycle, workspace selection, configuration management,
 * command registration, and Live Sync state. Designed to be instantiated once
 * per activation and disposed on deactivation.
 */
export class ExtensionRuntime {
  /** Prevents repeated disabled notifications during the same runtime session. */
  private warningShown: boolean = false;
  private config!: ExtensionConfig;
  private resource: WorkspaceFolder | undefined;

  private readonly providers: Array<{ refresh: () => void }> = [];
  private jsonController!: JsonController;

  // Live Sync state
  private selectionThrottleMs: number = 300;
  private lastSentNodeId: string | undefined;
  private scheduledNodeId: string | undefined;
  private selectionThrottleTimer: NodeJS.Timeout | undefined;
  private lastSentAt: number = 0;

  constructor(private readonly context: ExtensionContext) {}

  /**
   * Initializes the extension runtime.
   *
   * Separates workspace-independent and workspace-dependent initialization.
   *
   * @returns true if extension is enabled and ready, false if disabled
   */
  async initialize(): Promise<boolean> {
    // Workspace-independent initialization
    this.config = new ExtensionConfig(workspace.getConfiguration(EXTENSION_ID));

    await commands.executeCommand(
      'setContext',
      `${EXTENSION_ID}.${ContextKeys.IsSplitView}`,
      false,
    );
    await commands.executeCommand(
      'setContext',
      `${EXTENSION_ID}.${ContextKeys.LiveSyncEnabled}`,
      false,
    );

    this.selectionThrottleMs = this.config.liveSyncThrottleMs;

    // Workspace-dependent initialization
    this.resource = await this.selectWorkspaceFolder();

    if (this.resource) {
      const workspaceConfig = workspace.getConfiguration(
        EXTENSION_ID,
        this.resource.uri,
      );
      this.config.update(workspaceConfig);
      this.initializeWorkspaceConfiguration(this.resource);
    }

    if (!this.isExtensionEnabled()) {
      return false;
    }

    await this.handleVersionNotifications();

    return true;
  }

  /**
   * Starts the extension by registering all commands, providers, and listeners.
   */
  start(): void {
    // Register workspace switch command
    const disposableChangeWorkspace = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.ChangeWorkspace}`,
      async () => {
        if (
          !workspace.workspaceFolders ||
          workspace.workspaceFolders.length === 0
        ) {
          window.showWarningMessage(
            l10n.t('No workspace folders are currently open'),
          );
          return;
        }

        const placeHolder = l10n.t('Select a workspace folder to use');
        const selectedFolder = await window.showWorkspaceFolderPick({
          placeHolder,
        });

        if (!selectedFolder) {
          return;
        }

        this.resource = selectedFolder;

        await this.context.globalState.update(
          'selectedWorkspaceFolder',
          this.resource.uri.toString(),
        );

        const workspaceConfig = workspace.getConfiguration(
          EXTENSION_ID,
          this.resource.uri,
        );

        this.config.update(workspaceConfig);

        window.showInformationMessage(
          l10n.t('Switched to workspace folder: {0}', this.resource.name),
        );
      },
    );

    this.context.subscriptions.push(disposableChangeWorkspace);

    // Register workspace-independent controllers and providers
    this.registerJsonController();
    this.registerViewCommands();
    this.registerTransformController();
    this.registerFeedbackProvider();
    this.registerJSONProvider();

    // Register workspace-dependent controllers and providers
    this.registerFilesController();
    this.registerFilesProvider();

    // Register listeners after providers are ready
    this.registerLiveSyncListeners();

    // Register filesystem watcher only when file patterns are configured
    if (this.config.includedFilePatterns?.length) {
      this.registerFilesystemWatcher();
    }
  }
  /**
   * Handles version tracking and displays appropriate notifications
   * for first-time activation or version updates.
   */
  async handleVersionNotifications(): Promise<void> {
    const previousVersion = this.context.globalState.get<string>('version');
    const packageJSON = this.context.extension.packageJSON;
    const currentVersion =
      typeof packageJSON?.version === 'string' ? packageJSON.version : '0.0.0';

    if (!previousVersion) {
      window.showInformationMessage(
        l10n.t(
          'Welcome to {0} version {1}! The extension is now active',
          EXTENSION_DISPLAY_NAME,
          currentVersion,
        ),
      );
      this.context.globalState.update('version', currentVersion);
    } else if (previousVersion !== currentVersion) {
      const releaseNotesItem: MessageItem = { title: l10n.t('Release Notes') };
      const dismissItem: MessageItem = { title: l10n.t('Dismiss') };

      const message = l10n.t(
        "The {0} extension has been updated. Check out what's new in version {1}",
        EXTENSION_DISPLAY_NAME,
        currentVersion,
      );

      const option = await window.showInformationMessage(
        message,
        releaseNotesItem,
        dismissItem,
      );

      if (option === releaseNotesItem) {
        const changelogUrl = `${EXTENSION_REPOSITORY_URL}/blob/main/CHANGELOG.md`;
        env.openExternal(Uri.parse(changelogUrl));
      }

      this.context.globalState.update('version', currentVersion);
    }

    try {
      const latestVersion = await VSCodeMarketplaceClient.getLatestVersion(
        EXTENSION_USER_PUBLISHER,
        EXTENSION_NAME,
      );

      if (latestVersion > currentVersion) {
        const updateNowItem: MessageItem = { title: l10n.t('Update Now') };
        const dismissItem: MessageItem = { title: l10n.t('Dismiss') };

        const message = l10n.t(
          'A new version of {0} is available. Update to version {1} now',
          EXTENSION_DISPLAY_NAME,
          latestVersion,
        );

        const option = await window.showInformationMessage(
          message,
          updateNowItem,
          dismissItem,
        );

        if (option === updateNowItem) {
          env.openExternal(
            Uri.parse(
              `https://marketplace.visualstudio.com/items?itemName=${EXTENSION_USER_PUBLISHER}.${EXTENSION_NAME}`,
            ),
          );
        }
      }
    } catch (error: unknown) {
      // Log detailed error for diagnostics
      logger.error('Failed to check for extension updates', error, {
        extensionId: EXTENSION_ID,
        publisher: EXTENSION_USER_PUBLISHER,
      });

      // Show user-friendly message
      window.showErrorMessage(
        l10n.t('Failed to check for new version of the extension'),
      );
    }
  }

  /**
   * Prompts the user to select a workspace folder if multiple are open.
   * If only one workspace folder is open, it is returned automatically.
   *
   * @returns The selected WorkspaceFolder or undefined if no valid selection was made
   */
  private async selectWorkspaceFolder(): Promise<WorkspaceFolder | undefined> {
    const folders = workspace.workspaceFolders;

    if (!folders?.length) {
      return undefined;
    }

    if (folders.length === 1) {
      return folders[0];
    }

    const previousFolderUri = this.context.globalState.get<string>(
      'selectedWorkspaceFolder',
    );

    const previousFolder = previousFolderUri
      ? folders.find((folder) => folder.uri.toString() === previousFolderUri)
      : undefined;

    if (previousFolder) {
      window.showInformationMessage(
        l10n.t('Using workspace folder: {0}', previousFolder.name),
      );
      return previousFolder;
    }

    const selectedFolder = await window.showWorkspaceFolderPick({
      placeHolder: l10n.t(
        '{0}: Select a workspace folder to use. This folder will be used to load workspace-specific configuration for the extension',
        EXTENSION_DISPLAY_NAME,
      ),
    });

    if (!selectedFolder) {
      return undefined;
    }

    this.context.globalState.update(
      'selectedWorkspaceFolder',
      selectedFolder.uri.toString(),
    );

    return selectedFolder;
  }

  /**
   * Initializes the workspace-dependent configuration listener.
   *
   * @param workspaceFolder - The workspace folder for which to listen to configuration changes
   */
  private initializeWorkspaceConfiguration(
    workspaceFolder: WorkspaceFolder,
  ): void {
    const disposable = workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration(EXTENSION_ID, workspaceFolder.uri)) {
        return;
      }

      const workspaceConfig = workspace.getConfiguration(
        EXTENSION_ID,
        workspaceFolder.uri,
      );

      // Only notify when enable flag changes
      if (
        event.affectsConfiguration(
          `${EXTENSION_ID}.enable`,
          workspaceFolder.uri,
        )
      ) {
        const isEnabled = workspaceConfig.get<boolean>('enable');

        window.showInformationMessage(
          isEnabled
            ? l10n.t(
                'The {0} extension is now enabled and ready to use',
                EXTENSION_DISPLAY_NAME,
              )
            : l10n.t(
                'The {0} extension is now disabled',
                EXTENSION_DISPLAY_NAME,
              ),
        );
      }

      // Avoid unnecessary updates if nothing changed
      this.config.update(workspaceConfig);
      this.selectionThrottleMs = this.config.liveSyncThrottleMs;
    });

    this.context.subscriptions.push(disposable);
  }

  /**
   * Checks if the extension is enabled based on the current configuration.
   * If disabled, shows a warning message to the user (only once).
   *
   * @returns true if the extension is enabled, false otherwise
   */
  private isExtensionEnabled(): boolean {
    const isEnabled = Boolean(this.config?.enable);

    if (isEnabled) {
      this.warningShown = false;
      return true;
    }

    if (!this.warningShown) {
      window.showWarningMessage(
        l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          EXTENSION_DISPLAY_NAME,
        ),
      );
      this.warningShown = true;
    }

    return false;
  }

  /**
   * Registers file-related commands (open, copy, properties).
   * These commands require an active workspace.
   */
  private registerFilesController(): void {
    const filesController = new FilesController(this.config);

    const fileCommands = [
      {
        id: CommandIds.FilesOpenFile,
        handler: (uri: NodeModel) => filesController.openFile(uri),
      },
      {
        id: CommandIds.FilesCopyContent,
        handler: (uri: NodeModel) => filesController.copyContent(uri),
      },
      {
        id: CommandIds.FilesCopyContentAsJson,
        handler: (uri: NodeModel) => filesController.copyContentAsJson(uri),
      },
      {
        id: CommandIds.FilesCopyContentPartialAsJson,
        handler: () => filesController.copyContentPartialAsJson(),
      },
      {
        id: CommandIds.FilesGetFileProperties,
        handler: (uri: NodeModel) => filesController.getFileProperties(uri),
      },
    ];

    fileCommands.forEach(({ id, handler }) => {
      const disposable = commands.registerCommand(
        `${EXTENSION_ID}.${id}`,
        (arg?: unknown) => {
          if (!this.resource) {
            window.showWarningMessage(
              l10n.t('This command requires an open workspace'),
            );
            return;
          }

          if (this.isExtensionEnabled()) {
            handler(arg as NodeModel);
          }
        },
      );
      this.context.subscriptions.push(disposable);
    });
  }

  /**
   * Registers JSON preview and data fetch commands.
   * These commands are workspace-independent.
   */
  private registerJsonController(): void {
    this.jsonController = new JsonController(this.context, this.config);
    JSONProvider.setNodeEditIntentHandler((intent) =>
      this.jsonController.handleNodeEditIntent(intent),
    );

    const jsonCommands = [
      {
        id: CommandIds.JsonShowPreview,
        handler: (uri: Uri) => this.jsonController.showPreview(uri),
      },
      {
        id: CommandIds.JsonShowPartialPreview,
        handler: () => this.jsonController.showPartialPreview(),
      },
      {
        id: CommandIds.JsonFetchJsonData,
        handler: () => this.jsonController.fetchJsonData(),
      },
    ];

    jsonCommands.forEach(({ id, handler }) => {
      const disposable = commands.registerCommand(
        `${EXTENSION_ID}.${id}`,
        async (arg?: unknown) => {
          if (this.isExtensionEnabled()) {
            await handler(arg as Uri);
          }
        },
      );
      this.context.subscriptions.push(disposable);
    });
  }

  /**
   * Registers view-related commands (split view, Live Sync) and status bar items.
   * Status bar items dynamically reflect JSONProvider state and provide quick toggles.
   * These commands are workspace-independent.
   */
  private registerViewCommands(): void {
    const enableSplitView = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.ViewEnableSplitView}`,
      () => {
        if (!this.isExtensionEnabled()) {
          return;
        }

        const editor = window.activeTextEditor;
        if (!editor) {
          window.showErrorMessage(
            l10n.t('No active editor. Open a file to use this command'),
          );
          return;
        }

        this.jsonController.showPreview(editor.document.uri, ViewColumn.Beside);
      },
    );

    const disableSplitView = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.ViewDisableSplitView}`,
      () => {
        if (!this.isExtensionEnabled()) {
          return;
        }

        if (JSONProvider.currentProvider) {
          try {
            JSONProvider.currentProvider.dispose();
          } catch (error: unknown) {
            logger.error('Failed to dispose JSONProvider', error);
          }
        }
      },
    );

    const enableLiveSync = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.ViewEnableLiveSync}`,
      () => {
        if (this.isExtensionEnabled()) {
          JSONProvider.setLiveSyncEnabled(true);
        }
      },
    );

    const disableLiveSync = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.ViewDisableLiveSync}`,
      () => {
        if (this.isExtensionEnabled()) {
          JSONProvider.setLiveSyncEnabled(false);
        }
      },
    );

    this.context.subscriptions.push(
      enableSplitView,
      disableSplitView,
      enableLiveSync,
      disableLiveSync,
    );

    const splitStatusItem = window.createStatusBarItem(
      StatusBarAlignment.Right,
      100,
    );
    const liveStatusItem = window.createStatusBarItem(
      StatusBarAlignment.Right,
      99,
    );

    const updateStatusBar = () => {
      try {
        const isSplit = JSONProvider.isSplitView;
        const liveEnabled = JSONProvider.liveSyncEnabled;

        // Update split view status button
        if (isSplit) {
          splitStatusItem.text = l10n.t('{0}: Close', EXTENSION_DISPLAY_NAME);
          splitStatusItem.tooltip = l10n.t('Close JSON Flow');
          splitStatusItem.command = `${EXTENSION_ID}.${CommandIds.ViewDisableSplitView}`;
        } else {
          splitStatusItem.text = l10n.t('{0}: Open', EXTENSION_DISPLAY_NAME);
          splitStatusItem.tooltip = l10n.t('Open JSON Flow beside');
          splitStatusItem.command = `${EXTENSION_ID}.${CommandIds.ViewEnableSplitView}`;
        }

        splitStatusItem.show();

        // Update Live Sync status only when split view is active
        if (isSplit) {
          if (liveEnabled) {
            liveStatusItem.text = l10n.t('Live Sync: On');
            liveStatusItem.tooltip = l10n.t('Disable Live Sync');
            liveStatusItem.command = `${EXTENSION_ID}.${CommandIds.ViewDisableLiveSync}`;
          } else {
            liveStatusItem.text = l10n.t('Live Sync: Off');
            liveStatusItem.tooltip = l10n.t('Enable Live Sync');
            liveStatusItem.command = `${EXTENSION_ID}.${CommandIds.ViewEnableLiveSync}`;
          }

          liveStatusItem.show();
        } else {
          liveStatusItem.hide();
        }
      } catch (error: unknown) {
        // Use centralized logger instead of console
        logger.error('Error updating status bar', error);
      }
    };

    const stateListener = JSONProvider.onStateChanged(() => {
      updateStatusBar();
    });

    updateStatusBar();

    this.context.subscriptions.push(
      splitStatusItem,
      liveStatusItem,
      stateListener,
    );
  }

  /**
   * Registers transformation commands (convert to JSON, convert to type).
   * These commands are workspace-independent.
   */
  private registerTransformController(): void {
    const transformController = new TransformController();

    const convertToJson = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.FilesConvertToJson}`,
      (uri) => {
        if (this.isExtensionEnabled()) {
          transformController.convertToJson(uri);
        }
      },
    );

    const convertPartialToJson = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.FilesConvertPartialToJson}`,
      () => {
        if (this.isExtensionEnabled()) {
          transformController.convertPartialToJson();
        }
      },
    );

    const convertToType = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.FilesConvertToType}`,
      async (uri) => {
        if (!this.isExtensionEnabled()) {
          return;
        }

        const targetLanguage = await window.showQuickPick(TARGET_LANGUAGES, {
          placeHolder: l10n.t('Select the target language'),
        });
        if (targetLanguage) {
          transformController.convertFileToType(uri, targetLanguage);
        }
      },
    );

    const convertPartialToType = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.FilesConvertPartialToType}`,
      async () => {
        if (!this.isExtensionEnabled()) {
          return;
        }

        const targetLanguage = await window.showQuickPick(TARGET_LANGUAGES, {
          placeHolder: l10n.t('Select the target language'),
        });
        if (targetLanguage) {
          transformController.convertPartialToType(targetLanguage);
        }
      },
    );

    this.context.subscriptions.push(
      convertToJson,
      convertPartialToJson,
      convertToType,
      convertPartialToType,
    );
  }

  /**
   * Registers the feedback tree view and related commands.
   * These commands are workspace-independent.
   */
  private registerFeedbackProvider(): void {
    const feedbackProvider = new FeedbackProvider(new FeedbackController());

    const feedbackTreeView = window.createTreeView(
      `${EXTENSION_ID}.${ViewIds.FeedbackView}`,
      {
        treeDataProvider: feedbackProvider,
      },
    );

    const feedbackCommands = [
      {
        id: CommandIds.FeedbackAboutUs,
        handler: () => feedbackProvider.controller.aboutUs(),
      },
      {
        id: CommandIds.FeedbackReportIssues,
        handler: () => feedbackProvider.controller.reportIssues(),
      },
      {
        id: CommandIds.FeedbackRateUs,
        handler: () => feedbackProvider.controller.rateUs(),
      },
    ];

    feedbackCommands.forEach(({ id, handler }) => {
      const disposable = commands.registerCommand(
        `${EXTENSION_ID}.${id}`,
        () => {
          if (this.isExtensionEnabled()) {
            handler();
          }
        },
      );

      this.context.subscriptions.push(disposable);
    });

    this.context.subscriptions.push(feedbackProvider, feedbackTreeView);
  }

  /**
   * Registers the files tree view and refresh command.
   * Automatically refreshes the tree view on document save.
   * This functionality requires an active workspace.
   */
  private registerFilesProvider(): void {
    const filesController = new FilesController(this.config);
    const filesProvider = new FilesProvider(filesController);

    const filesTreeView = window.createTreeView(
      `${EXTENSION_ID}.${ViewIds.FilesView}`,
      {
        treeDataProvider: filesProvider,
        showCollapseAll: true,
      },
    );

    const refreshDisposable = commands.registerCommand(
      `${EXTENSION_ID}.${CommandIds.FilesRefreshList}`,
      () => {
        if (!this.resource) {
          window.showWarningMessage(
            l10n.t('This command requires an open workspace'),
          );
          return;
        }

        if (this.isExtensionEnabled()) {
          filesProvider.refresh();
        }
      },
    );

    this.providers.push(filesProvider);

    this.context.subscriptions.push(
      filesProvider,
      filesTreeView,
      refreshDisposable,
    );
  }

  /**
   * Registers a filesystem watcher that invalidates the discovery cache
   * when relevant files are created or deleted.
   *
   * @memberof ExtensionRuntime
   *
   * @example
   * ```typescript
   * this.registerFilesystemWatcher();
   * ```
   */
  private registerFilesystemWatcher(): void {
    const extensions = this.config.includedFilePatterns;

    if (!extensions?.length) {
      return;
    }

    const globPattern = `**/*.{${extensions.join(',')}}`;
    const watcher = workspace.createFileSystemWatcher(globPattern);

    // Shared handler to reduce duplication
    const handleResourceCheck = () => {
      if (!this.resource) {
        return;
      }

      clearCache();
    };

    watcher.onDidCreate(handleResourceCheck);
    watcher.onDidDelete(handleResourceCheck);
    watcher.onDidChange(handleResourceCheck);

    const saveDisposable = workspace.onDidSaveTextDocument((document) => {
      if (!this.resource) {
        return;
      }

      const fileName = document.fileName;

      // Faster than some() for small arrays (micro-opt)
      for (const ext of extensions) {
        if (fileName.endsWith(`.${ext}`)) {
          this.providers.forEach((provider) => provider.refresh());
          break;
        }
      }
    });

    const changeDisposable = workspace.onDidChangeTextDocument((event) => {
      const document = event.document;
      const fileName = document.fileName;

      // Only refresh if it's one of the watched extensions and matches the currently previewed path
      if (JSONProvider.previewedPath === document.uri.fsPath) {
        for (const ext of extensions) {
          if (fileName.endsWith(`.${ext}`)) {
            void (async () => {
              const { graphLayoutOrientation } = this.config;
              const { languageId } = document;

              let fileType = languageId;
              if (!isFileTypeSupported(fileType)) {
                const baseName = fileName.split(/[\\\/]/).pop() ?? fileName;
                if (/^\.env(\..*)?$/i.test(baseName)) {
                  fileType = 'env';
                } else {
                  const fileExtension = fileName.split('.').pop();
                  fileType = isFileTypeSupported(fileExtension)
                    ? fileExtension
                    : 'json';
                }
              }

              const result = parseJsonContent(
                document.getText(),
                fileType as FileType,
              );

              const fileTypeFromResult = (
                result as { fileType?: string } | undefined
              )?.fileType;
              fileType = (fileTypeFromResult ?? 'json').toLowerCase().trim();

              const parsedJsonData = result;

              if (parsedJsonData === undefined) {
                return;
              }

              JSONProvider.postMessageToWebview({
                command: 'update',
                data: parsedJsonData,
                orientation: graphLayoutOrientation,
                path: document.uri.fsPath,
                fileName,
                metadata: {
                  languageId,
                  canEdit: isEditCapableFileType(fileType),
                },
              });
            })();
            break;
          }
        }
      }
    });

    this.context.subscriptions.push(watcher, saveDisposable, changeDisposable);
  }

  /**
   * Registers Live Sync listeners for editor selection changes.
   *
   * Throttles selection events to avoid overwhelming the webview with updates.
   * Only processes selections when Live Sync is enabled and a supported file is active.
   * This is workspace-independent.
   */
  private registerLiveSyncListeners(): void {
    const SupportedLiveSyncTypes = new Set([
      'json',
      'jsonc',
      'json5',
      'yaml',
      'yml',
    ]);

    const isLiveSyncSupported = (fileType: string): boolean =>
      SupportedLiveSyncTypes.has(fileType);

    // Cache last document text to avoid repeated full reads
    let lastDocUri: string | undefined;
    let lastDocText: string | undefined;

    const scheduleSendSelection = (nodeId?: string) => {
      this.scheduledNodeId = nodeId;

      if (this.selectionThrottleTimer) {
        return;
      }

      const now = Date.now();
      const delay = Math.max(
        this.selectionThrottleMs - (now - this.lastSentAt),
        0,
      );

      this.selectionThrottleTimer = setTimeout(() => {
        this.selectionThrottleTimer = undefined;

        const toSend = this.scheduledNodeId;
        this.scheduledNodeId = undefined;

        if (toSend === this.lastSentNodeId) {
          return;
        }

        JSONProvider.applyGraphSelection(toSend);
        this.lastSentNodeId = toSend;
        this.lastSentAt = Date.now();
      }, delay);
    };

    const selectionListener = window.onDidChangeTextEditorSelection((event) => {
      if (
        !JSONProvider.liveSyncEnabled ||
        !JSONProvider.currentProvider ||
        JSONProvider.suppressEditorSelectionEvent
      ) {
        return;
      }

      const editor = event.textEditor;
      const doc = editor?.document;
      if (!editor || !doc) {
        return;
      }

      const previewPath = JSONProvider.previewedPath;
      if (!previewPath || doc.uri.fsPath !== previewPath) {
        return;
      }

      if (event.kind && event.kind !== TextEditorSelectionChangeKind.Mouse) {
        return;
      }

      const { languageId, fileName } = doc;

      let fileType: string = languageId;

      if (!isFileTypeSupported(fileType)) {
        const baseName = fileName.split(/[\/\\]/).pop() ?? fileName;

        if (/^\.env(\..*)?$/i.test(baseName)) {
          fileType = 'env';
        } else {
          const fileExtension = fileName.split('.').pop() ?? '';
          fileType = isFileTypeSupported(fileExtension)
            ? fileExtension
            : 'json';
        }
      }

      if (!isLiveSyncSupported(fileType)) {
        return;
      }

      const mapper = getSelectionMapper(languageId, fileName);

      if (!mapper) {
        JSONProvider.setLiveSyncPaused(
          true,
          l10n.t('Unsupported file type for Live Sync selection mapping'),
        );
        return;
      }

      const sel = event.selections?.[0];
      if (!sel) {
        return;
      }

      const offset = doc.offsetAt(sel.active);

      // Avoid calling getText() repeatedly for the same document
      if (lastDocUri !== doc.uri.toString()) {
        lastDocUri = doc.uri.toString();
        lastDocText = doc.getText();
      }

      let nodeId: string | undefined;

      try {
        nodeId = mapper.nodeIdFromOffset(lastDocText ?? '', offset);
      } catch {
        JSONProvider.setLiveSyncPaused(
          true,
          l10n.t('Live Sync selection mapping failed'),
        );
        return;
      }

      if (JSONProvider.liveSyncPaused) {
        if (typeof nodeId === 'string' && nodeId.length > 0) {
          JSONProvider.setLiveSyncPaused(false);
        } else {
          return;
        }
      }

      scheduleSendSelection(nodeId);
    });

    this.context.subscriptions.push(selectionListener);
  }

  /**
   * Registers the webview panel serializer for JSONProvider.
   * Enables webview state restoration after VSCode restart or reload.
   * Workspace-independent.
   */
  private registerJSONProvider(): void {
    if (window.registerWebviewPanelSerializer) {
      const disposableSerializer = window.registerWebviewPanelSerializer(
        JSONProvider.viewType,
        {
          async deserializeWebviewPanel(webviewPanel: WebviewPanel) {
            webviewPanel.webview.options = JSONProvider.getWebviewOptions(
              this.context.extensionUri,
            );
            JSONProvider.revive(webviewPanel, this.context.extensionUri);
          },
        },
      );

      this.context.subscriptions.push(disposableSerializer);
    }
  }
}
