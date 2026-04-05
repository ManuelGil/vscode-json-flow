import type { Node } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodePropertiesViewModel } from './useNodeProperties';

export type NodeEditIntent =
  | { nodeId: string; type: 'rename-key'; newKey: string }
  | { nodeId: string; type: 'change-value'; newValue: unknown }
  | {
      nodeId: string;
      type: 'create-child';
      key?: string;
      value?: unknown;
    }
  | { nodeId: string; type: 'delete-node' };

export type NodeEditingState = {
  draftKey: string | null;
  draftValue: string | null;
  keyInputValue: string;
  valueInputValue: string;
  setDraftKey: (value: string) => void;
  setDraftValue: (value: string) => void;
  handleKeyCommit: () => void;
  handleValueCommit: () => void;
  handleCreateChild: (key?: string, valueInput?: string) => void;
  handleDeleteNode: () => void;
  handleApplyChanges: () => void;
};

type NodeEditIntentHandler = (intent: NodeEditIntent) => boolean | void;

/**
 * Parses a string input value respecting the type of the current value.
 * Only attempts type coercion if the current value has that type.
 * This prevents "25" (string) from becoming 25 (number) if the current value is a string.
 *
 * @param input - The string input from the user
 * @param currentValue - The original value (determines expected type)
 * @returns The parsed value with type matching current, or current if parsing fails
 */
function parseInputValue(input: string, currentValue: unknown): unknown {
  const currentType = typeof currentValue;

  if (currentType === 'number') {
    const n = Number(input);
    return isNaN(n) ? currentValue : n;
  }

  if (currentType === 'boolean') {
    if (input === 'true') {
      return true;
    }
    if (input === 'false') {
      return false;
    }
    return currentValue;
  }

  return input; // strings stay strings
}

function parseLooseInputValue(input: string): unknown {
  if (input === 'true') {
    return true;
  }
  if (input === 'false') {
    return false;
  }
  const asNumber = Number(input);
  if (!isNaN(asNumber) && input.trim() !== '') {
    return asNumber;
  }
  return input;
}

/**
 * Hook for managing node editing state and draft values.
 * Prevents selection loss and provides type-safe value parsing.
 */
export function useNodeEditing(
  node: Node | null,
  properties: NodePropertiesViewModel | null,
  onEditIntent?: NodeEditIntentHandler,
  onDraftChange?: () => void,
): NodeEditingState {
  const [draftKey, setDraftKeyState] = useState<string | null>(null);
  const [draftValue, setDraftValueState] = useState<string | null>(null);
  const valueCommitTimerRef = useRef<number | undefined>(undefined);

  const nodeId = node?.id ?? null;
  const currentDetails = properties?.details ?? null;
  const renderedValuePreview = properties?.renderedValuePreview ?? null;

  useEffect(() => {
    if (nodeId) {
      setDraftKeyState(null);
      if (valueCommitTimerRef.current !== undefined) {
        window.clearTimeout(valueCommitTimerRef.current);
        valueCommitTimerRef.current = undefined;
      }
      setDraftValueState(null);
    }
  }, [nodeId]);

  const _setDraftKey = useCallback(
    (value: string) => {
      setDraftKeyState(value);
      onDraftChange?.();
    },
    [onDraftChange],
  );

  const _setDraftValue = useCallback(
    (value: string) => {
      setDraftValueState(value);
      onDraftChange?.();
    },
    [onDraftChange],
  );

  const _handleKeyCommit = useCallback(() => {
    if (!nodeId || !currentDetails || !onEditIntent || draftKey == null) {
      return;
    }
    const nextKey = draftKey.trim();
    if (!nextKey || nextKey === currentDetails.key) {
      return;
    }
    onEditIntent({
      nodeId,
      type: 'rename-key',
      newKey: nextKey,
    });
    setDraftKeyState(null);
  }, [currentDetails, draftKey, nodeId, onEditIntent]);

  const handleValueCommitCore = useCallback(() => {
    if (
      !nodeId ||
      renderedValuePreview === null ||
      !onEditIntent ||
      draftValue == null
    ) {
      return;
    }

    // Parse using the current value's type (type-aware)
    const parsedValue = parseInputValue(draftValue, renderedValuePreview);

    // Prevent no-op updates (value unchanged after parsing)
    if (parsedValue === renderedValuePreview) {
      setDraftValueState(null);
      return;
    }

    // Send change-value intent with parsed value
    onEditIntent({
      nodeId,
      type: 'change-value',
      newValue: parsedValue,
    });
    setDraftValueState(null);
  }, [draftValue, nodeId, onEditIntent, renderedValuePreview]);

  const _handleValueCommit = useCallback(() => {
    if (valueCommitTimerRef.current !== undefined) {
      window.clearTimeout(valueCommitTimerRef.current);
    }
    valueCommitTimerRef.current = window.setTimeout(handleValueCommitCore, 300);
  }, [handleValueCommitCore]);

  const _handleCreateChild = useCallback(
    (key?: string, valueInput?: string) => {
      if (!nodeId || !onEditIntent) {
        return;
      }
      const trimmedKey = key?.trim();
      onEditIntent({
        nodeId,
        type: 'create-child',
        key: trimmedKey && trimmedKey.length > 0 ? trimmedKey : undefined,
        value:
          typeof valueInput === 'string'
            ? parseLooseInputValue(valueInput)
            : undefined,
      });
    },
    [nodeId, onEditIntent],
  );
  if (valueCommitTimerRef.current !== undefined) {
    window.clearTimeout(valueCommitTimerRef.current);
  }
  useEffect(() => {
    return () => {
      if (valueCommitTimerRef.current !== undefined) {
        window.clearTimeout(valueCommitTimerRef.current);
      }
    };
  }, []);

  const _handleDeleteNode = useCallback(() => {
    if (!nodeId || !onEditIntent) {
      return;
    }
    onEditIntent({ nodeId, type: 'delete-node' });
  }, [nodeId, onEditIntent]);

  const _handleApplyChanges = useCallback(() => {
    _handleKeyCommit();
    if (valueCommitTimerRef.current !== undefined) {
      window.clearTimeout(valueCommitTimerRef.current);
      valueCommitTimerRef.current = undefined;
    }
    handleValueCommitCore();
  }, [_handleKeyCommit, handleValueCommitCore]);

  const keyInputValue = draftKey ?? currentDetails?.key ?? '';
  const valueInputValue = draftValue ?? renderedValuePreview ?? '';

  return {
    draftKey,
    draftValue,
    keyInputValue,
    valueInputValue,
    setDraftKey: _setDraftKey,
    setDraftValue: _setDraftValue,
    handleKeyCommit: _handleKeyCommit,
    handleValueCommit: _handleValueCommit,
    handleCreateChild: _handleCreateChild,
    handleDeleteNode: _handleDeleteNode,
    handleApplyChanges: _handleApplyChanges,
  };
}
