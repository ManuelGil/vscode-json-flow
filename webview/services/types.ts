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
  | 'updateState';

/**
 * VSCode message structure
 */
export interface VscodeMessage {
  command: VscodeMessageCommand;
  data?: JsonValue;
  orientation?: Direction;
  path?: string;
  fileName?: string;
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
export interface VscodeConfigUpdate {
  orientation?: Direction;
  [key: string]: unknown;
}
