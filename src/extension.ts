// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import the Configs, Controllers, and Providers
import { readFileSync } from 'fs';
import { EXTENSION_ID, ExtensionConfig } from './app/configs';
import { FeedbackController, FilesController } from './app/controllers';
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
  // Register FilesController
  // -----------------------------------------------------------------

  // Create a new FilesController
  const filesController = new FilesController(config);

  const disposableOpenFile = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.openFile`,
    (uri) => filesController.openFile(uri),
  );

  const disposableGetFileProperties = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.getFileProperties`,
    (uri) => filesController.getFileProperties(uri),
  );

  const disponsableCopyContent = vscode.commands.registerCommand(
    `${EXTENSION_ID}.files.copyContent`,
    (uri) => filesController.copyContent(uri),
  );

  context.subscriptions.push(
    disposableOpenFile,
    disposableGetFileProperties,
    disponsableCopyContent,
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
  const disposableFollowUs = vscode.commands.registerCommand(
    `${EXTENSION_ID}.feedback.followUs`,
    () => feedbackProvider.controller.followUs(),
  );
  const disposableSupportUs = vscode.commands.registerCommand(
    `${EXTENSION_ID}.feedback.supportUs`,
    () => feedbackProvider.controller.supportUs(),
  );

  context.subscriptions.push(
    feedbackTreeView,
    disposableReportIssues,
    disposableRateUs,
    disposableFollowUs,
    disposableSupportUs,
  );

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

  // -----------------------------------------------------------------
  // Register the commands
  // -----------------------------------------------------------------

  // Register the command to open the JSON preview
  const disposableOpenJSONPreview = vscode.commands.registerCommand(
    `${EXTENSION_ID}.json.openPreview`,
    (uri) => {
      const panel = JSONProvider.createPanel(context.extensionUri);

      setTimeout(() => {
        const jsonContent = readFileSync(uri.fsPath, 'utf8');

        panel.webview.postMessage({
          json: { root: JSON.parse(jsonContent) },
        });
      }, 500);
    },
  );

  context.subscriptions.push(disposableOpenJSONPreview);
}

// this method is called when your extension is deactivated
export function deactivate() {}
