/**
 * Main entry point for the Angular VSCode extension.
 * Handles activation, command registration, provider setup, and resource cleanup.
 * All logic is modular and follows Angular/TypeScript best practices.
 *
 * @file extension.ts
 * @author ManuelGil
 * @see https://code.visualstudio.com/api
 */

/**
 * Main entry point for the VSCode JSON Flow extension.
 * Handles activation, command registration, and extension lifecycle management.
 */
import * as vscode from 'vscode';
import { VSCodeMarketplaceClient } from 'vscode-marketplace-client';

// Import the Configs, Controllers, and Providers
import {
  EXTENSION_DISPLAY_NAME,
  EXTENSION_ID,
  EXTENSION_NAME,
  EXTENSION_USER_PUBLISHER,
  ExtensionConfig,
} from './app/configs';
import {
  FeedbackController,
  FilesController,
  JsonController,
  TransformController,
} from './app/controllers';
import { FeedbackProvider, FilesProvider, JSONProvider } from './app/providers';

/**
 * Called when the VSCode JSON Flow extension is activated for the first time.
 * Responsible for registering all commands, providers, and event listeners needed for the extension's functionality.
 * Handles setup and initialization of extension resources.
 * @param context The VSCode extension context object.
 */
export async function activate(context: vscode.ExtensionContext) {
  // The code you place here will be executed every time your command is executed
  let resource: vscode.WorkspaceFolder | undefined;

  // Initialize contexts for menus/keybindings
  await vscode.commands.executeCommand(
    'setContext',
    'jsonFlow.splitView',
    JSONProvider.isSplitView,
  );
  await vscode.commands.executeCommand(
    'setContext',
    'jsonFlow.liveSyncEnabled',
    JSONProvider.liveSyncEnabled,
  );

  // Check if there are workspace folders
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    const message = vscode.l10n.t(
      'No workspace folders are open. Please open a workspace folder to use this extension',
    );
    vscode.window.showErrorMessage(message);
    return;
  }

  // Try to load previously selected workspace folder from global state
  const previousFolderUri = context.globalState.get<string>(
    'selectedWorkspaceFolder',
  );
  let previousFolder: vscode.WorkspaceFolder | undefined;

  if (previousFolderUri) {
    // Find the workspace folder by URI
    previousFolder = vscode.workspace.workspaceFolders.find(
      (folder) => folder.uri.toString() === previousFolderUri,
    );
  }

  if (vscode.workspace.workspaceFolders.length === 1) {
    // Determine the workspace folder to use
    // Only one workspace folder available
    resource = vscode.workspace.workspaceFolders[0];
  } else if (previousFolder) {
    // Use previously selected workspace folder if available
    resource = previousFolder;

    // Notify the user which workspace is being used
    vscode.window.showInformationMessage(
      vscode.l10n.t('Using workspace folder: {0}', [resource.name]),
    );
  } else {
    // Multiple workspace folders and no previous selection
    const placeHolder = vscode.l10n.t(
      'Select a workspace folder to use. This folder will be used to load workspace-specific configuration for the extension',
    );
    const selectedFolder = await vscode.window.showWorkspaceFolderPick({
      placeHolder,
    });

    resource = selectedFolder;

    // Remember the selection for future use
    if (resource) {
      context.globalState.update(
        'selectedWorkspaceFolder',
        resource.uri.toString(),
      );
    }
  }

  // -----------------------------------------------------------------
  // Initialize the extension
  // -----------------------------------------------------------------

  // Get the configuration for the extension
  const config = new ExtensionConfig(
    vscode.workspace.getConfiguration(EXTENSION_ID, resource?.uri),
  );

  // Ensure split view context is initialized
  vscode.commands.executeCommand('setContext', 'jsonFlow.splitView', false);
  // Ensure Live Sync context is initialized
  vscode.commands.executeCommand(
    'setContext',
    'jsonFlow.liveSyncEnabled',
    false,
  );

  // Watch for changes in the configuration
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      const workspaceConfig = vscode.workspace.getConfiguration(
        EXTENSION_ID,
        resource?.uri,
      );

      if (event.affectsConfiguration(`${EXTENSION_ID}.enable`, resource?.uri)) {
        const isEnabled = workspaceConfig.get<boolean>('enable');

        config.update(workspaceConfig);

        if (isEnabled) {
          const message = vscode.l10n.t(
            'The {0} extension is now enabled and ready to use',
            [EXTENSION_DISPLAY_NAME],
          );
          vscode.window.showInformationMessage(message);
        } else {
          const message = vscode.l10n.t('The {0} extension is now disabled', [
            EXTENSION_DISPLAY_NAME,
          ]);
          vscode.window.showInformationMessage(message);
        }
      }

      if (event.affectsConfiguration(EXTENSION_ID, resource?.uri)) {
        config.update(workspaceConfig);
      }
    },
  );
  context.subscriptions.push(configChangeDisposable);

  // -----------------------------------------------------------------
  // Get version of the extension
  // -----------------------------------------------------------------

  // Get the previous version of the extension
  const previousVersion = context.globalState.get('version');
  // Get the current version of the extension
  const currentVersion = context.extension.packageJSON.version;

  // Check if the extension is running for the first time
  if (!previousVersion) {
    const message = vscode.l10n.t(
      'Welcome to {0} version {1}! The extension is now active',
      [EXTENSION_DISPLAY_NAME, currentVersion],
    );
    vscode.window.showInformationMessage(message);

    // Update the version in the global state
    context.globalState.update('version', currentVersion);
  }

  // Check if the extension has been updated
  if (previousVersion && previousVersion !== currentVersion) {
    const actions: vscode.MessageItem[] = [
      {
        title: vscode.l10n.t('Release Notes'),
      },
      {
        title: vscode.l10n.t('Dismiss'),
      },
    ];

    const message = vscode.l10n.t(
      "The {0} extension has been updated. Check out what's new in version {1}",
      [EXTENSION_DISPLAY_NAME, currentVersion],
    );
    vscode.window.showInformationMessage(message, ...actions).then((option) => {
      if (!option) {
        return;
      }

      // Handle the actions
      switch (option?.title) {
        case actions[0].title:
          vscode.env.openExternal(
            vscode.Uri.parse(
              `https://marketplace.visualstudio.com/items/${EXTENSION_USER_PUBLISHER}.${EXTENSION_NAME}/changelog`,
            ),
          );
          break;

        default:
          break;
      }
    });

    // Update the version in the global state
    context.globalState.update('version', currentVersion);
  }

  // -----------------------------------------------------------------
  // Check for updates
  // -----------------------------------------------------------------

  // Check for updates to the extension
  try {
    // Retrieve the latest version
    VSCodeMarketplaceClient.getLatestVersion(
      EXTENSION_USER_PUBLISHER,
      EXTENSION_NAME,
    )
      .then((latestVersion: string) => {
        // Check if the latest version is different from the current version
        if (latestVersion > currentVersion) {
          const actions: vscode.MessageItem[] = [
            {
              title: vscode.l10n.t('Update Now'),
            },
            {
              title: vscode.l10n.t('Dismiss'),
            },
          ];

          const message = vscode.l10n.t(
            'A new version of {0} is available. Update to version {1} now',
            [EXTENSION_DISPLAY_NAME, latestVersion],
          );
          vscode.window
            .showInformationMessage(message, ...actions)
            .then((option) => {
              if (!option) {
                return;
              }

              // Handle the actions
              switch (option?.title) {
                case actions[0].title:
                  vscode.env.openExternal(
                    vscode.Uri.parse(
                      `https://marketplace.visualstudio.com/items?itemName=${EXTENSION_USER_PUBLISHER}.${EXTENSION_NAME}`,
                    ),
                  );
                  break;
              }
            });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          console.error('Error checking for updates:', error.message);
        } else {
          console.error(
            'An unknown error occurred while checking for updates:',
            error,
          );
        }
        const message = vscode.l10n.t("We couldn't check for updates");
        vscode.window.showErrorMessage(message);
      });
  } catch (error: unknown) {
    // Only log fatal errors that occur during the update check process
    console.error('Fatal error while checking for extension updates:', error);
  }

  // -----------------------------------------------------------------
  // Register commands
  // -----------------------------------------------------------------

  // Register a command to change the selected workspace folder
  const disposableChangeWorkspace = vscode.commands.registerCommand(
    `${EXTENSION_ID}.changeWorkspace`,
    async () => {
      const placeHolder = vscode.l10n.t('Select a workspace folder to use');
      const selectedFolder = await vscode.window.showWorkspaceFolderPick({
        placeHolder,
      });

      if (selectedFolder) {
        resource = selectedFolder;
        context.globalState.update(
          'selectedWorkspaceFolder',
          resource.uri.toString(),
        );

        // Update configuration for the new workspace folder
        const workspaceConfig = vscode.workspace.getConfiguration(
          EXTENSION_ID,
          resource?.uri,
        );
        config.update(workspaceConfig);

        vscode.window.showInformationMessage(
          vscode.l10n.t('Switched to workspace folder: {0}', [resource.name]),
        );
      }
    },
  );

  context.subscriptions.push(disposableChangeWorkspace);

  // -----------------------------------------------------------------
  // Register FilesController
  // -----------------------------------------------------------------

  // Create a new FilesController
  const filesController = new FilesController(config);

  const disposableOpenFile = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.openFile`,
    (uri) => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      filesController.openFile(uri);
    },
  );

  const disponsableCopyContent = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.copyContent`,
    (uri) => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      filesController.copyContent(uri);
    },
  );

  const disponsableCopyContentAsJson = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.copyContentAsJson`,
    (uri) => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      filesController.copyContentAsJson(uri);
    },
  );

  const disponsableCopyContentPartialAsJson = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.copyContentPartialAsJson`,
    () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      filesController.copyContentPartialAsJson();
    },
  );

  const disposableGetFileProperties = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.getFileProperties`,
    (uri) => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      filesController.getFileProperties(uri);
    },
  );

  context.subscriptions.push(
    disposableOpenFile,
    disponsableCopyContent,
    disponsableCopyContentAsJson,
    disponsableCopyContentPartialAsJson,
    disposableGetFileProperties,
  );

  // -----------------------------------------------------------------
  // Register JSON commands
  // -----------------------------------------------------------------

  // Create a new JsonController
  const jsonController = new JsonController(context, config);

  // Register the command to open the JSON Flow
  const disposableShowPreview = vscode.commands.registerCommand(
    `${EXTENSION_ID}.json.showPreview`,
    (uri) => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      jsonController.showPreview(uri);
    },
  );

  // Register the command to show the JSON Flow for the selected part
  const disposableShowPartialPreview = vscode.commands.registerCommand(
    `${EXTENSION_ID}.json.showPartialPreview`,
    () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      jsonController.showPartialPreview();
    },
  );

  // Register the command to fetch JSON data from a URL
  const disposableFetchJsonData = vscode.commands.registerCommand(
    `${EXTENSION_ID}.json.fetchJsonData`,
    async () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      jsonController.fetchJsonData();
    },
  );

  context.subscriptions.push(
    disposableShowPreview,
    disposableShowPartialPreview,
    disposableFetchJsonData,
  );

  // -----------------------------------------------------------------
  // Register View (Split) commands
  // -----------------------------------------------------------------

  const disposableEnableSplitView = vscode.commands.registerCommand(
    `${EXTENSION_ID}.view.enableSplitView`,
    () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage(
          vscode.l10n.t('No active editor. Open a file to use this command'),
        );
        return;
      }

      jsonController.showPreview(editor.document.uri, vscode.ViewColumn.Beside);
    },
  );

  const disposableDisableSplitView = vscode.commands.registerCommand(
    `${EXTENSION_ID}.view.disableSplitView`,
    () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      // Close the webview panel if open
      if (JSONProvider.currentProvider) {
        try {
          JSONProvider.currentProvider.dispose();
        } catch {
          // no-op
        }
      }
    },
  );

  context.subscriptions.push(
    disposableEnableSplitView,
    disposableDisableSplitView,
  );

  const liveSyncEnableCmd = vscode.commands.registerCommand(
    `${EXTENSION_ID}.view.enableLiveSync`,
    () => {
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }
      // Enable live sync globally for the current provider
      JSONProvider.setLiveSyncEnabled(true);
    },
  );

  const liveSyncDisableCmd = vscode.commands.registerCommand(
    `${EXTENSION_ID}.view.disableLiveSync`,
    () => {
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }
      JSONProvider.setLiveSyncEnabled(false);
    },
  );

  context.subscriptions.push(liveSyncEnableCmd, liveSyncDisableCmd);

  // -----------------------------------------------------------------
  // Register TransformController
  // -----------------------------------------------------------------

  const splitStatusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  const liveStatusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99,
  );

  const updateStatusBar = () => {
    // Split view toggle
    if (JSONProvider.isSplitView) {
      splitStatusItem.text = vscode.l10n.t('{0}: Close', [
        EXTENSION_DISPLAY_NAME,
      ]);
      splitStatusItem.tooltip = vscode.l10n.t('Close JSON Flow');
      splitStatusItem.command = `${EXTENSION_ID}.view.disableSplitView`;
    } else {
      splitStatusItem.text = vscode.l10n.t('{0}: Open', [
        EXTENSION_DISPLAY_NAME,
      ]);
      splitStatusItem.tooltip = vscode.l10n.t('Open JSON Flow beside');
      splitStatusItem.command = `${EXTENSION_ID}.view.enableSplitView`;
    }
    splitStatusItem.show();

    // Live sync toggle (visible only when split view is active)
    if (JSONProvider.isSplitView) {
      if (JSONProvider.liveSyncEnabled) {
        liveStatusItem.text = vscode.l10n.t('Live Sync: On');
        liveStatusItem.tooltip = vscode.l10n.t('Disable Live Sync');
        liveStatusItem.command = `${EXTENSION_ID}.view.disableLiveSync`;
      } else {
        liveStatusItem.text = vscode.l10n.t('Live Sync: Off');
        liveStatusItem.tooltip = vscode.l10n.t('Enable Live Sync');
        liveStatusItem.command = `${EXTENSION_ID}.view.enableLiveSync`;
      }
      liveStatusItem.show();
    } else {
      liveStatusItem.hide();
    }
  };

  // Update on provider state changes
  const stateListener = JSONProvider.onStateChanged(() => updateStatusBar());
  // Initialize once
  updateStatusBar();

  context.subscriptions.push(splitStatusItem, liveStatusItem, stateListener);

  // Create a new TransformController
  const transformController = new TransformController();

  const disposableConvertToJson = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.convertToJson`,
    (uri) => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      transformController.convertToJson(uri);
    },
  );

  const disposableConvertPartialToJson = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.convertPartialToJson`,
    () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      transformController.convertPartialToJson();
    },
  );

  const disposableConvertToType = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.convertToType`,
    async (uri) => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      const targetLanguage = await vscode.window.showQuickPick(
        [
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
        ],
        { placeHolder: vscode.l10n.t('Select the target language') },
      );

      if (!targetLanguage) {
        return;
      }

      transformController.convertFileToType(uri, targetLanguage);
    },
  );

  const disposableConvertPartialToType = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.convertPartialToType`,
    async () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      const targetLanguage = await vscode.window.showQuickPick(
        [
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
        ],
        { placeHolder: vscode.l10n.t('Select the target language') },
      );

      if (!targetLanguage) {
        return;
      }

      transformController.convertPartialToType(targetLanguage);
    },
  );

  context.subscriptions.push(
    disposableConvertToJson,
    disposableConvertPartialToJson,
    disposableConvertToType,
    disposableConvertPartialToType,
  );

  // -----------------------------------------------------------------
  // Register FeedbackProvider and Feedback commands
  // -----------------------------------------------------------------

  // Create a new FeedbackProvider
  const feedbackProvider = new FeedbackProvider(new FeedbackController());

  // Register the feedback provider
  const feedbackTreeView = vscode.window.createTreeView(
    `${EXTENSION_ID}.feedbackView`,
    {
      treeDataProvider: feedbackProvider,
    },
  );

  // Register the commands
  const disposableAboutUs = vscode.commands.registerCommand(
    `${EXTENSION_ID}.feedback.aboutUs`,
    () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      feedbackProvider.controller.aboutUs();
    },
  );
  const disposableReportIssues = vscode.commands.registerCommand(
    `${EXTENSION_ID}.feedback.reportIssues`,
    () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      feedbackProvider.controller.reportIssues();
    },
  );
  const disposableRateUs = vscode.commands.registerCommand(
    `${EXTENSION_ID}.feedback.rateUs`,
    () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      feedbackProvider.controller.rateUs();
    },
  );

  context.subscriptions.push(
    feedbackProvider,
    feedbackTreeView,
    disposableAboutUs,
    disposableReportIssues,
    disposableRateUs,
  );

  // -----------------------------------------------------------------
  // Register FilesProvider and list commands
  // -----------------------------------------------------------------

  // Create a new FilesProvider
  const filesProvider = new FilesProvider(filesController);

  // Register the list provider
  const filesTreeView = vscode.window.createTreeView(
    `${EXTENSION_ID}.filesView`,
    {
      treeDataProvider: filesProvider,
      showCollapseAll: true,
    },
  );

  const disposableRefreshList = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.refreshList`,
    () => {
      // Check if the extension is enabled
      if (!config.enable) {
        const message = vscode.l10n.t(
          '{0} is disabled in settings. Enable it to use its features',
          [EXTENSION_NAME],
        );
        vscode.window.showErrorMessage(message);
        return;
      }

      filesProvider.refresh();
    },
  );

  context.subscriptions.push(
    filesProvider,
    filesTreeView,
    disposableRefreshList,
  );

  // -----------------------------------------------------------------
  // Live Sync commands and editor listeners
  // -----------------------------------------------------------------
  // (Live Sync commands are registered above)

  // Listen to editor selection changes and forward to webview when Live Sync is enabled
  const selectionListener = vscode.window.onDidChangeTextEditorSelection(
    (_event) => {
      if (!JSONProvider.liveSyncEnabled) {
        return;
      }
      // TODO(Phase 1): Map the current selection (event.selections[0]) to a route-by-indices nodeId
      // using jsonc-parser tolerant parsing and path derivation, then:
      // JSONProvider.applyGraphSelection(derivedNodeId);
      // For now, we do nothing until mapping is implemented.
    },
  );

  context.subscriptions.push(selectionListener);

  // -----------------------------------------------------------------
  // Register FilesProvider and ListMethodsProvider events
  // -----------------------------------------------------------------

  const disposableSaveListener = vscode.workspace.onDidSaveTextDocument(() => {
    filesProvider.refresh();
  });

  context.subscriptions.push(disposableSaveListener);

  // -----------------------------------------------------------------
  // Register the JSONProvider
  // -----------------------------------------------------------------

  // Create a new JSONProvider
  if (vscode.window.registerWebviewPanelSerializer) {
    const disposableSerializer = vscode.window.registerWebviewPanelSerializer(
      JSONProvider.viewType,
      {
        async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel) {
          webviewPanel.webview.options = JSONProvider.getWebviewOptions(
            context.extensionUri,
          );
          JSONProvider.revive(webviewPanel, context.extensionUri);
        },
      },
    );

    context.subscriptions.push(disposableSerializer);
  }
}

/**
 * Called when the VSCode JSON Flow extension is deactivated.
 * Responsible for cleaning up extension resources and disposables.
 */
export function deactivate() {
  // Ensure Live Sync is disabled and any active webview is disposed
  try {
    JSONProvider.setLiveSyncEnabled(false);
  } catch {
    // no-op
  }
  try {
    if (JSONProvider.currentProvider) {
      JSONProvider.currentProvider.dispose();
    }
  } catch {
    // no-op
  }
  // Ensure static resources are fully reset between activations
  try {
    JSONProvider.shutdown();
  } catch {
    // no-op
  }
}
