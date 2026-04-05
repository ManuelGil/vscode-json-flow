import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Braces,
  Check,
  ChevronDown,
  Circle,
  Copy,
  Hash,
  List,
  Quote,
  ToggleLeft,
  X,
} from 'lucide-react';
import { memo, type ReactNode, useId, useMemo, useState } from 'react';
import type { NodeEditingState } from '../../hooks/useNodeEditing';
import type { NodePropertiesViewModel } from '../../hooks/useNodeProperties';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../molecules/Tabs';

interface NodePropertiesContentProps {
  displayKey: string;
  properties: NodePropertiesViewModel;
  editingState: NodeEditingState;
  copyStatus: 'idle' | 'copied' | 'error';
  onCopyPath: () => void;
  onClose: () => void;
  onNavigatePointer?: (pointer: string) => void;
  diagnosticWarnings?: Array<{ type: string; pointer: string }>;
  canEdit: boolean;
  onApplyVisualFeedback?: () => void;
}

const DEFAULT_TAB = 'properties';

export const NodePropertiesContent = memo(
  ({
    displayKey,
    properties,
    editingState,
    copyStatus,
    onCopyPath,
    onClose,
    onNavigatePointer,
    diagnosticWarnings,
    canEdit,
    onApplyVisualFeedback,
  }: NodePropertiesContentProps) => {
    const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);
    const [showAddChildForm, setShowAddChildForm] = useState<boolean>(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
    const [newChildKey, setNewChildKey] = useState<string>('');
    const [newChildValue, setNewChildValue] = useState<string>('');
    const [applyFlash, setApplyFlash] = useState<'idle' | 'success'>('idle');
    const keyInputId = useId();
    const valueInputId = useId();
    const newChildKeyInputId = useId();
    const newChildValueInputId = useId();

    const {
      details,
      pointerSegments,
      depth,
      indexInParent,
      childPointers,
      renderedValuePreview,
      isValueMultiline,
      parentPointerValue,
      pathValue,
    } = properties;

    const copyHelperText = useMemo(() => {
      if (copyStatus === 'copied') {
        return 'Copied to clipboard';
      }
      if (copyStatus === 'error') {
        return 'Copy failed';
      }
      return undefined;
    }, [copyStatus]);

    const diagnosticList = Array.isArray(diagnosticWarnings)
      ? diagnosticWarnings
      : [];
    const hasMutationWarning = diagnosticList.length > 0;
    const supportsChildren =
      details.type.toLowerCase() === 'object' ||
      details.type.toLowerCase() === 'array';
    const isContainerType = supportsChildren;
    const canAddChild = canEdit && supportsChildren;

    const handleApplyClick = () => {
      if (!canEdit) {
        return;
      }

      editingState.handleApplyChanges();
      onApplyVisualFeedback?.();
      setApplyFlash('success');
      window.setTimeout(() => setApplyFlash('idle'), 1200);
    };

    return (
      <aside className="min-w-[380px] max-w-[560px] rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-3 border-b border-border/60 pb-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Node inspector
              </p>
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
                <span className="truncate">{displayKey}</span>
                <TypeBadge typeLabel={details.type} />
              </h2>
            </div>
            <InlineBreadcrumb
              pointerSegments={pointerSegments}
              onNavigatePointer={onNavigatePointer}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close inspector"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
          </TabsList>

          <TabsContent
            value="properties"
            className="mt-4 max-h-[65vh] overflow-y-auto focus-visible:outline-none"
          >
            <div className="space-y-4">
              <CollapsibleSection title="Value details">
                <DetailField
                  label="Preview"
                  value={renderedValuePreview}
                  helperText={
                    details.isContainer ? 'Container summary' : undefined
                  }
                />
                <DetailField label="Type" value={details.type} monospace />
              </CollapsibleSection>

              <CollapsibleSection title="Pointer">
                <DetailField
                  label="JSON Pointer"
                  value={pathValue}
                  monospace
                  action={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy node path"
                      onClick={onCopyPath}
                    >
                      {copyStatus === 'copied' ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  }
                  helperText={copyHelperText}
                />
              </CollapsibleSection>
            </div>
          </TabsContent>

          <TabsContent
            value="structure"
            className="mt-4 max-h-[65vh] overflow-y-auto focus-visible:outline-none"
          >
            <div className="space-y-4">
              <CollapsibleSection title="Structure">
                <DetailField
                  label="Parent pointer"
                  value={parentPointerValue}
                  monospace
                />
                <DetailField label="Children" value={`${details.childCount}`} />
                {childPointers.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Child pointers
                    </p>
                    <div className="rounded-lg border border-border/70 bg-card/60 p-2">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {childPointers.slice(0, 20).map((childPointer) => (
                          <button
                            key={childPointer}
                            type="button"
                            className="w-full truncate text-left font-mono text-[11px] text-muted-foreground transition hover:text-foreground"
                            onClick={() => onNavigatePointer?.(childPointer)}
                            disabled={!onNavigatePointer}
                          >
                            {childPointer}
                          </button>
                        ))}
                        {childPointers.length > 20 && (
                          <p className="text-[11px] font-mono text-muted-foreground">
                            + {childPointers.length - 20} more…
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <DetailField label="Depth" value={`${depth}`} />
                <DetailField
                  label="Index in parent"
                  value={indexInParent ?? '-'}
                />
              </CollapsibleSection>

              <CollapsibleSection title="Metadata" defaultOpen={false}>
                {details.lineNumber ? (
                  <DetailField
                    label="Line number"
                    value={`Line ${details.lineNumber}`}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No metadata available
                  </p>
                )}
              </CollapsibleSection>
            </div>
          </TabsContent>

          <TabsContent
            value="edit"
            className="mt-4 max-h-[65vh] overflow-y-auto focus-visible:outline-none"
          >
            <div className="space-y-4">
              <CollapsibleSection title="Quick edit">
                <div className="space-y-4">
                  <FieldBlock label="Key" htmlFor={keyInputId}>
                    <Input
                      id={keyInputId}
                      value={editingState.keyInputValue}
                      disabled={!canEdit}
                      onChange={(event) =>
                        editingState.setDraftKey(event.target.value)
                      }
                      onBlur={editingState.handleKeyCommit}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          editingState.handleKeyCommit();
                        }
                      }}
                    />
                  </FieldBlock>
                  <FieldBlock label="Value" htmlFor={valueInputId}>
                    {isValueMultiline ? (
                      <textarea
                        id={valueInputId}
                        className={`min-h-[60vh] w-full rounded-md border border-input px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-70 ${applyFlash === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-background'}`}
                        value={editingState.valueInputValue}
                        disabled={!canEdit || isContainerType}
                        onChange={(event) =>
                          editingState.setDraftValue(event.target.value)
                        }
                        onBlur={editingState.handleValueCommit}
                        onKeyDown={(event) => {
                          if (
                            (event.metaKey || event.ctrlKey) &&
                            event.key === 'Enter'
                          ) {
                            event.preventDefault();
                            editingState.handleValueCommit();
                          }
                        }}
                      />
                    ) : (
                      <Input
                        id={valueInputId}
                        value={editingState.valueInputValue}
                        disabled={!canEdit || isContainerType}
                        className={
                          applyFlash === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/20'
                            : undefined
                        }
                        onChange={(event) =>
                          editingState.setDraftValue(event.target.value)
                        }
                        onBlur={editingState.handleValueCommit}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            editingState.handleValueCommit();
                          }
                        }}
                      />
                    )}
                    {isContainerType && canEdit && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use Add Child for object/array nodes.
                      </p>
                    )}
                  </FieldBlock>
                  <Button
                    variant="default"
                    className={`w-full transition-opacity ${applyFlash === 'success' ? 'opacity-85' : 'opacity-100'}`}
                    disabled={!canEdit}
                    onClick={handleApplyClick}
                  >
                    <span className="inline-flex items-center gap-2">
                      {applyFlash === 'success' && (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {applyFlash === 'success' ? 'Updated' : 'Apply changes'}
                    </span>
                  </Button>
                  {applyFlash === 'success' && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      ✓ Updated
                    </p>
                  )}
                  {hasMutationWarning && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      ⚠ Unable to apply change
                    </p>
                  )}
                </div>
              </CollapsibleSection>

              {!canEdit && (
                <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
                  <p className="text-sm font-medium text-foreground">
                    Editing is available only for JSON-based formats.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Editing is not supported for this file type.
                  </p>
                </div>
              )}

              {diagnosticList.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Edit warnings</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-200">
                    {diagnosticList.slice(0, 5).map((warning, index) => (
                      <li key={`${warning.pointer}-${warning.type}-${index}`}>
                        {formatDiagnosticMessage(warning.type)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <CollapsibleSection title="Advanced" defaultOpen={false}>
                <div className="space-y-3 text-sm text-foreground">
                  <p className="text-xs text-muted-foreground">
                    Target: {pathValue || '/'}
                  </p>

                  <div className="space-y-2">
                    {!showAddChildForm && (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={!canAddChild}
                        onClick={() => setShowAddChildForm(true)}
                      >
                        Add child node
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Creates a new child under this node
                    </p>
                    {!canAddChild && (
                      <p className="text-xs text-muted-foreground">
                        Add child node (disabled): Only available for objects
                        and arrays
                      </p>
                    )}

                    {showAddChildForm && (
                      <div className="space-y-2 rounded-lg border border-border/70 bg-card/60 p-3">
                        <FieldBlock
                          label="Child key"
                          htmlFor={newChildKeyInputId}
                        >
                          <Input
                            id={newChildKeyInputId}
                            value={newChildKey}
                            disabled={!canEdit}
                            onChange={(event) =>
                              setNewChildKey(event.target.value)
                            }
                          />
                        </FieldBlock>
                        <FieldBlock
                          label="Child value"
                          htmlFor={newChildValueInputId}
                        >
                          <Input
                            id={newChildValueInputId}
                            value={newChildValue}
                            disabled={!canEdit}
                            onChange={(event) =>
                              setNewChildValue(event.target.value)
                            }
                          />
                        </FieldBlock>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setShowAddChildForm(false);
                              setNewChildKey('');
                              setNewChildValue('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            className="w-full"
                            disabled={!canAddChild}
                            onClick={() => {
                              editingState.handleCreateChild(
                                newChildKey,
                                newChildValue,
                              );
                              setShowAddChildForm(false);
                              setNewChildKey('');
                              setNewChildValue('');
                            }}
                          >
                            Confirm
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {!showDeleteConfirm && (
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={!canEdit}
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Delete this node
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Removes this node and its children
                    </p>

                    {showDeleteConfirm && (
                      <div className="space-y-2 rounded-lg border border-border/70 bg-card/60 p-3">
                        <p className="text-sm text-foreground">
                          Delete this node?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowDeleteConfirm(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            className="w-full"
                            disabled={!canEdit}
                            onClick={() => {
                              editingState.handleDeleteNode();
                              setShowDeleteConfirm(false);
                            }}
                          >
                            Confirm
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </TabsContent>
        </Tabs>
      </aside>
    );
  },
);

NodePropertiesContent.displayName = 'NodePropertiesContent';

const EDIT_ERROR_MESSAGES: Record<string, string> = {
  invalidTarget: 'The edited node is no longer available.',
  invalidJson: 'The document can no longer be parsed as valid JSON.',
  typeMismatch: 'That edit is not valid for the selected node.',
  versionConflict: 'The document changed before the edit could be applied.',
  unknown: 'The edit could not be applied.',
};

function formatDiagnosticMessage(type: string | undefined): string {
  if (!type) {
    return 'Unknown warning.';
  }

  const key = type.toLowerCase();
  return EDIT_ERROR_MESSAGES[key] ?? key.replaceAll('_', ' ');
}

interface DetailFieldProps {
  label: string;
  value?: string;
  monospace?: boolean;
  action?: ReactNode;
  helperText?: string;
}

function DetailField({
  label,
  value,
  monospace,
  action,
  helperText,
}: DetailFieldProps) {
  if (value == null || value === '') {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/70 bg-card/60 p-3">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {action}
      </div>
      <p
        className={`mt-1 text-sm text-foreground ${monospace ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </p>
      {helperText && (
        <p className="mt-0.5 text-xs text-muted-foreground">{helperText}</p>
      )}
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

interface FieldBlockProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}

function FieldBlock({ label, htmlFor, children }: FieldBlockProps) {
  return (
    <div className="space-y-2">
      <label
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <section className="rounded-xl border border-border/70 bg-background/60 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-foreground"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </section>
  );
}

interface InlineBreadcrumbProps {
  pointerSegments: string[];
  onNavigatePointer?: (pointer: string) => void;
}

function InlineBreadcrumb({
  pointerSegments,
  onNavigatePointer,
}: InlineBreadcrumbProps) {
  const path = buildPath(pointerSegments);

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {pointerSegments.map((segment, index) => {
        const isLast = index === pointerSegments.length - 1;
        const pointer = buildPointerFromSegments(
          pointerSegments.slice(0, index + 1),
        );

        return (
          <span key={`${segment}-${index}`} className="flex items-center gap-1">
            {index > 0 && <span>/</span>}
            <button
              type="button"
              className={`rounded px-1 py-0.5 font-mono ${isLast ? 'text-foreground' : 'hover:text-foreground'}`}
              onClick={() => onNavigatePointer?.(pointer)}
              disabled={!onNavigatePointer}
            >
              {segment}
            </button>
          </span>
        );
      })}
      <span className="sr-only">{path}</span>
    </div>
  );
}

function buildPath(pointerSegments: string[]): string {
  if (pointerSegments.length <= 1) {
    return '/';
  }

  return `/${pointerSegments.slice(1).join('/')}`;
}

function buildPointerFromSegments(pointerSegments: string[]): string {
  if (pointerSegments.length <= 1) {
    return '';
  }

  return `/${pointerSegments.slice(1).join('/')}`;
}
