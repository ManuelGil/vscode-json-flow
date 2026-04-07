import { getVscodeApi } from '@webview/getVscodeApi';
import { extractKey } from '@webview/services/searchService';
import type { InternalNode } from '@xyflow/react';
import type { LucideIcon } from 'lucide-react';
import {
  Braces,
  Circle,
  Copy,
  Hash,
  List,
  Quote,
  ToggleLeft,
  X,
} from 'lucide-react';
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { NodePropertiesViewModel } from '../../hooks/useNodeProperties';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../molecules/Tabs';

function parsePrimitiveInput(valueInput: string): {
  isValid: boolean;
  parsedValue: unknown;
} {
  const trimmed = valueInput.trim();
  if (trimmed === 'null') {
    return { isValid: false, parsedValue: valueInput };
  }
  if (trimmed === 'true') {
    return { isValid: true, parsedValue: true };
  }
  if (trimmed === 'false') {
    return { isValid: true, parsedValue: false };
  }
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue)) {
      return { isValid: true, parsedValue: numericValue };
    }
  }
  return { isValid: true, parsedValue: valueInput };
}

function serializeFinalDraftValue(
  rawInput: string,
  parsedValue: unknown,
): string {
  if (typeof parsedValue === 'number' || typeof parsedValue === 'boolean') {
    return String(parsedValue);
  }
  return rawInput;
}

function decodePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function pointerDepth(pointer: string): number {
  if (pointer === '/') {
    return 0;
  }
  return pointer.split('/').length - 1;
}

function isDirectChildPointer(
  parentPointer: string,
  candidate: string,
): boolean {
  if (!candidate.startsWith('/')) {
    return false;
  }

  const expectedDepth = pointerDepth(parentPointer) + 1;
  if (pointerDepth(candidate) !== expectedDepth) {
    return false;
  }

  if (parentPointer === '/') {
    return true;
  }

  return candidate.startsWith(`${parentPointer}/`);
}

function pointerLastToken(pointer: string): string {
  if (pointer === '/') {
    return '';
  }
  return decodePointerToken(pointer.slice(pointer.lastIndexOf('/') + 1));
}

interface NodePropertiesContentProps {
  displayKey: string;
  properties: NodePropertiesViewModel;
  allNodes?: InternalNode[];
  onClose: () => void;
  canEdit: boolean;
  languageId: string;
  onFocusNode?: (nodeId: string) => void;
}

const EDITABLE_FORMATS = new Set(['json', 'jsonc', 'json5']);

type PendingAction = 'apply' | 'rename' | 'add' | 'delete' | null;

function successLabelForAction(action: Exclude<PendingAction, null>): string {
  if (action === 'rename') {
    return '✔ Renamed';
  }
  return '✔ Updated';
}

export const NodePropertiesContent = memo(
  ({
    displayKey,
    properties,
    allNodes,
    onClose,
    canEdit,
    languageId,
    onFocusNode,
  }: NodePropertiesContentProps) => {
    const valueInputId = 'node-properties-value-input';
    const keyInputId = 'node-properties-key-input';
    const addKeyInputId = 'node-properties-add-key-input';
    const addValueInputId = 'node-properties-add-value-input';

    const {
      details,
      depth,
      renderedValuePreview,
      isValueMultiline,
      parentPointerValue,
      pathValue,
      childPointers,
    } = properties;

    const [valueInput, setValueInput] = useState<string>(renderedValuePreview);
    const [keyInput, setKeyInput] = useState<string>(displayKey);
    const [addKeyInput, setAddKeyInput] = useState<string>('');
    const [addValueInput, setAddValueInput] = useState<string>('');
    const [copiedPointer, setCopiedPointer] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successLabel, setSuccessLabel] = useState<string>('');
    const [isApplying, setIsApplying] = useState<boolean>(false);
    const [pendingRequestId, setPendingRequestId] = useState<string | null>(
      null,
    );
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const [selectedAction, setSelectedAction] = useState<
      'apply' | 'rename' | 'add' | 'delete' | null
    >(null);
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const isEditingRef = useRef<boolean>(false);
    const submittedValueRef = useRef<string | null>(null);
    const submittedKeyRef = useRef<string | null>(null);
    const latestDisplayKeyRef = useRef<string>(displayKey);
    const latestRenderedValuePreviewRef = useRef<string>(renderedValuePreview);

    const normalizedLanguageId = languageId.toLowerCase();
    const isEditableFormat =
      canEdit && EDITABLE_FORMATS.has(normalizedLanguageId);

    useEffect(() => {
      latestDisplayKeyRef.current = displayKey;
      latestRenderedValuePreviewRef.current = renderedValuePreview;
    }, [displayKey, renderedValuePreview]);

    useEffect(() => {
      if (!pathValue) {
        return;
      }

      setValueInput(latestRenderedValuePreviewRef.current);
      setKeyInput(latestDisplayKeyRef.current);
      setAddKeyInput('');
      setAddValueInput('');
      setError(null);
      setSuccessLabel('');
      setIsApplying(false);
      setPendingRequestId(null);
      setPendingAction(null);
      setConfirmDelete(false);
      submittedValueRef.current = null;
      submittedKeyRef.current = null;
      isEditingRef.current = false;
    }, [pathValue]);

    useEffect(() => {
      if (isEditingRef.current) {
        return;
      }

      setValueInput(renderedValuePreview);
      setKeyInput(displayKey);
    }, [displayKey, renderedValuePreview]);

    useEffect(() => {
      if (!copiedPointer) {
        return;
      }
      const timer = window.setTimeout(() => setCopiedPointer(false), 1200);
      return () => window.clearTimeout(timer);
    }, [copiedPointer]);

    const isPrimitiveType =
      details.type === 'string' ||
      details.type === 'number' ||
      details.type === 'boolean';
    const isObjectType = details.type === 'object';
    const isArrayType = details.type === 'array';
    const isContainerType = isObjectType || isArrayType;

    const isRoot = pathValue === '/';
    const hasParent = Boolean(parentPointerValue);

    const parentIsObject = useMemo(() => {
      if (!parentPointerValue || !allNodes?.length) {
        return false;
      }
      const parentNode = allNodes.find(
        (node) => node.id === parentPointerValue,
      );
      const label = String(
        (parentNode?.data as { label?: string } | undefined)?.label ?? '',
      ).trim();
      return label.startsWith('{') || label.toLowerCase().includes('object');
    }, [allNodes, parentPointerValue]);

    const parsedValueInput = useMemo(
      () => parsePrimitiveInput(valueInput),
      [valueInput],
    );
    const parsedAddValue = useMemo(
      () => parsePrimitiveInput(addValueInput),
      [addValueInput],
    );

    const keyTrimmed = keyInput.trim();
    const keyChanged = keyTrimmed.length > 0 && keyTrimmed !== displayKey;
    const addKeyTrimmed = addKeyInput.trim();

    const siblingKeys = useMemo(() => {
      if (!parentPointerValue || !allNodes?.length || !parentIsObject) {
        return new Set<string>();
      }

      const keys = new Set<string>();
      for (const node of allNodes) {
        if (!isDirectChildPointer(parentPointerValue, node.id)) {
          continue;
        }
        const siblingKey =
          typeof (node.data as { key?: unknown } | undefined)?.key === 'string'
            ? String((node.data as { key?: string }).key)
            : extractKey(String(node.data?.label ?? ''));
        keys.add(siblingKey.trim());
      }
      return keys;
    }, [allNodes, parentIsObject, parentPointerValue]);

    const objectChildKeys = useMemo(() => {
      if (!isObjectType) {
        return new Set<string>();
      }
      const keys = new Set<string>();
      for (const childPointer of childPointers) {
        keys.add(pointerLastToken(childPointer));
      }
      return keys;
    }, [childPointers, isObjectType]);

    const keyInvalid =
      parentIsObject && hasParent && !isRoot && keyTrimmed.length === 0;
    const keyDuplicate =
      parentIsObject &&
      hasParent &&
      !isRoot &&
      keyChanged &&
      siblingKeys.has(keyTrimmed);

    const valueInvalid = isPrimitiveType && !parsedValueInput.isValid;

    const addKeyInvalid = isObjectType && addKeyTrimmed.length === 0;
    const addKeyDuplicate = isObjectType && objectChildKeys.has(addKeyTrimmed);
    const addValueInvalid = !parsedAddValue.isValid;
    const addValueEmpty = addValueInput.trim().length === 0;

    const canApplyValue = isEditableFormat && isPrimitiveType && !valueInvalid;

    const canRename =
      isEditableFormat &&
      hasParent &&
      parentIsObject &&
      !isRoot &&
      !keyInvalid &&
      !keyDuplicate;

    const canAdd =
      isEditableFormat &&
      isContainerType &&
      !addValueInvalid &&
      !addValueEmpty &&
      (isArrayType || (!addKeyInvalid && !addKeyDuplicate));

    const canDelete = isEditableFormat && !isRoot;

    const availableActions = useMemo(
      () => ({
        apply: isPrimitiveType,
        rename: hasParent && parentIsObject && !isRoot,
        add: isContainerType,
        delete: !isRoot,
      }),
      [hasParent, isContainerType, isPrimitiveType, isRoot, parentIsObject],
    );

    const defaultAction = useMemo(() => {
      if (availableActions.apply) {
        return 'apply';
      }
      if (availableActions.rename) {
        return 'rename';
      }
      if (availableActions.add) {
        return 'add';
      }
      if (availableActions.delete) {
        return 'delete';
      }
      return null;
    }, [availableActions]);

    useEffect(() => {
      if (selectedAction && availableActions[selectedAction]) {
        return;
      }

      setSelectedAction(defaultAction);
    }, [availableActions, defaultAction, selectedAction]);

    useEffect(() => {
      if (!successLabel) {
        return;
      }

      const timer = window.setTimeout(() => setSuccessLabel(''), 1500);
      return () => window.clearTimeout(timer);
    }, [successLabel]);

    useEffect(() => {
      const onMessage = (event: MessageEvent) => {
        const message = event.data;
        if (message?.type !== 'mutationDiagnostics') {
          return;
        }

        if (pendingRequestId && message.requestId !== pendingRequestId) {
          return;
        }

        setIsApplying(false);
        setPendingRequestId(null);

        if (message.success) {
          setError(null);
          isEditingRef.current = false;
          if (pendingAction) {
            setSuccessLabel(successLabelForAction(pendingAction));

            if (pendingAction === 'apply') {
              if (submittedValueRef.current !== null) {
                setValueInput(submittedValueRef.current);
              }
            }

            if (pendingAction === 'rename') {
              if (submittedKeyRef.current !== null) {
                setKeyInput(submittedKeyRef.current);
              }
            }

            if (onFocusNode) {
              const nextFocusId =
                pendingAction === 'delete' && parentPointerValue
                  ? parentPointerValue
                  : pathValue;

              try {
                if (nextFocusId !== pathValue) {
                  onFocusNode(nextFocusId);
                }
              } catch {
                // Keep mutation flow deterministic even if focus fails.
              }
            }
          }
          submittedValueRef.current = null;
          submittedKeyRef.current = null;
          if (pendingAction === 'delete') {
            setConfirmDelete(false);
          }
          setPendingAction(null);
          return;
        }

        const error = String(message.error ?? 'UNKNOWN');
        if (error === 'DUPLICATE_KEY') {
          setError('A property with this name already exists');
        } else if (error === 'TYPE_MISMATCH') {
          setError('Invalid value type');
        } else if (error === 'INVALID_TARGET') {
          setError('This action is not allowed here');
        } else if (error === 'Unable to apply change safely') {
          setError('Unable to apply change safely');
        } else if (error === 'This action is not valid for this node') {
          setError('This action is not valid for this node');
        } else if (error === 'Unsupported node type') {
          setError('Unsupported node type');
        } else if (error === 'A key with this name already exists') {
          setError('A key with this name already exists');
        } else {
          setError(error);
        }
        submittedValueRef.current = null;
        submittedKeyRef.current = null;
        setPendingAction(null);
      };

      window.addEventListener('message', onMessage);
      return () => window.removeEventListener('message', onMessage);
    }, [
      onFocusNode,
      parentPointerValue,
      pathValue,
      pendingAction,
      pendingRequestId,
    ]);

    const onEditIntent = useCallback(
      (
        action: Exclude<PendingAction, null>,
        payload: Record<string, unknown>,
      ) => {
        const requestId = crypto.randomUUID();
        console.log('[UI] ACTION_CLICK', { action, payload, requestId });
        setIsApplying(true);
        setError(null);
        setSuccessLabel('');
        setPendingRequestId(requestId);
        setPendingAction(action);

        getVscodeApi().postMessage({
          type: 'nodeEditIntent',
          requestId,
          payload,
        });
      },
      [],
    );

    const handleCopyPointer = useCallback(() => {
      navigator.clipboard.writeText(pathValue);
      setCopiedPointer(true);
    }, [pathValue]);

    const handleApplyValue = useCallback(() => {
      if (!canApplyValue || valueInvalid) {
        if (valueInvalid) {
          setError('Invalid value format');
        }
        return;
      }

      const serializedFinalValue = serializeFinalDraftValue(
        valueInput,
        parsedValueInput.parsedValue,
      );
      if (serializedFinalValue === renderedValuePreview) {
        setError(null);
        setSuccessLabel('Nothing changed');
        isEditingRef.current = false;
        return;
      }

      isEditingRef.current = true;
      submittedValueRef.current = serializedFinalValue;

      onEditIntent('apply', {
        nodeId: pathValue,
        type: 'change-value' as const,
        newValue: parsedValueInput.parsedValue,
      });
    }, [
      canApplyValue,
      parsedValueInput.parsedValue,
      pathValue,
      onEditIntent,
      renderedValuePreview,
      valueInput,
      valueInvalid,
    ]);

    const handleRename = useCallback(() => {
      if (!canRename) {
        if (keyInvalid) {
          setError('Key cannot be empty');
        } else if (keyDuplicate) {
          setError('A property with this name already exists');
        }
        return;
      }

      const normalizedNewKey = keyTrimmed;
      if (normalizedNewKey === displayKey.trim()) {
        setError(null);
        setSuccessLabel('Nothing changed');
        isEditingRef.current = false;
        return;
      }

      isEditingRef.current = true;
      submittedKeyRef.current = normalizedNewKey;

      onEditIntent('rename', {
        nodeId: pathValue,
        type: 'rename-key' as const,
        newKey: normalizedNewKey,
      });
    }, [
      canRename,
      displayKey,
      keyDuplicate,
      keyInvalid,
      keyTrimmed,
      pathValue,
      onEditIntent,
    ]);

    const handleAdd = useCallback(() => {
      if (!canAdd) {
        if (addValueInvalid) {
          setError('Invalid value format');
        } else if (addValueEmpty) {
          setError('Value cannot be empty');
        } else if (addKeyInvalid) {
          setError('Key cannot be empty');
        } else if (addKeyDuplicate) {
          setError('A property with this name already exists');
        }
        return;
      }

      isEditingRef.current = true;

      if (isObjectType) {
        onEditIntent('add', {
          nodeId: pathValue,
          type: 'create-child' as const,
          key: addKeyTrimmed,
          value: parsedAddValue.parsedValue,
        });
        return;
      }

      onEditIntent('add', {
        nodeId: pathValue,
        type: 'create-child' as const,
        value: parsedAddValue.parsedValue,
      });
    }, [
      addKeyDuplicate,
      addKeyInvalid,
      addKeyTrimmed,
      addValueEmpty,
      addValueInvalid,
      canAdd,
      isObjectType,
      parsedAddValue.parsedValue,
      pathValue,
      onEditIntent,
    ]);

    const handleDelete = useCallback(() => {
      if (!canDelete) {
        return;
      }

      if (!confirmDelete) {
        setError('Please confirm before deleting');
        return;
      }

      isEditingRef.current = true;
      onEditIntent('delete', {
        nodeId: pathValue,
        type: 'delete-node' as const,
      });
    }, [canDelete, confirmDelete, pathValue, onEditIntent]);

    const renderActionForm = () => {
      if (!selectedAction) {
        return (
          <p className="text-xs text-muted-foreground">
            Select an action to edit this node.
          </p>
        );
      }

      if (selectedAction === 'apply') {
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Update the value of this node.
            </p>
            {isPrimitiveType && (
              <div className="space-y-2">
                <label
                  htmlFor={valueInputId}
                  className="text-xs font-semibold text-foreground"
                >
                  Value
                </label>
                {isValueMultiline ? (
                  <textarea
                    id={valueInputId}
                    value={valueInput}
                    onChange={(event) => {
                      isEditingRef.current = true;
                      setError(null);
                      setValueInput(event.target.value);
                    }}
                    disabled={isApplying}
                    placeholder="Enter value"
                    className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                ) : (
                  <Input
                    id={valueInputId}
                    value={valueInput}
                    onChange={(event) => {
                      isEditingRef.current = true;
                      setError(null);
                      setValueInput(event.target.value);
                    }}
                    disabled={isApplying}
                    placeholder="Enter value"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Enter a string, number, or boolean value.
                </p>
                {valueInvalid && (
                  <p className="text-xs text-destructive">
                    Invalid value format
                  </p>
                )}
              </div>
            )}

            <Button
              variant="default"
              type="button"
              disabled={!canApplyValue}
              onClick={handleApplyValue}
              className="w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplying && pendingAction === 'apply'
                ? 'Applying...'
                : 'Apply Value'}
            </Button>
          </div>
        );
      }

      if (selectedAction === 'rename') {
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Change the property name.
            </p>
            <div className="space-y-2">
              <label
                htmlFor={keyInputId}
                className="text-xs font-semibold text-foreground"
              >
                Key
              </label>
              <Input
                id={keyInputId}
                value={keyInput}
                onChange={(event) => {
                  isEditingRef.current = true;
                  setError(null);
                  setKeyInput(event.target.value);
                }}
                disabled={isApplying}
                placeholder="Enter key"
              />
              {keyInvalid && (
                <p className="text-xs text-destructive">Key cannot be empty</p>
              )}
              {keyDuplicate && (
                <p className="text-xs text-destructive">Key already exists</p>
              )}
            </div>

            <Button
              variant="secondary"
              type="button"
              disabled={!canRename}
              onClick={handleRename}
              className="w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplying && pendingAction === 'rename'
                ? 'Renaming...'
                : 'Rename Key'}
            </Button>
          </div>
        );
      }

      if (selectedAction === 'add') {
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Insert a new child node.
            </p>
            {isObjectType && (
              <div className="space-y-2">
                <label
                  htmlFor={addKeyInputId}
                  className="text-xs font-semibold text-foreground"
                >
                  Key
                </label>
                <Input
                  id={addKeyInputId}
                  value={addKeyInput}
                  onChange={(event) => {
                    isEditingRef.current = true;
                    setError(null);
                    setAddKeyInput(event.target.value);
                  }}
                  disabled={isApplying}
                  placeholder="Enter key"
                />
                {addKeyInvalid && (
                  <p className="text-xs text-destructive">
                    Key cannot be empty
                  </p>
                )}
                {addKeyDuplicate && (
                  <p className="text-xs text-destructive">Key already exists</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor={addValueInputId}
                className="text-xs font-semibold text-foreground"
              >
                Value
              </label>
              <Input
                id={addValueInputId}
                value={addValueInput}
                onChange={(event) => {
                  isEditingRef.current = true;
                  setError(null);
                  setAddValueInput(event.target.value);
                }}
                disabled={isApplying}
                placeholder="Enter value"
              />
              <p className="text-xs text-muted-foreground">
                Enter a string, number, or boolean value.
              </p>
              {addValueInvalid && (
                <p className="text-xs text-destructive">Invalid value format</p>
              )}
            </div>

            <Button
              variant="secondary"
              type="button"
              disabled={!canAdd}
              onClick={handleAdd}
              className="w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplying && pendingAction === 'add' ? 'Adding...' : 'Add Node'}
            </Button>
          </div>
        );
      }

      if (selectedAction === 'delete') {
        return (
          <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
            <p className="text-xs text-red-800 dark:text-red-200">
              Remove this node.
            </p>
            <p className="text-xs font-medium text-red-900 dark:text-red-100">
              Are you sure you want to delete this node?
            </p>
            <label className="flex items-center gap-2 text-xs text-red-900 dark:text-red-100">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(event) => {
                  setError(null);
                  setConfirmDelete(event.target.checked);
                }}
                disabled={isApplying}
              />
              Confirm deletion
            </label>
            <Button
              variant="destructive"
              type="button"
              className="w-full disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleDelete}
              disabled={!canDelete || !confirmDelete}
            >
              {isApplying && pendingAction === 'delete'
                ? 'Deleting...'
                : 'Delete Node'}
            </Button>
          </div>
        );
      }

      return null;
    };

    return (
      <aside className="flex w-[360px] flex-col rounded-lg border border-border bg-card shadow-sm">
        <header className="flex items-start justify-between border-b border-border px-5 py-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Node Properties
            </p>
            <p className="text-xs text-muted-foreground">
              Inspect node details and run explicit edit actions
            </p>
            <div className="pt-1">
              <TypeBadge typeLabel={details.type} />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Close properties"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <Tabs defaultValue="info" className="flex flex-1 flex-col">
          <TabsList className="mx-5 mt-4 grid grid-cols-2">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>

          <TabsContent
            value="info"
            className="mt-0 space-y-6 overflow-y-auto px-5 py-5"
          >
            <section className="space-y-3 border-b border-border pb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Identity
              </p>
              <div className="space-y-2.5">
                <DetailRow label="Key" value={displayKey} />
                <DetailRow
                  label="Type"
                  value={<TypeBadge typeLabel={details.type} />}
                />
                <DetailRow
                  label="Pointer"
                  value={
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {pathValue}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyPointer}
                        className="h-7 px-2"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span className="ml-1 text-xs">
                          {copiedPointer ? 'Copied' : 'Copy Path'}
                        </span>
                      </Button>
                    </div>
                  }
                />
              </div>
            </section>

            <section className="space-y-3 border-b border-border pb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Value
              </p>
              <DetailRow
                label="Preview"
                value={
                  isPrimitiveType ? (
                    <span className="break-words text-muted-foreground">
                      {renderedValuePreview}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Container node
                    </span>
                  )
                }
              />
              {details.type === 'string' && (
                <DetailRow
                  label="Length"
                  value={String(Math.max(0, renderedValuePreview.length - 2))}
                />
              )}
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Structure
              </p>
              <DetailRow label="Children" value={String(details.childCount)} />
              <DetailRow label="Depth" value={String(depth)} />
              <DetailRow
                label="Parent"
                value={
                  parentPointerValue ? (
                    <span className="break-words text-muted-foreground">
                      {parentPointerValue}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )
                }
              />
              {details.lineNumber !== undefined && (
                <DetailRow
                  label="Metadata"
                  value={`Line ${details.lineNumber}`}
                />
              )}
            </section>
          </TabsContent>

          <TabsContent
            value="edit"
            className="mt-0 space-y-5 overflow-y-auto px-5 py-5"
          >
            {!isEditableFormat && (
              <section className="space-y-2 rounded-md border border-muted bg-muted/40 px-3 py-3">
                <p className="text-xs font-semibold text-foreground">
                  Read-only mode
                </p>
                <p className="text-xs text-muted-foreground">
                  Editing is available only for json, jsonc, and json5 files.
                </p>
              </section>
            )}

            {isEditableFormat && (
              <section className="space-y-4 rounded-md border border-border px-4 py-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {availableActions.apply && (
                      <Button
                        variant={
                          selectedAction === 'apply' ? 'default' : 'secondary'
                        }
                        type="button"
                        disabled={isApplying}
                        onClick={() => {
                          setError(null);
                          setSelectedAction('apply');
                        }}
                        className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit Value
                      </Button>
                    )}

                    {availableActions.rename && (
                      <Button
                        variant={
                          selectedAction === 'rename' ? 'default' : 'secondary'
                        }
                        type="button"
                        disabled={isApplying}
                        onClick={() => {
                          setError(null);
                          setSelectedAction('rename');
                        }}
                        className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Rename
                      </Button>
                    )}

                    {availableActions.add && (
                      <Button
                        variant={
                          selectedAction === 'add' ? 'default' : 'secondary'
                        }
                        type="button"
                        disabled={isApplying}
                        onClick={() => {
                          setError(null);
                          setSelectedAction('add');
                        }}
                        className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add
                      </Button>
                    )}

                    {availableActions.delete && (
                      <Button
                        variant={
                          selectedAction === 'delete'
                            ? 'destructive'
                            : 'secondary'
                        }
                        type="button"
                        disabled={isApplying}
                        onClick={() => {
                          setError(null);
                          setSelectedAction('delete');
                        }}
                        className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Actions
                    </p>
                    {successLabel && (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100">
                        {successLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-4">
                  {renderActionForm()}
                </div>

                {error && (
                  <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                    <p className="text-xs font-medium text-red-900 dark:text-red-100">
                      Error
                    </p>
                    <p className="text-xs text-red-800 dark:text-red-200">
                      {error}
                    </p>
                  </div>
                )}
              </section>
            )}
          </TabsContent>
        </Tabs>
      </aside>
    );
  },
);

NodePropertiesContent.displayName = 'NodePropertiesContent';

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-start gap-4 py-0.5">
      <span className="text-xs font-medium leading-tight text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 text-sm font-medium leading-tight">{value}</div>
    </div>
  );
}

interface TypeBadgeProps {
  typeLabel: string;
}

const typeIconMap: Record<string, LucideIcon> = {
  object: Braces,
  array: List,
  string: Quote,
  number: Hash,
  boolean: ToggleLeft,
  null: Circle,
};

function TypeBadge({ typeLabel }: TypeBadgeProps) {
  const normalizedType = typeLabel?.toLowerCase?.() ?? '';
  const IconComponent = typeIconMap[normalizedType] ?? Circle;

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <IconComponent className="h-3 w-3" aria-hidden />
      <span className="capitalize">{typeLabel}</span>
    </span>
  );
}
