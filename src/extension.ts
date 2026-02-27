/**
 * Main entry point for the VSCode JSON Flow extension.
 * Defines activation policy, error boundaries, and delegates runtime behavior to ExtensionRuntime.
 *
 * @file extension.ts
 * @author ManuelGil
 * @see https://code.visualstudio.com/api
 */
import * as vscode from 'vscode';

import { ContextKeys, EXTENSION_ID } from './app/configs';
import { LogLevel, logger } from './app/helpers';
import { JSONProvider } from './app/providers';
import { ExtensionRuntime } from './extension.runtime';

/**
 * Called when the VSCode JSON Flow extension is activated.
 * Establishes activation policy, configures logging, and delegates to ExtensionRuntime.
 * @param context The VSCode extension context object.
 */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    const isDevMode =
      context.extensionMode === vscode.ExtensionMode.Development;
    logger.configure({
      enableConsole: isDevMode,
      minLevel: isDevMode ? LogLevel.Debug : LogLevel.Info,
      includeLocation: isDevMode,
    });

    await vscode.commands.executeCommand(
      'setContext',
      `${EXTENSION_ID}.${ContextKeys.IsSplitView}`,
      JSONProvider.isSplitView,
    );
    await vscode.commands.executeCommand(
      'setContext',
      `${EXTENSION_ID}.${ContextKeys.LiveSyncEnabled}`,
      JSONProvider.liveSyncEnabled,
    );

    const runtime = new ExtensionRuntime(context);

    const initialized = await runtime.initialize();
    if (!initialized) {
      return;
    }

    runtime.start();
  } catch (error: unknown) {
    logger.error('Fatal error during extension activation', error, {
      phase: 'activation',
    });
    const message = vscode.l10n.t(
      'Failed to activate JSON Flow extension. Check the output panel for details',
    );
    vscode.window.showErrorMessage(message);
  }
}

/**
 * Called when the VSCode JSON Flow extension is deactivated.
 * Responsible for cleaning up extension resources and disposables.
 */
export function deactivate() {
  // Ensure Live Sync is disabled and any active webview is disposed
  try {
    JSONProvider.setLiveSyncEnabled(false);
  } catch (error: unknown) {
    logger.error('Failed to disable Live Sync', error);
  }
  try {
    if (JSONProvider.currentProvider) {
      JSONProvider.currentProvider.dispose();
    }
  } catch (error: unknown) {
    logger.error('Failed to dispose JSONProvider', error);
  }
  // Ensure static resources are fully reset between activations
  try {
    JSONProvider.shutdown();
  } catch (error: unknown) {
    logger.error('Failed to shutdown JSONProvider', error);
  }
}
