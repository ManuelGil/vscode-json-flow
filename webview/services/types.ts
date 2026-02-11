/**
 * Types definitions for service layer
 */
import { Direction, JsonValue } from '@webview/types';

/**
 * VSCode message command types
 */
export type VscodeMessageCommand =
  | 'updateConfig'
  | 'openSettings'
  | 'updateState'
  // Live Sync (webview -> extension)
  | 'graphSelectionChanged';

/**
 * VSCode message structure
 */
export interface VscodeMessage {
  command: VscodeMessageCommand;
  data?: JsonValue;
  orientation?: Direction;
  path?: string;
  fileName?: string;
  /** Optional origin marker to help prevent feedback loops */
  origin?: 'webview' | 'extension';
  /** Optional per-message nonce for correlation */
  nonce?: string;
  [key: string]: unknown;
}

/**
 * VSCode API state structure
 */
export interface VscodeState {
  data?: JsonValue;
  orientation?: Direction;
  path?: string;
  fileName?: string;
}

/**
 * VSCode configuration update payload
 */
/**
 * VSCode configuration update payload
 * Only known configuration keys should be included here to avoid drift.
 */
export interface VscodeConfigUpdate {
  orientation?: Direction;
}

/**
 * Incoming messages sent from the VSCode extension host to the webview.
 */
export type IncomingVscodeMessage =
  | {
      command: 'update';
      data?: JsonValue;
      orientation?: Direction;
      path?: string;
      fileName?: string;
    }
  | {
      command: 'clear';
    }
  // Live Sync (extension -> webview)
  | {
      command: 'liveSyncState';
      enabled: boolean;
      paused?: boolean;
      reason?: string;
      throttleMs?: number;
      origin?: 'webview' | 'extension';
      nonce?: string;
    }
  | {
      command: 'applyGraphSelection';
      nodeId?: string;
      origin?: 'webview' | 'extension';
      nonce?: string;
    };
