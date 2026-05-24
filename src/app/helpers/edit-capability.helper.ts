import { TextDocument, workspace } from 'vscode';

const EDITABLE_FILE_TYPES = new Set(['json', 'jsonc', 'json5']);

/**
 * Returns whether node mutations are supported for a parsed file type.
 */
export function isEditCapableFileType(fileType: string): boolean {
  return EDITABLE_FILE_TYPES.has(fileType.toLowerCase().trim());
}

/**
 * Returns whether mutations should be enabled for a specific document instance.
 *
 * File type controls logical support, while document/provider flags control runtime capability.
 */
export function isDocumentMutationCapable(
  document: TextDocument,
  fileType: string,
): boolean {
  if (!isEditCapableFileType(fileType)) {
    return false;
  }

  if (document.isClosed) {
    return false;
  }

  if (document.isUntitled) {
    return true;
  }

  const writable = workspace.fs.isWritableFileSystem(document.uri.scheme);

  return writable !== false;
}

/**
 * Returns whether the document should be saved explicitly after applying edits.
 */
export function shouldPersistDocumentAfterEdit(
  document: TextDocument,
): boolean {
  if (document.isUntitled || document.isClosed) {
    return false;
  }

  const writable = workspace.fs.isWritableFileSystem(document.uri.scheme);

  return writable !== false;
}
