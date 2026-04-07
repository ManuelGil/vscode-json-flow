import { getVscodeApi } from '@webview/getVscodeApi';
import type { LucideIcon } from 'lucide-react';
import {
  Braces,
  Check,
  Circle,
  Copy,
  Hash,
  List,
  Quote,
  ToggleLeft,
  X,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { NodePropertiesViewModel } from '../../hooks/useNodeProperties';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../molecules/Tabs';

function parseValueInput(
  valueInput: string,
  type: string,
): { isValid: boolean; parsedValue: unknown } {
  if (type === 'number') {
    const trimmed = valueInput.trim();
    if (trimmed.length === 0) {
      return { isValid: false, parsedValue: valueInput };
    }
    const numericValue = Number(trimmed);
    if (!Number.isFinite(numericValue)) {
      return { isValid: false, parsedValue: valueInput };
    }
    return { isValid: true, parsedValue: numericValue };
  }

  if (type === 'boolean') {
    const normalized = valueInput.trim().toLowerCase();
    if (normalized === 'true') {
      return { isValid: true, parsedValue: true };
    }
    if (normalized === 'false') {
      return { isValid: true, parsedValue: false };
    }
    return { isValid: false, parsedValue: valueInput };
  }

  return { isValid: true, parsedValue: valueInput };
}

function parseCreatePrimitiveInput(valueInput: string): {
  isValid: boolean;
  parsedValue: unknown;
} {
  const trimmed = valueInput.trim();
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

interface NodePropertiesContentProps {
  displayKey: string;
  properties: NodePropertiesViewModel;
  onClose: () => void;
  canEdit: boolean;
}

type LastAction = 'change' | 'delete' | 'create' | null;

export const NodePropertiesContent = memo(
  ({
    displayKey,
    properties,
    onClose,
    canEdit,
  }: NodePropertiesContentProps) => {
    const valueInputId = 'node-properties-value-input';
    const keyInputId = 'node-properties-key-input';
    const createKeyInputId = 'node-properties-create-key-input';
    const createValueInputId = 'node-properties-create-value-input';

    const {
      details,
      depth,
      renderedValuePreview,
      isValueMultiline,
      parentPointerValue,
      pathValue,
    } = properties;

    const [valueInput, setValueInput] = useState<string>(renderedValuePreview);
    const [keyInput, setKeyInput] = useState<string>(displayKey);
    const [createKeyInput, setCreateKeyInput] = useState<string>('');
    const [createValueInput, setCreateValueInput] = useState<string>('');
    const [copiedPointer, setCopiedPointer] = useState<boolean>(false);
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isMutating, setIsMutating] = useState<boolean>(false);
    const [errorText, setErrorText] = useState<string>('');
    const [lastAction, setLastAction] = useState<LastAction>(null);

    useEffect(() => {
      setValueInput(renderedValuePreview);
      setKeyInput(displayKey);
      setConfirmDelete(false);
      setErrorText('');
      setLastAction(null);
    }, [displayKey, renderedValuePreview]);

    useEffect(() => {
      if (!copiedPointer) {
        return;
      }
      const timer = window.setTimeout(() => setCopiedPointer(false), 1500);
      return () => window.clearTimeout(timer);
    }, [copiedPointer]);

    useEffect(() => {
      const onMessage = (event: MessageEvent) => {
        const message = event.data;

        if (message?.type !== 'mutationDiagnostics') {
          return;
        }

        setIsMutating(false);
        if (message.success) {
          setErrorText('');
          setConfirmDelete(false);
          if (lastAction === 'create') {
            setCreateKeyInput('');
            setCreateValueInput('');
          }
          if (lastAction === 'delete') {
            setValueInput('');
            setKeyInput('');
            setCreateKeyInput('');
            setCreateValueInput('');
          }
          setLastAction(null);
          return;
        }

        const error = String(message.error ?? 'UNKNOWN');
        if (error === 'DUPLICATE_KEY') {
          setErrorText('Property name already exists at this level');
        } else if (error === 'TYPE_MISMATCH') {
          setErrorText('Only string, number, or boolean values are allowed');
        } else {
          setErrorText('Unable to apply this change');
        }
      };

      window.addEventListener('message', onMessage);
      return () => window.removeEventListener('message', onMessage);
    }, [lastAction]);

    const isPrimitiveType =
      details.type === 'string' ||
      details.type === 'number' ||
      details.type === 'boolean';
    const isContainerType =
      details.type === 'object' || details.type === 'array';

    const canEditPrimitive = canEdit && isPrimitiveType;
    const canCreateContainer = canEdit && isContainerType && !isMutating;

    const isRoot = pathValue === '/';
    const validPointer =
      typeof pathValue === 'string' && pathValue.startsWith('/');
    const hasParent = Boolean(parentPointerValue);
    const canDelete = !isRoot && hasParent && validPointer && !isMutating;

    const parsedValueInput = useMemo(
      () => parseValueInput(valueInput, details.type),
      [details.type, valueInput],
    );

    const parsedCreateValue = useMemo(
      () => parseCreatePrimitiveInput(createValueInput),
      [createValueInput],
    );

    const keyTrimmed = keyInput.trim();
    const keyChanged = keyTrimmed.length > 0 && keyTrimmed !== displayKey;
    const isObjectParent = hasParent && isPrimitiveType;
    const keyInvalid =
      isObjectParent && keyInput.length > 0 && keyTrimmed.length === 0;

    const valueChanged = valueInput !== renderedValuePreview;
    const valueInvalid = isPrimitiveType && !parsedValueInput.isValid;

    const canRename =
      canEditPrimitive && isObjectParent && keyChanged && !keyInvalid;
    const canChangeValue =
      canEditPrimitive && valueChanged && parsedValueInput.isValid;
    const canSubmit = !isMutating && (canRename || canChangeValue);

    const createKeyTrimmed = createKeyInput.trim();
    const createKeyInvalid =
      details.type === 'object' &&
      createKeyInput.length > 0 &&
      createKeyTrimmed.length === 0;
    const createValueInvalid =
      createValueInput.length > 0 && !parsedCreateValue.isValid;

    const canCreateChild =
      canCreateContainer &&
      parsedCreateValue.isValid &&
      (details.type === 'array'
        ? createValueInput.length > 0
        : createKeyTrimmed.length > 0 && createValueInput.length > 0);

    const handleCopyPointer = useCallback(() => {
      navigator.clipboard.writeText(pathValue);
      setCopiedPointer(true);
    }, [pathValue]);

    const applyChanges = useCallback(() => {
      if (!canEditPrimitive || !canSubmit) {
        return;
      }

      if (isObjectParent && keyInput.length > 0 && keyTrimmed.length === 0) {
        setErrorText('Property name cannot be empty');
        return;
      }

      if (isPrimitiveType && !parsedValueInput.isValid) {
        setErrorText('New value is invalid for this type');
        return;
      }

      setIsMutating(true);
      setErrorText('');
      setLastAction('change');
      const vscode = getVscodeApi();

      if (canRename) {
        vscode.postMessage({
          type: 'nodeEditIntent',
          requestId: crypto.randomUUID(),
          payload: {
            nodeId: pathValue,
            type: 'rename-key' as const,
            newKey: keyTrimmed,
          },
        });
      }

      if (canChangeValue) {
        vscode.postMessage({
          type: 'nodeEditIntent',
          requestId: crypto.randomUUID(),
          payload: {
            nodeId: pathValue,
            type: 'change-value' as const,
            newValue: parsedValueInput.parsedValue,
          },
        });
      }
    }, [
      canChangeValue,
      canEditPrimitive,
      canRename,
      canSubmit,
      isObjectParent,
      isPrimitiveType,
      keyInput,
      keyTrimmed,
      parsedValueInput,
      pathValue,
    ]);

    const handleCreateChild = useCallback(() => {
      if (!canCreateChild) {
        return;
      }

      setIsMutating(true);
      setErrorText('');
      setLastAction('create');

      if (details.type === 'object') {
        getVscodeApi().postMessage({
          type: 'nodeEditIntent',
          requestId: crypto.randomUUID(),
          payload: {
            nodeId: pathValue,
            type: 'create-child' as const,
            key: createKeyTrimmed,
            value: parsedCreateValue.parsedValue,
          },
        });
        return;
      }

      getVscodeApi().postMessage({
        type: 'nodeEditIntent',
        requestId: crypto.randomUUID(),
        payload: {
          nodeId: pathValue,
          type: 'create-child' as const,
          value: parsedCreateValue.parsedValue,
        },
      });
    }, [
      canCreateChild,
      createKeyTrimmed,
      details.type,
      parsedCreateValue.parsedValue,
      pathValue,
    ]);

    const handleConfirmDelete = useCallback(() => {
      if (!canDelete) {
        return;
      }

      setIsMutating(true);
      setErrorText('');
      setLastAction('delete');
      getVscodeApi().postMessage({
        type: 'nodeEditIntent',
        requestId: crypto.randomUUID(),
        payload: {
          nodeId: pathValue,
          type: 'delete-node' as const,
        },
      });
    }, [canDelete, pathValue]);

    return (
      <aside className="flex w-[360px] flex-col rounded-lg border border-border bg-card shadow-sm">
        <header className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Node Properties
            </p>
            <div className="mt-1 flex items-center gap-2">
              <TypeBadge typeLabel={details.type} />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <Tabs defaultValue="info" className="flex flex-1 flex-col">
          <TabsList className="mx-4 mb-0 grid grid-cols-2">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-0 space-y-6 px-4 py-4">
            <section className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Identity
              </p>
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
                      {copiedPointer ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span className="ml-1 text-xs">Copied ✓</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="ml-1 text-xs">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                }
              />
            </section>

            <section className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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

            <section className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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

          <TabsContent value="edit" className="mt-0 space-y-4 px-4 py-4">
            {!canEdit && (
              <p className="text-xs text-muted-foreground">
                Editing available only for JSON files
              </p>
            )}

            {!isPrimitiveType && !isContainerType && canEdit && (
              <p className="text-xs text-destructive">
                Editing not supported for this node type
              </p>
            )}

            {isPrimitiveType && canEditPrimitive && (
              <>
                {isObjectParent && (
                  <div className="space-y-1">
                    <label
                      htmlFor={keyInputId}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Property name
                    </label>
                    <Input
                      id={keyInputId}
                      value={keyInput}
                      onChange={(event) => setKeyInput(event.target.value)}
                      disabled={isMutating}
                    />
                    {keyInvalid && (
                      <p className="text-xs text-destructive">
                        Property name cannot be empty
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor={valueInputId}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    New value
                  </label>
                  {isValueMultiline ? (
                    <textarea
                      id={valueInputId}
                      value={valueInput}
                      onChange={(event) => setValueInput(event.target.value)}
                      disabled={isMutating}
                      className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  ) : (
                    <Input
                      id={valueInputId}
                      value={valueInput}
                      onChange={(event) => setValueInput(event.target.value)}
                      disabled={isMutating}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Allowed: string, number, boolean
                  </p>
                  {valueInvalid && (
                    <p className="text-xs text-destructive">
                      New value is invalid for this type
                    </p>
                  )}
                </div>

                <Button
                  variant="default"
                  type="button"
                  disabled={!canSubmit}
                  onClick={applyChanges}
                  className="w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apply
                </Button>
              </>
            )}

            {isContainerType && (
              <>
                {details.type === 'object' && (
                  <div className="space-y-1">
                    <label
                      htmlFor={createKeyInputId}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Property name
                    </label>
                    <Input
                      id={createKeyInputId}
                      value={createKeyInput}
                      onChange={(event) =>
                        setCreateKeyInput(event.target.value)
                      }
                      disabled={!canCreateContainer}
                    />
                    {createKeyInvalid && (
                      <p className="text-xs text-destructive">
                        Property name is required
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor={createValueInputId}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Value
                  </label>
                  <Input
                    id={createValueInputId}
                    value={createValueInput}
                    onChange={(event) =>
                      setCreateValueInput(event.target.value)
                    }
                    disabled={!canCreateContainer}
                    placeholder='e.g. "text", 123, true'
                  />
                  <p className="text-xs text-muted-foreground">
                    Allowed: string, number, boolean
                  </p>
                  {createValueInvalid && (
                    <p className="text-xs text-destructive">
                      Only primitive values are allowed
                    </p>
                  )}
                </div>

                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleCreateChild}
                  disabled={!canCreateChild}
                  className="w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add Child
                </Button>
              </>
            )}

            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Are you sure?</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="flex-1"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isMutating}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    type="button"
                    className="flex-1"
                    onClick={handleConfirmDelete}
                    disabled={!canDelete}
                  >
                    Confirm delete
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="destructive"
                type="button"
                className="w-full disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setConfirmDelete(true)}
                disabled={!canDelete}
              >
                Delete node
              </Button>
            )}

            {!canDelete && (
              <p className="text-xs text-muted-foreground">
                Cannot delete this node
              </p>
            )}

            {errorText && (
              <p className="text-xs text-destructive">{errorText}</p>
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
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-start gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm">{value}</div>
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
