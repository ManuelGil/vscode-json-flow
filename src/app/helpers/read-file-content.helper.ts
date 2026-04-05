/**
 * @fileoverview File reading utilities using VS Code filesystem API.
 */

import { Uri, workspace } from 'vscode';

/**
 * Shared UTF-8 decoder reused across reads to avoid unnecessary allocations.
 */
const utf8Decoder = new TextDecoder('utf-8');

/**
 * Reads a file from the workspace filesystem and returns its decoded UTF-8 content.
 *
 * This avoids opening a TextDocument, making it suitable for batch processing
 * and improving performance in large workspaces.
 *
 * @param fileUri - URI of the file to read.
 * @returns File content as string.
 */
export const readFileContent = async (fileUri: Uri): Promise<string> => {
  const fileBytes = await workspace.fs.readFile(fileUri);
  return utf8Decoder.decode(fileBytes);
};
