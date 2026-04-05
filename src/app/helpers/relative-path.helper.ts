/**
 * @fileoverview Converts absolute URIs into workspace-relative paths.
 * Used by controllers when a user right-clicks a file or folder in the
 * explorer so the extension can determine the target directory for
 * file generation.
 */

import { posix } from 'path';
import { Uri, workspace } from 'vscode';

import { ExtensionConfig } from '../configs';

type ConfigWithWorkspaceSelection = ExtensionConfig & {
  workspaceSelection?: string;
};

/**
 * Converts a URI to a workspace-relative path.
 *
 * Supports two resolution modes:
 * - Root context → uses configured workspace or detected folder
 * - Standard → uses VS Code relative path
 */
export const relativePath = (
  targetUri: Uri | undefined,
  isRootContext: boolean,
  config: ExtensionConfig,
): string => {
  if (!targetUri) {
    return '';
  }

  const pathInfo = derivePathInfo(targetUri);
  if (!pathInfo) {
    return '';
  }

  const { nativePath, posixPath } = pathInfo;

  if (isRootContext) {
    const configuredRoot = readConfiguredRoot(
      config as ConfigWithWorkspaceSelection,
    );

    const relativeToConfig = computeRelativePath(posixPath, configuredRoot);
    if (relativeToConfig !== undefined) {
      return relativeToConfig;
    }

    const folderRoot = getWorkspaceFolderPath(targetUri);
    const relativeToFolder = computeRelativePath(posixPath, folderRoot);
    if (relativeToFolder !== undefined) {
      return relativeToFolder;
    }

    return posixPath;
  }

  const workspaceRelative = workspace.asRelativePath(targetUri, false);

  if (workspaceRelative && workspaceRelative !== nativePath) {
    return normalizeRelativeOutput(workspaceRelative);
  }

  return posixPath;
};

/**
 * 🔧 Simplified:
 * - No file/directory guessing
 * - Only normalization
 */
const derivePathInfo = (
  uri: Uri,
): { nativePath: string; posixPath: string } | undefined => {
  const nativePath = getNativePath(uri);
  if (!nativePath) {
    return undefined;
  }

  const sanitizedNative = stripTrailingSeparators(nativePath) || nativePath;

  const posixPath = normalizeAbsolutePath(sanitizedNative) ?? '/';

  return {
    nativePath: sanitizedNative,
    posixPath,
  };
};

const getNativePath = (uri: Uri): string => {
  return uri.scheme === 'file' ? uri.fsPath || '' : uri.path || '';
};

const stripTrailingSeparators = (value: string): string => {
  if (!value) {
    return value;
  }

  const normalized = value.replace(/[\\/]+$/, '');

  if (normalized.length === 0) {
    return value.startsWith('/') ? '/' : value;
  }

  return normalized;
};

const normalizeAbsolutePath = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = toPosixPath(value).replace(/\/+$/, '');

  return normalized.length > 0 ? normalized : '/';
};

const toPosixPath = (value: string): string => value.replace(/\\/g, '/');

const readConfiguredRoot = (
  config: ConfigWithWorkspaceSelection,
): string | undefined => {
  if (!config?.workspaceSelection) {
    return undefined;
  }

  return normalizeAbsolutePath(config.workspaceSelection);
};

const getWorkspaceFolderPath = (uri: Uri): string | undefined => {
  const folder = workspace.getWorkspaceFolder(uri);

  if (!folder) {
    return undefined;
  }

  return normalizeAbsolutePath(getNativePath(folder.uri));
};

const computeRelativePath = (
  targetPosixPath: string,
  rootPosixPath: string | undefined,
): string | undefined => {
  if (!rootPosixPath) {
    return undefined;
  }

  const relativePath = posix.relative(rootPosixPath, targetPosixPath);

  return normalizeRelativeOutput(relativePath);
};

const normalizeRelativeOutput = (value: string): string => {
  if (!value) {
    return '';
  }

  return toPosixPath(value).replace(/^\.\/?/, '');
};
