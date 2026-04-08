import { getVscodeApi } from '@webview/getVscodeApi';
import type { InternalNode } from '@xyflow/react';
import {
  Braces,
  Check,
  Circle,
  Copy,
  Hash,
  List,
  LucideIcon,
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

type PendingAction = 'apply' | 'add' | 'delete' | null;

function successLabelForAction(_action: Exclude<PendingAction, null>): string {
  return '✔ Updated';
}

export const NodePropertiesContent = memo(
  ({
    displayKey,
    properties,
    onClose,
    canEdit,
    languageId,
    onFocusNode,
  }: NodePropertiesContentProps) => {
    const valueInputId = 'node-properties-value-input';
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
      'apply' | 'add' | 'delete' | null
    >(null);
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const isEditingRef = useRef<boolean>(false);
    const submittedValueRef = useRef<string | null>(null);
    const latestRenderedValuePreviewRef = useRef<string>(renderedValuePreview);

    const normalizedLanguageId = languageId.toLowerCase();
    const isEditableFormat =
      canEdit && EDITABLE_FORMATS.has(normalizedLanguageId);

    useEffect(() => {
      latestRenderedValuePreviewRef.current = renderedValuePreview;
    }, [renderedValuePreview]);

    useEffect(() => {
      if (!pathValue) {
        return;
      }

      setValueInput(latestRenderedValuePreviewRef.current);
      setAddKeyInput('');
      setAddValueInput('');
      setError(null);
      setSuccessLabel('');
      setIsApplying(false);
      setPendingRequestId(null);
      setPendingAction(null);
      setConfirmDelete(false);
      submittedValueRef.current = null;
      isEditingRef.current = false;
    }, [pathValue]);

    useEffect(() => {
      if (isEditingRef.current) {
        return;
      }

      setValueInput(renderedValuePreview);
    }, [renderedValuePreview]);

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
      details.type === 'boolean' ||
      details.type === 'null';
    const isObjectType = details.type === 'object';
    const isArrayType = details.type === 'array';
    const isContainerType = isObjectType || isArrayType;

    const isRoot = pathValue === '/';

    const parsedValueInput = useMemo(
      () => parsePrimitiveInput(valueInput),
      [valueInput],
    );
    const parsedAddValue = useMemo(
      () => parsePrimitiveInput(addValueInput),
      [addValueInput],
    );

    const addKeyTrimmed = addKeyInput.trim();

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

    const valueInvalid = isPrimitiveType && !parsedValueInput.isValid;

    const addKeyInvalid = isObjectType && addKeyTrimmed.length === 0;
    const addKeyDuplicate = isObjectType && objectChildKeys.has(addKeyTrimmed);
    const addValueInvalid = !parsedAddValue.isValid;
    const addValueEmpty = addValueInput.trim().length === 0;

    const canApplyValue = isEditableFormat && isPrimitiveType && !valueInvalid;

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
        add: isContainerType,
        delete: !isRoot,
      }),
      [isContainerType, isPrimitiveType, isRoot],
    );

    const defaultAction = useMemo(() => {
      if (availableActions.apply) {
        return 'apply';
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

    const handleRevealInEditor = useCallback(() => {
      if (!pathValue || typeof pathValue !== 'string') {
        return;
      }

      const vscode = getVscodeApi();
      vscode.postMessage({
        type: 'revealNodeInEditor',
        payload: {
          pointer: pathValue,
        },
      });
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

    const handleApplyChanges = useCallback(() => {
      const serializedFinalValue = serializeFinalDraftValue(
        valueInput,
        parsedValueInput.parsedValue,
      );
      const valueChanged =
        isPrimitiveType && serializedFinalValue !== renderedValuePreview;

      if (valueChanged) {
        handleApplyValue();
        return;
      }

      setError(null);
      setSuccessLabel('Nothing changed');
      isEditingRef.current = false;
    }, [
      handleApplyValue,
      isPrimitiveType,
      parsedValueInput.parsedValue,
      renderedValuePreview,
      valueInput,
    ]);

    const renderActionForm = () => {
      const renderDeleteAction = () => {
        if (!canDelete) {
          return null;
        }

        return (
          <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
            <p className="text-xs text-red-800 dark:text-red-200">
              Remove this node.
            </p>
            {!confirmDelete ? (
              <Button
                variant="destructive"
                type="button"
                className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  setError(null);
                  setConfirmDelete(true);
                }}
                disabled={!canDelete || isApplying}
              >
                Delete Node
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red-900 dark:text-red-100">
                  Are you sure you want to delete this node?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setError(null);
                      setConfirmDelete(false);
                    }}
                    disabled={isApplying}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    type="button"
                    className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleDelete}
                    disabled={!canDelete || isApplying}
                  >
                    {isApplying && pendingAction === 'delete'
                      ? 'Deleting...'
                      : 'Confirm Delete'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      };

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
              Update the value for this node.
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
              variant="secondary"
              type="button"
              disabled={isApplying || !isPrimitiveType}
              onClick={handleApplyChanges}
              className="w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplying
                ? pendingAction === 'apply'
                  ? 'Applying...'
                  : 'Applying...'
                : 'Apply Changes'}
            </Button>

            <div className="border-t border-border pt-4">
              {renderDeleteAction()}
            </div>
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
              {isApplying && pendingAction === 'add'
                ? 'Adding...'
                : 'Add Child'}
            </Button>

            <div className="border-t border-border pt-4">
              {renderDeleteAction()}
            </div>
          </div>
        );
      }

      if (selectedAction === 'delete') {
        return renderDeleteAction();
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
            <TabsTrigger value="info">Details</TabsTrigger>
            <TabsTrigger value="edit">Edit Node</TabsTrigger>
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRevealInEditor}
                          disabled={isRoot}
                          className="h-7 px-2 text-xs"
                          title="Reveal this node in the editor"
                        >
                          Reveal
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyPointer}
                          className="h-7 px-2"
                        >
                          {copiedPointer ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
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

                <div className="space-y-4 pt-4">{renderActionForm()}</div>

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
