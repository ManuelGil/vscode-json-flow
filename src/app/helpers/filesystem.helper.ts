import { access, existsSync, mkdirSync, open, writeFile } from 'fs';
import { dirname, join } from 'path';
import { FilePermission, FileStat, Uri, window, workspace } from 'vscode';

/**
 * Reads the contents of the file specified in the path.
 *
 * @param {string} path - Path to the source directory
 * @param {object} [options] - Options for the directoryMap function
 * @param {string[]} [options.extensions] - File extensions to include
 * @param {string[]} [options.ignore] - Directories to ignore
 * @param {number} [options.maxResults] - An upper-bound for the result
 * @example
 * const files = await directoryMap('src', {
 *   extensions: ['ts'],
 *   ignore: ['**​/node_modules/**'],
 *   maxResults: 100,
 * });
 *
 * @returns {Promise<Uri[]>} - Array of files
 */
export const directoryMap = async (
  path: string,
  options?: { extensions?: string[]; ignore?: string[]; maxResults?: number },
): Promise<Uri[]> => {
  let includes = path === '/' ? '**/*' : `${path}/**/*`;
  let exclude = '';

  if (options && options.extensions && options.extensions.length) {
    includes += `.{${options.extensions.join(',')}}`;
  }

  if (options && options.ignore && options.ignore.length) {
    exclude = `{${options.ignore.join(',')}}`;
  }

  return workspace.findFiles(includes, exclude, options?.maxResults);
};

/**
 * Writes data to the file specified in the path. If the file does not exist then the function will create it.
 *
 * @param {string} path - Path to the file
 * @param {string} filename - Name of the file
 * @param {string} data - Data to write to the file
 * @example
 * await saveFile('src', 'file.ts', 'console.log("Hello World")');
 *
 * @returns {Promise<boolean>} - Confirmation of the write operation
 */
export const saveFile = async (
  path: string,
  filename: string,
  data: string,
): Promise<boolean> => {
  let folder: string = '';

  if (workspace.workspaceFolders) {
    folder = workspace.workspaceFolders[0].uri.fsPath;
  } else {
    return false;
  }

  const file = join(folder, path, filename);

  if (!existsSync(dirname(file))) {
    mkdirSync(dirname(file), { recursive: true });
  }

  return new Promise((resolve, reject) => {
    access(file, (err: any) => {
      if (err) {
        open(file, 'w+', (err: any, fd: any) => {
          if (err) {
            reject(false);
          }

          writeFile(fd, data, 'utf8', (err: any) => {
            if (err) {
              reject(false);
            }

            const openPath = Uri.file(file);

            workspace.openTextDocument(openPath).then((filename) => {
              window.showTextDocument(filename);
            });

            resolve(true);
          });
        });
      }
    });
  });
};

/**
 * Deletes ALL files contained in the supplied path.
 *
 * @param {string} path - Path to the directory
 * @param {object} [options] - Options for the deleteFiles function
 * @param {boolean} [options.recursive] - Delete the content recursively if a folder is denoted.
 * @param {boolean} [options.useTrash] - Use the trash instead of permanently deleting the files.
 * @example
 * await deleteFiles('src');
 *
 * @returns {Promise<void>} - No return value
 */
export const deleteFiles = async (
  path: string,
  options?: { recursive?: boolean; useTrash?: boolean },
): Promise<void> => {
  const files = await workspace.findFiles(`${path}/**/*`);

  files.forEach((file) => {
    access(file.path, (err: any) => {
      if (err) {
        throw err;
      }

      workspace.fs.delete(file, options);
    });
  });
};

/**
 * Returns an array of filenames in the supplied path.
 *
 * @param {string} path - Path to the directory
 * @param {object} [options] - Options for the directoryMap function
 * @param {string[]} [options.extensions] - File extensions to include
 * @param {string[]} [options.ignore] - Directories to ignore
 * @param {number} [options.maxResults] - An upper-bound for the result.
 * @example
 * const files = await getFilenames('src');
 *
 * @returns {Promise<string[]>} - Array of filenames
 */
export const getFilenames = async (
  path: string,
  options?: { extensions?: string[]; ignore?: string[]; maxResults?: number },
): Promise<string[]> => {
  const files = await directoryMap(path, options);

  return files.map((file) => file.path);
};

/**
 * Returns an object containing the file information for the supplied path.
 *
 * @param {string} path - Path to the file
 * @example
 * const fileInfo = await getFileInfo('src/file.ts');
 *
 * @returns {Promise<object>} - File information
 */
export const getFileInfo = async (path: string): Promise<object> => {
  return await workspace.fs.stat(Uri.file(path));
};

/**
 * Returns an object containing the directory information for the supplied path.
 *
 * @param {string} path - Path to the directory
 * @example
 * const dirInfo = await getDirFileInfo('src');
 *
 * @returns {Promise<object>} - Directory information
 */
export const getDirFileInfo = async (path: string): Promise<object> => {
  return await workspace.fs.stat(Uri.file(path));
};

/**
 * Returns the symbolic permissions for the supplied path.
 *
 * @param {string} path - Path to the file
 * @example
 * const permissions = await symbolicPermissions('src/file.ts');
 *
 * @returns {Promise<FilePermission | undefined>} - Symbolic permissions
 */
export const symbolicPermissions = async (
  path: string,
): Promise<FilePermission | undefined> => {
  return await workspace.fs
    .stat(Uri.file(path))
    .then((file) => file.permissions);
};

/**
 * Returns the octal permissions for the supplied path.
 *
 * @param {string} path - Path to the file
 * @example
 * const permissions = await octalPermissions('src/file.ts');
 *
 * @returns {Promise<string | undefined>} - Octal permissions
 */
export const octalPermissions = async (
  path: string,
): Promise<string | undefined> => {
  const file = await workspace.fs
    .stat(Uri.file(path))
    .then((file) => file.permissions);

  return file?.toString(8);
};

/**
 * Returns a boolean indicating whether the two supplied files are the same.
 *
 * @param {string} file1 - Path to the first file
 * @param {string} file2 - Path to the second file
 * @example
 * const isSame = await sameFile('src/file1.ts', 'src/file2.ts');
 *
 * @returns {Promise<boolean>} - Confirmation of the comparison
 */
export const sameFile = async (
  file1: string,
  file2: string,
): Promise<boolean> => {
  const file1Info = await getFileInfo(file1);
  const file2Info = await getFileInfo(file2);

  return file1Info === file2Info;
};

/**
 * Sets the realpath for the supplied path.
 *
 * @param {string} path - Path to the file
 * @example
 * await setRealpath('src/file.ts');
 *
 * @returns {Promise<Uri | FileStat>} - Uri or FileStat object for the file
 */
export const setRealpath = async (path: string): Promise<Uri | FileStat> => {
  return (await workspace.fs.stat)
    ? await workspace.fs.stat(Uri.file(path))
    : await workspace
        .openTextDocument(Uri.file(path))
        .then((filename) => filename.uri);
};

/**
 * Returns the relative path from the workspace root to the supplied path.
 *
 * @param {string} path - Path to the file
 * @example
 * const relativePath = await getRelativePath('src/file.ts');
 *
 * @returns {Promise<string>} - Relative path
 */
export const getRelativePath = async (path: string): Promise<string> => {
  return workspace.asRelativePath(path);
};

/**
 * Returns the realpath for the supplied path.
 *
 * @param {string} path - Path to the file
 * @example
 * const realpath = await getRealpath('src/file.ts');
 *
 * @returns {Promise<string>} - Realpath
 */
export const getRealpath = async (path: string): Promise<string> => {
  return Uri.file(path).fsPath;
};

/**
 * Returns a boolean indicating whether the supplied path exists.
 *
 * @param {string} path - Path to the file or directory
 * @example
 * const fileExists = await exists('src/file.ts');
 *
 * @returns {Promise<boolean>} - Confirmation of the existence
 */
export const exists = async (path: string): Promise<boolean> => {
  return existsSync(path);
};

// isDirectory
/**
 * Returns a boolean indicating whether the supplied path is a directory.
 *
 * @param {string} path - Path to the file or directory
 * @example
 * const isDir = await isDirectory('src');
 *
 * @returns {Promise<boolean>} - Confirmation of the directory
 */
export const isDirectory = async (path: string): Promise<boolean> => {
  return (await workspace.fs.stat(Uri.file(path))).type === 2;
};
