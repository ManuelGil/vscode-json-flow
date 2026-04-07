import { adaptTreeToGraph } from '../helpers/adaptTreeToGraph';
import { generateTree } from '../helpers/generateTree';
import type { Direction, GraphSnapshot, JsonValue, TreeMap } from '../types';

export interface FlowState {
  data: JsonValue | null;
  treeData: TreeMap | null;
  graphData: GraphSnapshot | null;
  orientation: Direction;
  path: string;
  fileName: string;
  languageId: string;
  canEdit: boolean;
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
        languageId: string;
        canEdit: boolean;
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
    case 'UPDATE': {
      const treeData = generateTree(action.payload.data);
      const graphData = adaptTreeToGraph(treeData);
      return {
        data: action.payload.data,
        treeData,
        graphData,
        orientation: action.payload.orientation,
        path: action.payload.path,
        fileName: action.payload.fileName,
        languageId: action.payload.languageId,
        canEdit: action.payload.canEdit,
      };
    }
    case 'CLEAR':
      return {
        data: null,
        treeData: null,
        graphData: null,
        orientation: 'TB',
        path: '',
        fileName: '',
        languageId: 'plaintext',
        canEdit: false,
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
