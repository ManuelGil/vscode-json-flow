// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import the Configs, Controllers, and Providers
import {
  EXTENSION_ID,
  EXTENSION_NAME,
  ExtensionConfig,
  USER_PUBLISHER,
} from './app/configs';
import {
  FeedbackController,
  FilesController,
  JsonController,
  TransformController,
} from './app/controllers';
import { FeedbackProvider, FilesProvider, JSONProvider } from './app/providers';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // The code you place here will be executed every time your command is executed
  let resource: vscode.WorkspaceFolder | undefined;

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

  // Optionally, prompt the user to select a workspace folder if multiple are available
  if (vscode.workspace.workspaceFolders.length === 1) {
    resource = vscode.workspace.workspaceFolders[0];
  } else {
    const placeHolder = vscode.l10n.t(
      'Select a workspace folder to use. This folder will be used to load workspace-specific configuration for the extension',
    );
    const selectedFolder = await vscode.window.showWorkspaceFolderPick({
      placeHolder,
    });

    resource = selectedFolder;
  }

  // -----------------------------------------------------------------
  // Initialize the extension
  // -----------------------------------------------------------------

  // Get the configuration for the extension
  const config = new ExtensionConfig(
    vscode.workspace.getConfiguration(EXTENSION_ID, resource?.uri),
  );

  // Watch for changes in the configuration
  vscode.workspace.onDidChangeConfiguration((event) => {
    const workspaceConfig = vscode.workspace.getConfiguration(
      EXTENSION_ID,
      resource?.uri,
    );

    if (event.affectsConfiguration(`${EXTENSION_ID}.enable`, resource?.uri)) {
      const isEnabled = workspaceConfig.get<boolean>('enable');

      config.update(workspaceConfig);

      if (isEnabled) {
        const message = vscode.l10n.t('{0} is now enabled and ready to use', [
          EXTENSION_NAME,
        ]);
        vscode.window.showInformationMessage(message);
      } else {
        const message = vscode.l10n.t('{0} is now disabled', [EXTENSION_NAME]);
        vscode.window.showInformationMessage(message);
      }
    }

    if (event.affectsConfiguration(EXTENSION_ID, resource?.uri)) {
      config.update(workspaceConfig);
    }
  });

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
      [EXTENSION_NAME, currentVersion],
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
        title: vscode.l10n.t('Close'),
      },
    ];

    const message = vscode.l10n.t(
      'New version of {0} is available. Check out the release notes for version {1}',
      [EXTENSION_NAME, currentVersion],
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
              `https://marketplace.visualstudio.com/items/${USER_PUBLISHER}.${EXTENSION_NAME}/changelog`,
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

  context.subscriptions.push(
    disposableShowPreview,
    disposableShowPartialPreview,
  );

  // -----------------------------------------------------------------
  // Register TransformController
  // -----------------------------------------------------------------

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

      transformController.convertToType(uri, targetLanguage);
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
    feedbackTreeView,
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

  context.subscriptions.push(filesTreeView, disposableRefreshList);

  // -----------------------------------------------------------------
  // Register FilesProvider and ListMethodsProvider events
  // -----------------------------------------------------------------

  vscode.workspace.onDidSaveTextDocument(() => {
    filesProvider.refresh();
  });

  // -----------------------------------------------------------------
  // Register the JSONProvider
  // -----------------------------------------------------------------

  // Create a new JSONProvider
  if (vscode.window.registerWebviewPanelSerializer) {
    vscode.window.registerWebviewPanelSerializer(JSONProvider.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel) {
        webviewPanel.webview.options = JSONProvider.getWebviewOptions(
          context.extensionUri,
        );
        JSONProvider.revive(webviewPanel, context.extensionUri);
      },
    });
  }
}

// this method is called when your extension is deactivated
// biome-ignore lint/suspicious/noEmptyBlockStatements: we dont control vscode's api
export function deactivate() {}
