import { Range, TextDocument, WorkspaceEdit, workspace } from 'vscode';

import { parsePointer } from '../../shared/node-pointer';
import {
  AstNode,
  parseJsonTolerant,
  resolveAstNode,
} from './jsonc-path.helper';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Discriminated union representing a user's intent to edit a JSON node.
 * Each variant maps to a specific mutation operation.
 */
export type NodeEditIntent =
  | { nodeId: string; type: 'change-value'; newValue: unknown }
  | {
      nodeId: string;
      type: 'create-child';
      key?: string;
      value: unknown;
    }
  | { nodeId: string; type: 'delete-node' };

/**
 * Typed error codes returned by the mutation pipeline.
 */
export type MutationError =
  | 'INVALID_TARGET'
  | 'INVALID_RANGE'
  | 'INVALID_PARENT_TYPE'
  | 'UNSUPPORTED_NODE_TYPE'
  | 'TYPE_MISMATCH'
  | 'DUPLICATE_KEY'
  | 'INVALID_JSON'
  | 'VERSION_CONFLICT'
  | 'NO_TEXT_CHANGE'
  | 'UNKNOWN';

/**
 * Result of a mutation operation - either success or a typed error.
 */
export type MutationResult =
  | { success: true; warnings?: DiagnosticWarning[] }
  | { success: false; error: MutationError };

/**
 * Discriminated union for non-blocking diagnostic warnings produced
 * after a successful mutation. Extensible for future variants.
 */
export type DiagnosticWarning = { type: 'FIELD_REMOVED'; pointer: string };

/**
 * O(1) metadata captured from the resolved target node before mutation.
 * Used by `computeNodeDiagnostics` to compare pre- and post-mutation AST state.
 */
export interface PreMutationSnapshot {
  readonly targetExists: boolean;
  readonly parentType: string | undefined;
  readonly parentChildrenCount: number | undefined;
  readonly parentNode: AstNode | undefined;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Evaluates pre/post mutation AST metadata to detect semantic risks.
 * Pure and deterministic. Does not mutate the AST.
 *
 * @param snapshot - Metadata captured before mutation dispatch.
 * @param root - The mutated AST root after dispatch.
 * @param intent - The edit intent that was executed.
 * @returns An array of diagnostic warnings (empty if none).
 */
export function computeNodeDiagnostics(
  snapshot: PreMutationSnapshot,
  root: AstNode,
  intent: NodeEditIntent,
): DiagnosticWarning[] {
  if (intent.type !== 'delete-node') {
    return [];
  }

  const postMutationResolved = resolveAstNode(root, intent.nodeId);
  const postTargetExists = Boolean(postMutationResolved);
  const postParentChildrenCount = snapshot.parentNode?.children?.length;

  const removedFromObjectParent =
    snapshot.targetExists &&
    snapshot.parentType === 'object' &&
    !postTargetExists &&
    typeof snapshot.parentChildrenCount === 'number' &&
    typeof postParentChildrenCount === 'number' &&
    postParentChildrenCount < snapshot.parentChildrenCount;

  if (removedFromObjectParent) {
    return [{ type: 'FIELD_REMOVED', pointer: intent.nodeId }];
  }

  return [];
}

// Backward-compatible alias for existing imports.
export const collectDiagnostics = computeNodeDiagnostics;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_INDENT = 2;
// ---------------------------------------------------------------------------
// Type Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the JSON type string for a JS value (matching AST node types).
 */
export function jsonTypeOf(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

/**
 * Maps an AstNode type to the equivalent JS typeof category.
 */
export function astTypeCategory(node: AstNode): string {
  switch (node.type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'object':
      return 'object';
    case 'array':
      return 'array';
    default:
      return 'unknown';
  }
}

type PrimitiveCategory = 'string' | 'number' | 'boolean' | 'null';

function isPrimitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

interface ParsedPrimitiveInput {
  category: PrimitiveCategory | 'object' | 'array' | 'unknown';
  value: unknown;
}

/**
 * Safely parses incoming mutation values.
 *
 * Rules:
 * - numbers/booleans/null pass through
 * - strings are interpreted as number/boolean/null when unambiguous
 * - all other strings fall back to string
 * - object/array are preserved as categories so validation can reject them
 */
function parseIncomingPrimitiveInput(raw: unknown): ParsedPrimitiveInput {
  if (raw === null) {
    return { category: 'null', value: null };
  }

  if (typeof raw === 'number') {
    if (Number.isFinite(raw)) {
      return { category: 'number', value: raw };
    }
    return { category: 'unknown', value: raw };
  }

  if (typeof raw === 'boolean') {
    return { category: 'boolean', value: raw };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();

    if (trimmed === 'true') {
      return { category: 'boolean', value: true };
    }
    if (trimmed === 'false') {
      return { category: 'boolean', value: false };
    }
    if (trimmed === 'null') {
      return { category: 'null', value: null };
    }

    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      const parsedNumber = Number(trimmed);
      if (Number.isFinite(parsedNumber)) {
        return { category: 'number', value: parsedNumber };
      }
    }

    return { category: 'string', value: raw };
  }

  if (Array.isArray(raw)) {
    return { category: 'array', value: raw };
  }

  if (typeof raw === 'object') {
    return { category: 'object', value: raw };
  }

  return { category: 'unknown', value: raw };
}

function findNodeByPointer(root: AstNode, nodeId: string): AstNode | undefined {
  return resolveAstNode(root, nodeId)?.target;
}

function serializePrimitive(
  value: unknown,
  type: 'string' | 'number' | 'boolean',
): string {
  if (type === 'string') {
    return JSON.stringify(String(value));
  }
  if (type === 'number') {
    return String(value);
  }
  return value ? 'true' : 'false';
}

function serializePrimitiveForInsert(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return value ? 'true' : 'false';
}

function isValidReplaceRange(
  start: number,
  end: number,
  textLength: number,
): boolean {
  return start >= 0 && end > start && end <= textLength;
}

function isValidInsertOffset(offset: number, textLength: number): boolean {
  return offset >= 0 && offset <= textLength;
}

function findLineStart(text: string, offset: number): number {
  let cursor = Math.max(0, Math.min(offset, text.length));
  while (cursor > 0 && text[cursor - 1] !== '\n') {
    cursor--;
  }
  return cursor;
}

function getLineIndentAtOffset(text: string, offset: number): string {
  const lineStart = findLineStart(text, offset);
  let cursor = lineStart;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char !== ' ' && char !== '\t') {
      break;
    }
    cursor++;
  }
  return text.slice(lineStart, cursor);
}

function createDefaultChildIndent(text: string, target: AstNode): string {
  const parentIndent = getLineIndentAtOffset(text, target.offset);
  if (parentIndent.includes('\t')) {
    return `${parentIndent}\t`;
  }
  return `${parentIndent}${' '.repeat(DEFAULT_INDENT)}`;
}

function buildCreateInsertText(
  originalText: string,
  target: AstNode,
  intent: Extract<NodeEditIntent, { type: 'create-child' }>,
): { insertOffset: number; insertText: string } | undefined {
  const parsedInput = parseIncomingPrimitiveInput(intent.value);
  if (!isPrimitive(parsedInput.value)) {
    return undefined;
  }

  const serializedValue = serializePrimitiveForInsert(parsedInput.value);

  const insertOffset = target.offset + target.length - 1;
  if (insertOffset < 0 || insertOffset > originalText.length) {
    return undefined;
  }

  const hasChildren = Boolean(target.children && target.children.length > 0);
  const containerIsMultiline = originalText
    .slice(target.offset, target.offset + target.length)
    .includes('\n');

  if (target.type === 'object') {
    const key = String(intent.key ?? '').trim();
    if (key.length === 0) {
      return undefined;
    }

    const keyText = JSON.stringify(key);
    if (!hasChildren) {
      return {
        insertOffset,
        insertText: `${keyText}: ${serializedValue}`,
      };
    }

    if (containerIsMultiline) {
      const lastChild = target.children?.[target.children.length - 1];
      const childIndent = lastChild
        ? getLineIndentAtOffset(originalText, lastChild.offset)
        : createDefaultChildIndent(originalText, target);

      return {
        insertOffset,
        insertText: `,\n${childIndent}${keyText}: ${serializedValue}`,
      };
    }

    return {
      insertOffset,
      insertText: `, ${keyText}: ${serializedValue}`,
    };
  }

  if (target.type === 'array') {
    if (!hasChildren) {
      return {
        insertOffset,
        insertText: serializedValue,
      };
    }

    if (containerIsMultiline) {
      const lastChild = target.children?.[target.children.length - 1];
      const childIndent = lastChild
        ? getLineIndentAtOffset(originalText, lastChild.offset)
        : createDefaultChildIndent(originalText, target);

      return {
        insertOffset,
        insertText: `,\n${childIndent}${serializedValue}`,
      };
    }

    return {
      insertOffset,
      insertText: `, ${serializedValue}`,
    };
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Pre-Mutation Validation
// ---------------------------------------------------------------------------

/**
 * Validates a `NodeEditIntent` against the target node's type before any
 * AST mutation occurs. Returns `null` if valid, or a `MutationResult`
 * error if the intent violates type invariants.
 *
 * This function is pure: it MUST NOT modify the AST or perform side effects.
 *
 * @param root - The root AstNode from parseJsonTolerant.
 * @param intent - The edit intent to validate.
 * @returns `null` if valid, or `{ success: false, error }` if invalid.
 */
export function validateMutation(
  root: AstNode,
  intent: NodeEditIntent,
): MutationResult | null {
  const resolved = resolveAstNode(root, intent.nodeId);
  if (!resolved) {
    return { success: false, error: 'INVALID_TARGET' };
  }

  const { target, parent, property } = resolved;

  switch (intent.type) {
    case 'change-value': {
      const parsedInput = parseIncomingPrimitiveInput(intent.newValue);

      // Reject container targets
      if (target.type === 'object' || target.type === 'array') {
        return { success: false, error: 'TYPE_MISMATCH' };
      }

      // Allow changes across primitive types, but block non-primitive values.
      if (!isPrimitive(parsedInput.value)) {
        return { success: false, error: 'TYPE_MISMATCH' };
      }

      return null;
    }

    case 'create-child': {
      const targetType: string = astTypeCategory(target);
      const parsedInput = parseIncomingPrimitiveInput(intent.value);

      if (!isPrimitive(parsedInput.value)) {
        return { success: false, error: 'UNSUPPORTED_NODE_TYPE' };
      }

      if (targetType === 'object') {
        const newKey = String(intent.key ?? '').trim();
        if (newKey.length === 0) {
          return { success: false, error: 'INVALID_TARGET' };
        }

        for (const prop of target.children ?? []) {
          const keyNode = prop.children?.[0];
          if (keyNode && String(keyNode.value ?? '') === newKey) {
            return { success: false, error: 'DUPLICATE_KEY' };
          }
        }

        return null;
      }

      if (targetType === 'array') {
        return null;
      }

      // Only containers can have children
      if (targetType !== 'object' && targetType !== 'array') {
        return { success: false, error: 'UNSUPPORTED_NODE_TYPE' };
      }

      return null;
    }

    case 'delete-node': {
      // Root deletion is not allowed
      if (!parent) {
        return { success: false, error: 'INVALID_TARGET' };
      }

      if (parent.type !== 'object' && parent.type !== 'array') {
        return { success: false, error: 'INVALID_PARENT_TYPE' };
      }

      if (parent.type === 'object') {
        if (!property || property.type !== 'property') {
          return { success: false, error: 'INVALID_TARGET' };
        }
      }

      if (parent.type === 'array' && property) {
        return { success: false, error: 'INVALID_TARGET' };
      }

      return null;
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Mutation Operations
// ---------------------------------------------------------------------------

function isWhitespace(char: string | undefined): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}

function computeDeleteRange(
  originalText: string,
  parent: AstNode,
  deleteNodeStart: number,
  deleteNodeEnd: number,
  indexInParent: number,
): { start: number; end: number } | undefined {
  const siblings = parent.children ?? [];
  const previousSibling =
    indexInParent > 0 ? siblings[indexInParent - 1] : undefined;
  const nextSibling =
    indexInParent < siblings.length - 1
      ? siblings[indexInParent + 1]
      : undefined;

  let start = deleteNodeStart;
  let end = deleteNodeEnd;

  const firstNonWsRight = (() => {
    let cursor = end;
    while (cursor < originalText.length && isWhitespace(originalText[cursor])) {
      cursor++;
    }
    return cursor;
  })();

  const trailingComma = originalText[firstNonWsRight] === ',';
  if (trailingComma) {
    end = firstNonWsRight + 1;
    while (
      end < originalText.length &&
      (originalText[end] === ' ' || originalText[end] === '\t')
    ) {
      end++;
    }
    if (previousSibling === undefined && nextSibling !== undefined) {
      while (
        end < originalText.length &&
        (originalText[end] === '\n' || originalText[end] === '\r')
      ) {
        end++;
      }
      while (
        end < originalText.length &&
        (originalText[end] === ' ' || originalText[end] === '\t')
      ) {
        end++;
      }
    }
    return { start, end };
  }

  const lastNonWsLeft = (() => {
    let cursor = start - 1;
    while (cursor >= 0 && isWhitespace(originalText[cursor])) {
      cursor--;
    }
    return cursor;
  })();

  const leadingComma =
    lastNonWsLeft >= 0 && originalText[lastNonWsLeft] === ',';
  if (leadingComma) {
    start = lastNonWsLeft;
    while (
      start > 0 &&
      (originalText[start - 1] === ' ' || originalText[start - 1] === '\t')
    ) {
      start--;
    }
    return { start, end };
  }

  // Single element/property case: remove node and safe surrounding whitespace only.
  if (!previousSibling && !nextSibling) {
    while (
      start > 0 &&
      isWhitespace(originalText[start - 1]) &&
      originalText[start - 1] !== '{' &&
      originalText[start - 1] !== '['
    ) {
      start--;
    }

    while (
      end < originalText.length &&
      isWhitespace(originalText[end]) &&
      originalText[end] !== '}' &&
      originalText[end] !== ']'
    ) {
      end++;
    }
  }

  if (start < 0 || end < start || end > originalText.length) {
    return undefined;
  }

  return { start, end };
}

// ---------------------------------------------------------------------------
// Pipeline Entry Point
// ---------------------------------------------------------------------------

/**
 * Applies a node edit intent to a VS Code TextDocument.
 *
 * Pipeline:
 * 1. Capture document version
 * 2. Parse document text → AST
 * 3. Resolve target via JSON Pointer
 * 4. Dispatch to mutation operation
 * 5. Serialize full AST → string
 * 6. Validate version unchanged
 * 7. Apply WorkspaceEdit (full document replace)
 * 8. Save document
 * 9. Invoke diagnostics callback if provided
 *
 * @param intent - The edit intent describing what to change.
 * @param document - The VS Code TextDocument to mutate.
 * @param diagnosticsCallback - Optional callback to receive mutation diagnostics (nodeId and warnings).
 * @returns A MutationResult indicating success or a typed error.
 */
export async function applyNodeEdit(
  intent: NodeEditIntent,
  document: TextDocument,
  diagnosticsCallback?: (nodeId: string, warnings: DiagnosticWarning[]) => void,
): Promise<MutationResult> {
  // 1. Capture version
  const versionAtParse: number = document.version;

  // 2. Parse
  const text: string = document.getText();
  const root: AstNode | undefined = parseJsonTolerant(text);
  if (!root) {
    return { success: false, error: 'INVALID_JSON' };
  }

  // 3. Validate pointer early
  try {
    parsePointer(intent.nodeId);
  } catch {
    return { success: false, error: 'INVALID_TARGET' };
  }

  // 3.5. Validate type invariants (runs resolveAstNode internally)
  const validationError: MutationResult | null = validateMutation(root, intent);
  if (validationError) {
    return validationError;
  }

  if (intent.type === 'change-value') {
    const targetNode = findNodeByPointer(root, intent.nodeId);
    if (!targetNode) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    if (
      targetNode.type !== 'string' &&
      targetNode.type !== 'number' &&
      targetNode.type !== 'boolean'
    ) {
      return { success: false, error: 'TYPE_MISMATCH' };
    }

    const parsedInput = parseIncomingPrimitiveInput(intent.newValue);
    if (!isPrimitive(parsedInput.value)) {
      return { success: false, error: 'TYPE_MISMATCH' };
    }

    const primitiveType = typeof parsedInput.value as
      | 'string'
      | 'number'
      | 'boolean';

    const start = targetNode.offset;
    const end = targetNode.offset + targetNode.length;
    const originalText = document.getText();
    const newValueText = serializePrimitive(parsedInput.value, primitiveType);
    const updatedText =
      originalText.slice(0, start) + newValueText + originalText.slice(end);

    if (
      start < 0 ||
      end < start ||
      end > originalText.length ||
      updatedText.length === 0
    ) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    if (document.version !== versionAtParse) {
      return { success: false, error: 'VERSION_CONFLICT' };
    }

    try {
      const edit: WorkspaceEdit = new WorkspaceEdit();
      edit.replace(
        document.uri,
        new Range(document.positionAt(start), document.positionAt(end)),
        newValueText,
      );
      const applied: boolean = await workspace.applyEdit(edit);
      if (!applied) {
        return { success: false, error: 'UNKNOWN' };
      }
    } catch {
      return { success: false, error: 'UNKNOWN' };
    }

    try {
      await document.save();
    } catch {
      return { success: false, error: 'UNKNOWN' };
    }

    if (diagnosticsCallback) {
      diagnosticsCallback(intent.nodeId, []);
    }

    const successResult: MutationResult = { success: true, warnings: [] };
    return successResult;
  }

  if (intent.type === 'delete-node') {
    const resolvedDelete = resolveAstNode(root, intent.nodeId);
    if (!resolvedDelete) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    const { target, parent, property, indexInParent } = resolvedDelete;
    if (!parent || (parent.type !== 'object' && parent.type !== 'array')) {
      return { success: false, error: 'INVALID_PARENT_TYPE' };
    }

    const deletionNode = parent.type === 'object' ? property : target;
    if (!deletionNode) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    const deleteStart = deletionNode.offset;
    const deleteEnd = deletionNode.offset + deletionNode.length;
    const originalText = document.getText();

    const rangeToDelete = computeDeleteRange(
      originalText,
      parent,
      deleteStart,
      deleteEnd,
      indexInParent,
    );

    if (!rangeToDelete) {
      return { success: false, error: 'INVALID_RANGE' };
    }

    if (
      !isValidReplaceRange(
        rangeToDelete.start,
        rangeToDelete.end,
        originalText.length,
      )
    ) {
      return { success: false, error: 'INVALID_RANGE' };
    }

    if (document.version !== versionAtParse) {
      return { success: false, error: 'VERSION_CONFLICT' };
    }

    try {
      const edit: WorkspaceEdit = new WorkspaceEdit();
      edit.replace(
        document.uri,
        new Range(
          document.positionAt(rangeToDelete.start),
          document.positionAt(rangeToDelete.end),
        ),
        '',
      );
      const applied: boolean = await workspace.applyEdit(edit);
      if (!applied) {
        return { success: false, error: 'UNKNOWN' };
      }
    } catch {
      return { success: false, error: 'UNKNOWN' };
    }

    try {
      await document.save();
    } catch {
      return { success: false, error: 'UNKNOWN' };
    }

    if (diagnosticsCallback) {
      diagnosticsCallback(intent.nodeId, []);
    }
    return { success: true, warnings: [] };
  }

  if (intent.type === 'create-child') {
    const resolvedCreate = resolveAstNode(root, intent.nodeId);
    if (!resolvedCreate) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    const { target } = resolvedCreate;
    if (target.type !== 'object' && target.type !== 'array') {
      return { success: false, error: 'UNSUPPORTED_NODE_TYPE' };
    }

    const originalText = document.getText();
    const insertion = buildCreateInsertText(originalText, target, intent);
    if (!insertion) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    if (
      !isValidInsertOffset(insertion.insertOffset, originalText.length) ||
      insertion.insertText.length === 0
    ) {
      return { success: false, error: 'INVALID_RANGE' };
    }

    if (document.version !== versionAtParse) {
      return { success: false, error: 'VERSION_CONFLICT' };
    }

    try {
      const insertPosition = document.positionAt(insertion.insertOffset);
      const edit: WorkspaceEdit = new WorkspaceEdit();
      edit.insert(document.uri, insertPosition, insertion.insertText);
      const applied: boolean = await workspace.applyEdit(edit);
      if (!applied) {
        return { success: false, error: 'UNKNOWN' };
      }
    } catch {
      return { success: false, error: 'UNKNOWN' };
    }

    try {
      await document.save();
    } catch {
      return { success: false, error: 'UNKNOWN' };
    }

    if (diagnosticsCallback) {
      diagnosticsCallback(intent.nodeId, []);
    }

    return { success: true, warnings: [] };
  }

  return { success: false, error: 'UNKNOWN' };
}
