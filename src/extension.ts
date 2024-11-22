// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import the Configs, Controllers, and Providers
import { EXTENSION_ID, EXTENSION_NAME, ExtensionConfig } from './app/configs';
import {
  FeedbackController,
  FilesController,
  JsonController,
} from './app/controllers';
import { FeedbackProvider, FilesProvider, JSONProvider } from './app/providers';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The code you place here will be executed every time your command is executed
  let resource:
    | vscode.Uri
    | vscode.TextDocument
    | vscode.WorkspaceFolder
    | undefined;

  // Get the resource for the workspace
  if (vscode.workspace.workspaceFolders) {
    resource = vscode.workspace.workspaceFolders[0];
  }

  // -----------------------------------------------------------------
  // Initialize the extension
  // -----------------------------------------------------------------

  // Get the configuration for the extension
  const config = new ExtensionConfig(
    vscode.workspace.getConfiguration(EXTENSION_ID, resource),
  );

  // -----------------------------------------------------------------
  // Get version of the extension
  // -----------------------------------------------------------------

  // Get the previous version of the extension
  const previousVersion = context.globalState.get('version');
  // Get the current version of the extension
  const currentVersion = context.extension.packageJSON.version;

  // Check if the extension is running for the first time
  if (!previousVersion) {
    const message = vscode.l10n.t('Welcome to {0}!', [EXTENSION_NAME]);
    vscode.window.showInformationMessage(message);

    // Update the version in the global state
    context.globalState.update('version', currentVersion);
  }

  // Check if the extension has been updated
  if (previousVersion && previousVersion !== currentVersion) {
    const message = vscode.l10n.t(
      'Looks like {0} has been updated to version {1}!',
      [EXTENSION_NAME, currentVersion],
    );
    vscode.window.showInformationMessage(message);

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
    (uri) => filesController.openFile(uri),
  );

  const disposableConvertToJson = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.convertToJson`,
    (uri) => filesController.convertToJson(uri),
  );

  const disposableConvertPartialToJson = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.convertPartialToJson`,
    () => filesController.convertPartialToJson(),
  );

  const disponsableCopyContent = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.copyContent`,
    (uri) => filesController.copyContent(uri),
  );

  const disponsableCopyContentAsJson = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.copyContentAsJson`,
    (uri) => filesController.copyContentAsJson(uri),
  );

  const disponsableCopyContentPartialAsJson = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.copyContentPartialAsJson`,
    () => filesController.copyContentPartialAsJson(),
  );

  const disposableGetFileProperties = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.getFileProperties`,
    (uri) => filesController.getFileProperties(uri),
  );

  context.subscriptions.push(
    disposableOpenFile,
    disposableConvertToJson,
    disposableConvertPartialToJson,
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
    (uri) => jsonController.showPreview(uri),
  );

  // Register the command to show the JSON Flow for the selected part
  const disposableShowPartialPreview = vscode.commands.registerCommand(
    `${EXTENSION_ID}.json.showPartialPreview`,
    () => jsonController.showPartialPreview(),
  );

  context.subscriptions.push(
    disposableShowPreview,
    disposableShowPartialPreview,
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
    () => feedbackProvider.controller.reportIssues(),
  );
  const disposableRateUs = vscode.commands.registerCommand(
    `${EXTENSION_ID}.feedback.rateUs`,
    () => feedbackProvider.controller.rateUs(),
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
    () => filesProvider.refresh(),
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
