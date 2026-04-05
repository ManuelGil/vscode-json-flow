/**
 * @fileoverview Resolves a directory URI from different VS Code contexts.
 */

import { dirname, extname } from 'path';
import { Uri, window, workspace } from 'vscode';

/**
 * Ensures the provided URI points to a directory.
 */
const asDirectoryUri = (uri: Uri): Uri => {
  const filePath = uri.fsPath || uri.path;

  // If it looks like a file, return its parent directory
  if (extname(filePath)) {
    return Uri.file(dirname(filePath));
  }

  return uri;
};

/**
 * Resolves a folder URI from:
 * - Explicit argument
 * - Active editor
 * - Workspace folders
 *
 * @param targetUri - Optional URI from command context.
 * @returns A directory URI or undefined.
 */
export const resolveFolderResource = (targetUri?: Uri): Uri | undefined => {
  if (targetUri) {
    return asDirectoryUri(targetUri);
  }

  const activeEditor = window.activeTextEditor;
  if (activeEditor?.document?.uri) {
    return asDirectoryUri(activeEditor.document.uri);
  }

  const workspaceFolders = workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return asDirectoryUri(workspaceFolders[0].uri);
  }

  return undefined;
};
