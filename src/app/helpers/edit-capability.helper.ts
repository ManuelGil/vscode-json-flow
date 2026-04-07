const EDITABLE_FILE_TYPES = new Set(['json', 'jsonc', 'json5']);

/**
 * Returns whether node mutations are supported for a parsed file type.
 */
export function isEditCapableFileType(fileType: string): boolean {
  return EDITABLE_FILE_TYPES.has(fileType.toLowerCase().trim());
}
