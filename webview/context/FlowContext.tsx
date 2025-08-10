import { generateTree } from '@webview/helpers/generateTree';
import type { Direction, JsonValue, TreeMap } from '@webview/types';
import React, { createContext, Dispatch, useContext, useReducer } from 'react';

export interface FlowState {
  data: JsonValue | null;
  treeData: TreeMap | null;
  orientation: Direction;
  path: string;
  fileName: string;
}

// Actions for the global flow reducer
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
  | { type: 'CLEAR' };

/**
 * Reducer for the global flow state.
 * Handles update and clear actions for the flow tree.
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
    default:
      return state;
  }
}

export const FlowStateContext = createContext<FlowState | undefined>(undefined);
export const FlowDispatchContext = createContext<
  Dispatch<FlowAction> | undefined
>(undefined);

/**
 * Hook to access the global flow state.
 * Throws if used outside FlowProvider.
 */
export function useFlowState(): FlowState {
  const context = useContext(FlowStateContext);
  if (context === undefined) {
    throw new Error('useFlowState must be used within a FlowProvider');
  }
  return context;
}

/**
 * Hook to access the global flow dispatch.
 * Throws if used outside FlowProvider.
 */
export function useFlowDispatch(): Dispatch<FlowAction> {
  const context = useContext(FlowDispatchContext);
  if (context === undefined) {
    throw new Error('useFlowDispatch must be used within a FlowProvider');
  }
  return context;
}

/**
 * Provider component for the global flow context.
 * Initializes state and exposes state/dispatch via context providers.
 *
 * @param children - React children to wrap.
 * @param initialState - Optional initial state for the flow.
 */
export function FlowProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: FlowState;
}) {
  const [state, dispatch] = useReducer(
    flowReducer,
    initialState ?? {
      data: null,
      treeData: null,
      orientation: 'TB',
      path: '',
      fileName: '',
    },
  );

  return (
    <FlowStateContext.Provider value={state}>
      <FlowDispatchContext.Provider value={dispatch}>
        {children}
      </FlowDispatchContext.Provider>
    </FlowStateContext.Provider>
  );
}
