/**
 * @fileoverview Core file discovery engine for the extension.
 *
 * Provides glob-based file searching with two strategies:
 * - **Local** (default): uses FastGlob streaming for direct filesystem access.
 * - **Remote**: falls back to VS Code's `workspace.findFiles` API for virtual
 *   or remote workspaces where the filesystem isn't directly accessible.
 *
 * Includes a shared in-memory cache with TTL-based eviction and deduplication
 * of concurrent in-flight requests to avoid redundant filesystem scans.
 * Consumers should invoke `clearCache()` after commands, generators, or file
 * watchers create, delete, or rename files so discovery data stays current.
 */

import FastGlob from 'fast-glob';
import ignore, { type Ignore } from 'ignore';
import { posix } from 'path';
import { RelativePattern, Uri, type WorkspaceFolder, workspace } from 'vscode';
import { toPosixPath } from './path-format.helper';

// Shared cache for all file operations across the extension
const fileDiscoveryCache: Map<string, { files: Uri[]; timestamp: number }> =
  new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const inFlightRequests: Map<string, Promise<Uri[]>> = new Map();

// Hard safety limits to prevent extension host overload on very large repositories
const MAX_INDEXABLE_FILES = 5000;
const MAX_CACHE_ENTRIES = 100;

/**
 * Options for configuring file discovery behavior.
 */
export interface FindFilesOptions {
  /** Absolute path to the directory to search within. */
  baseDirectoryPath: string;
  /** Glob patterns for files to include (e.g. `["**\/*.controller.ts"]`). */
  includeFilePatterns: string[];
  /** Glob patterns for files/directories to exclude. */
  excludedPatterns?: string[];
  /** When `true`, only match files directly inside `baseDirectoryPath` (no subdirectories). */
  disableRecursive?: boolean;
  /** Maximum folder depth to recurse into (0 = unlimited). */
  maxRecursionDepth?: number;
  /** When `true`, include files and directories starting with a dot. */
  includeDotfiles?: boolean;
  /** When `true`, read the workspace `.gitignore` and apply its rules as exclude filters. */
  enableGitignoreDetection?: boolean;
  /** Optional upper bound for the number of files returned (defaults to MAX_INDEXABLE_FILES). */
  maxResults?: number;
}

/**
 * Builds an ignore matcher that combines explicit exclude patterns with
 * optional `.gitignore` rules from the workspace root.
 */
const buildIgnoreMatcher = async (options: {
  baseDirectoryPath: string;
  excludedPatterns: string[];
  enableGitignoreDetection: boolean;
  workspaceFolder?: WorkspaceFolder;
}): Promise<Ignore> => {
  const {
    baseDirectoryPath,
    excludedPatterns,
    enableGitignoreDetection,
    workspaceFolder,
  } = options;

  const ignoreMatcher = ignore();

  // Add user-provided ignore patterns first
  if (excludedPatterns.length > 0) {
    ignoreMatcher.add(excludedPatterns.map(toPosixPath));
  }

  // Optionally merge workspace-level .gitignore rules
  if (enableGitignoreDetection) {
    try {
      const gitignoreBaseUri =
        workspaceFolder?.uri ?? Uri.file(baseDirectoryPath);
      const gitignoreUri = Uri.joinPath(gitignoreBaseUri, '.gitignore');
      await workspace.fs.stat(gitignoreUri);
      const fileData = await workspace.fs.readFile(gitignoreUri);
      const fileContent = new TextDecoder('utf-8').decode(fileData);
      ignoreMatcher.add(fileContent);
    } catch {
      // .gitignore missing or unreadable → safe to ignore silently
    }
  }

  return ignoreMatcher;
};

/**
 * File discovery strategy for remote/virtual workspaces.
 * Uses VS Code APIs and applies filtering post-search.
 */
const discoverFilesRemotely = async (
  options: FindFilesOptions,
  workspaceFolder: WorkspaceFolder,
  ignoreMatcher?: Ignore,
): Promise<Uri[]> => {
  const { includeFilePatterns, excludedPatterns = [] } = options;
  const maxResults = options.maxResults ?? MAX_INDEXABLE_FILES;

  const processedPaths = new Set<string>();
  const collectedUris: Uri[] = [];

  const posixExcludedPatterns = excludedPatterns.map(toPosixPath);
  const combinedExcludePattern =
    posixExcludedPatterns.length > 0
      ? `{${posixExcludedPatterns.join(',')}}`
      : undefined;

  let totalCollected = 0;

  // Sequentially execute include patterns to respect file limits
  for (const includePatternGlob of includeFilePatterns) {
    if (totalCollected >= maxResults) {
      break;
    }

    const searchPattern = new RelativePattern(
      workspaceFolder,
      includePatternGlob,
    );

    const discoveredFiles = await workspace.findFiles(
      searchPattern,
      combinedExcludePattern,
      maxResults - totalCollected,
    );

    for (const fileUri of discoveredFiles) {
      if (processedPaths.has(fileUri.fsPath)) {
        continue;
      }

      processedPaths.add(fileUri.fsPath);
      collectedUris.push(fileUri);
      totalCollected++;

      if (totalCollected >= maxResults) {
        break;
      }
    }
  }

  const baseDirectoryPosix = toPosixPath(options.baseDirectoryPath).replace(
    /\/$/,
    '',
  );

  const passesDepthFilter = (candidateUri: Uri) => {
    const relativePath = toPosixPath(candidateUri.fsPath).slice(
      baseDirectoryPosix.length + 1,
    );

    if (options.disableRecursive) {
      return !relativePath.includes('/');
    }

    if (!options.maxRecursionDepth || options.maxRecursionDepth <= 0) {
      return true;
    }

    const folderDepth = Math.max(0, relativePath.split('/').length - 1);
    return folderDepth <= options.maxRecursionDepth;
  };

  const passesDotfileFilter = (candidateUri: Uri) => {
    if (options.includeDotfiles) {
      return true;
    }

    const relativePath = workspace.asRelativePath(candidateUri, false);
    return !relativePath
      .split(/[\\\/]/)
      .some((segment) => segment.startsWith('.'));
  };

  const passesIgnoreFilter = (candidateUri: Uri) => {
    if (!ignoreMatcher) {
      return true;
    }

    const filePosixPath = toPosixPath(candidateUri.fsPath);
    const relativePathToEvaluate = posix.relative(
      baseDirectoryPosix,
      filePosixPath,
    );

    return !ignoreMatcher.ignores(relativePathToEvaluate);
  };

  // NOTE: Sorting intentionally removed for performance reasons.
  // Consumers should not rely on discovery order.
  return collectedUris
    .filter(passesDepthFilter)
    .filter(passesDotfileFilter)
    .filter(passesIgnoreFilter)
    .slice(0, maxResults);
};

/**
 * Default file discovery strategy for local workspaces.
 * Uses FastGlob streaming for high-performance incremental scanning.
 */
const discoverFilesLocally = async (
  options: FindFilesOptions,
  ignoreMatcher?: Ignore,
): Promise<Uri[]> => {
  const {
    baseDirectoryPath,
    includeFilePatterns,
    excludedPatterns = [],
  } = options;
  const maxResults = options.maxResults ?? MAX_INDEXABLE_FILES;

  const normalizedIncludeGlobs = includeFilePatterns.map(toPosixPath);

  const collectedUris: Uri[] = [];
  const processedPaths = new Set<string>();
  let totalCollected = 0;

  const globStream = FastGlob.stream(normalizedIncludeGlobs, {
    cwd: baseDirectoryPath,
    dot: options.includeDotfiles,
    ignore: excludedPatterns.map(toPosixPath),
    onlyFiles: true,
    unique: true,
    followSymbolicLinks: true,
    absolute: true,
  }) as NodeJS.ReadableStream & { destroy?: () => void };

  try {
    for await (const matchedFilePath of globStream as AsyncIterable<string>) {
      if (!matchedFilePath) {
        continue;
      }

      const absolutePosixPath = toPosixPath(matchedFilePath);
      if (processedPaths.has(absolutePosixPath)) {
        continue;
      }

      const candidateUri = Uri.file(matchedFilePath);

      const baseDirectoryPosix = toPosixPath(baseDirectoryPath).replace(
        /\/$/,
        '',
      );

      const relativePath = absolutePosixPath.startsWith(
        `${baseDirectoryPosix}/`,
      )
        ? absolutePosixPath.slice(baseDirectoryPosix.length + 1)
        : absolutePosixPath;

      if (options.disableRecursive && relativePath.includes('/')) {
        continue;
      }

      if (
        !options.disableRecursive &&
        options.maxRecursionDepth &&
        options.maxRecursionDepth > 0
      ) {
        const folderDepth = Math.max(0, relativePath.split('/').length - 1);
        if (folderDepth > options.maxRecursionDepth) {
          continue;
        }
      }

      if (!options.includeDotfiles) {
        const relativePathForDotCheck = workspace.asRelativePath(
          candidateUri,
          false,
        );

        if (
          relativePathForDotCheck
            .split(/[\\\/]/)
            .some((segment) => segment.startsWith('.'))
        ) {
          continue;
        }
      }

      if (ignoreMatcher) {
        const relativePathForIgnoreCheck = posix.relative(
          baseDirectoryPosix,
          absolutePosixPath,
        );

        if (ignoreMatcher.ignores(relativePathForIgnoreCheck)) {
          continue;
        }
      }

      processedPaths.add(absolutePosixPath);
      collectedUris.push(candidateUri);
      totalCollected++;

      if (totalCollected >= maxResults) {
        // Stop stream early once limit is reached
        if (typeof globStream.destroy === 'function') {
          try {
            globStream.destroy();
          } catch {
            // Ignore stream destruction errors
          }
        }
        break;
      }
    }
  } catch (streamError) {
    try {
      if (typeof globStream.destroy === 'function') {
        globStream.destroy();
      }
    } catch {
      // Ignore stream destruction errors during error handling
    }
    throw streamError;
  }

  // NOTE: Sorting intentionally removed for performance reasons.
  return collectedUris.slice(0, maxResults);
};

/**
 * Stores search results in the shared cache with TTL eviction and size limits.
 */
const updateDiscoveryCache = (cacheKey: string, files: Uri[]) => {
  const currentTime = Date.now();

  for (const [key, cachedEntry] of fileDiscoveryCache.entries()) {
    if (currentTime - cachedEntry.timestamp >= CACHE_TTL_MS) {
      fileDiscoveryCache.delete(key);
    }
  }

  if (fileDiscoveryCache.size >= MAX_CACHE_ENTRIES) {
    const entriesSortedByAge = Array.from(fileDiscoveryCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp,
    );

    const excessEntriesCount = fileDiscoveryCache.size - MAX_CACHE_ENTRIES + 1;
    for (let i = 0; i < excessEntriesCount; i++) {
      fileDiscoveryCache.delete(entriesSortedByAge[i][0]);
    }
  }

  fileDiscoveryCache.set(cacheKey, { files, timestamp: currentTime });
};

/**
 * Clears the shared cache for file operations.
 * Call this after filesystem mutations (create/delete/rename) or structural
 * changes triggered by commands, generators, or file watchers so cached search
 * results and in-flight discoveries reflect the latest workspace state.
 */
export const clearCache = (): void => {
  fileDiscoveryCache.clear();
  inFlightRequests.clear();
};

/**
 * Searches for files in a directory that match specified patterns, with optimized performance.
 * Uses fast-glob for discovery and applies post-filters for recursion depth, dotfiles, and optional .gitignore rules.
 * Includes shared caching and optimizations for large projects with many files.
 *
 * @param options - The options for the file search.
 * @returns Array of VS Code Uri objects for the found files.
 */
export const findFiles = async (options: FindFilesOptions): Promise<Uri[]> => {
  const {
    baseDirectoryPath,
    includeFilePatterns,
    excludedPatterns = [],
    disableRecursive = false,
    maxRecursionDepth = 0,
    includeDotfiles = false,
    enableGitignoreDetection = false,
  } = options;
  const maxResults = options.maxResults ?? MAX_INDEXABLE_FILES;
  const baseUri = Uri.file(baseDirectoryPath);
  const workspaceFolder = workspace.getWorkspaceFolder(baseUri);

  try {
    if (includeFilePatterns.length === 0) {
      return [];
    }

    const cacheKey = JSON.stringify({
      workspace: workspaceFolder?.uri.toString() ?? null,
      baseDir: baseDirectoryPath,
      include: [...includeFilePatterns].map(toPosixPath).sort(),
      exclude: [...excludedPatterns].map(toPosixPath).sort(),
      disableRecursive,
      maxRecursionDepth,
      includeDotfiles,
      enableGitignoreDetection,
    });

    const ongoingRequest = inFlightRequests.get(cacheKey);
    if (ongoingRequest) {
      return ongoingRequest;
    }

    const discoveryTask = (async (): Promise<Uri[]> => {
      const cachedResult = fileDiscoveryCache.get(cacheKey);
      if (cachedResult) {
        const cacheAge = Date.now() - cachedResult.timestamp;
        if (cacheAge < CACHE_TTL_MS) {
          return cachedResult.files;
        }

        fileDiscoveryCache.delete(cacheKey);
      }

      const ignoreMatcher = await buildIgnoreMatcher({
        baseDirectoryPath,
        excludedPatterns,
        enableGitignoreDetection,
        workspaceFolder,
      });

      const isRemoteWorkspace =
        !!workspaceFolder && workspaceFolder.uri.scheme !== 'file';

      const discoveredFiles =
        isRemoteWorkspace && workspaceFolder
          ? await discoverFilesRemotely(
              { ...options, maxResults },
              workspaceFolder,
              ignoreMatcher,
            )
          : await discoverFilesLocally(
              { ...options, maxResults },
              ignoreMatcher,
            );

      updateDiscoveryCache(cacheKey, discoveredFiles);
      return discoveredFiles;
    })();

    inFlightRequests.set(cacheKey, discoveryTask);

    try {
      return await discoveryTask;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  } catch (error) {
    const errorInstance =
      error instanceof Error ? error : new Error(String(error));
    console.error('findFiles error', errorInstance);
    return [];
  }
};
