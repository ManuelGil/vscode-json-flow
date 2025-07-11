/**
 * VSCode API Service
 *
 * Centralizes all communication with VSCode extension host.
 * Provides methods for state management, message posting, and validation.
 */
import { Direction } from '../types';
import { vscodeMessenger } from './vscodeMessenger';
import { vscodeStateService } from './vscodeStateService';

/**
 * Centralized VSCode API service for all extension communication (fachada)
 */
export const vscodeService = {
  /**
   * Updates configuration in VSCode
   */
  updateConfig(config: { orientation?: Direction; [key: string]: any }) {
    vscodeMessenger.batchPostMessage('updateConfig', config);
  },

  /**
   * Saves state to VSCode webview state
   */
  saveState: vscodeStateService.saveState,

  /**
   * Gets current state from VSCode webview
   */
  getState: vscodeStateService.getState,

  /**
   * Sends a direct message to VSCode (use only for immediate communications)
   */
  sendMessage: vscodeMessenger.sendMessage,

  /**
   * Cleanup function for component unmounting
   */
  cleanup() {
    vscodeMessenger.cleanup();
  },
};
