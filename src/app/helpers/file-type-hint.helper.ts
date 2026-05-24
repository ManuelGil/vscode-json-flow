import { FileType, isFileTypeSupported } from './json.helper';

/**
 * Resolves the best supported file-type hint from document metadata.
 *
 * The returned type is used as a parser hint, not as hard eligibility.
 */
export const resolveFileTypeHint = (
  languageId: string,
  fileName: string,
  fallback?: FileType,
): FileType | undefined => {
  let fileType: string = languageId;

  if (!isFileTypeSupported(fileType)) {
    const baseName = fileName.split(/[\\\/]/).pop() ?? fileName;

    if (/^\.env(\..*)?$/i.test(baseName)) {
      fileType = 'env';
    } else {
      const fileExtension = fileName.split('.').pop();

      if (isFileTypeSupported(fileExtension)) {
        fileType = fileExtension;
      } else if (fallback) {
        fileType = fallback;
      } else {
        return undefined;
      }
    }
  }

  return fileType as FileType;
};
