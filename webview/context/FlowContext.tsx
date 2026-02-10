import { generateTree } from '@webview/helpers/generateTree';
import type { Direction, JsonValue, TreeMap } from '@webview/types';

export interface FlowState {
  data: JsonValue | null;
  treeData: TreeMap | null;
  orientation: Direction;
  path: string;
  fileName: string;
}

// Actions that can be dispatched to the flow reducer
export type FlowAction =
  | {
      type: 'UPDATE';
      payload: {
        data: JsonValue;
        orientation: Direction;
        path: string;
        fileName: string;
      };
    }
  | { type: 'CLEAR' }
  | { type: 'SET_ORIENTATION'; payload: { orientation: Direction } };

/**
 * Reducer for the global flow state.
 * Handles update, clear, and orientation actions for the flow tree.
 *
 * Used directly by FlowCanvas via useReducer (single source of truth).
 *
 * @param state - Current flow state.
 * @param action - Action to apply.
 * @returns Updated flow state.
 */
export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'UPDATE':
      return {
        data: action.payload.data,
        treeData: generateTree(action.payload.data),
        orientation: action.payload.orientation,
        path: action.payload.path,
        fileName: action.payload.fileName,
      };
    case 'CLEAR':
      return {
        data: null,
        treeData: null,
        orientation: 'TB', // Default orientation
        path: '',
        fileName: '',
      };
    case 'SET_ORIENTATION':
      if (state.orientation === action.payload.orientation) {
        return state;
      }
      return { ...state, orientation: action.payload.orientation };
    default:
      return state;
  }
}
