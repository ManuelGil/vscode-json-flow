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
  | { nodeId: string; type: 'rename-key'; newKey: string }
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
  | 'TYPE_MISMATCH'
  | 'DUPLICATE_KEY'
  | 'INVALID_JSON'
  | 'VERSION_CONFLICT'
  | 'UNKNOWN';

/**
 * Result of a mutation operation — either success or a typed error.
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
// Indentation Detection
// ---------------------------------------------------------------------------

/**
 * Detects the indentation unit used in a JSON document by scanning
 * lines for leading whitespace. Falls back to DEFAULT_INDENT spaces.
 *
 * @param text - The full document text.
 * @returns The detected indent string (spaces or tab).
 */
function detectIndent(text: string): string {
  const lines: string[] = text.split('\n');

  for (const line of lines) {
    const match = line.match(/^(\s+)\S/);
    if (match) {
      return match[1];
    }
  }

  return ' '.repeat(DEFAULT_INDENT);
}

// ---------------------------------------------------------------------------
// AST Serialization
// ---------------------------------------------------------------------------

/**
 * Serializes a JS value into a JSON string with the given indentation.
 *
 * @param value - The value to serialize.
 * @param indent - The indentation string.
 * @returns The serialized JSON string.
 */
function serializeValue(value: unknown, indent: string): string {
  const indentSize: number = indent.includes('\t') ? 1 : indent.length;
  return JSON.stringify(value, null, indentSize);
}

/**
 * Reconstructs a JS value from the AST by walking its structure.
 * This is the canonical way to go from AST → JS object → serialized string.
 *
 * @param node - The AstNode to reconstruct.
 * @returns The reconstructed JS value.
 */
function astToValue(node: AstNode): unknown {
  switch (node.type) {
    case 'object': {
      const result: Record<string, unknown> = {};
      for (const prop of node.children ?? []) {
        if (
          prop.type !== 'property' ||
          !prop.children ||
          prop.children.length < 2
        ) {
          continue;
        }
        const keyNode: AstNode = prop.children[0];
        const valNode: AstNode = prop.children[1];
        const key: string = String(keyNode.value ?? '');
        result[key] = astToValue(valNode);
      }
      return result;
    }
    case 'array': {
      const items: unknown[] = [];
      for (const child of node.children ?? []) {
        items.push(astToValue(child));
      }
      return items;
    }
    case 'string':
      return node.value;
    case 'number':
      return node.value;
    case 'boolean':
      return node.value;
    case 'null':
      return null;
    default:
      return undefined;
  }
}

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

function serializePrimitiveForInsert(
  parsedInput: ParsedPrimitiveInput,
): string | undefined {
  if (parsedInput.category === 'string') {
    return JSON.stringify(String(parsedInput.value ?? ''));
  }
  if (parsedInput.category === 'number') {
    return String(parsedInput.value);
  }
  if (parsedInput.category === 'boolean') {
    return parsedInput.value ? 'true' : 'false';
  }
  return undefined;
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
  const serializedValue = serializePrimitiveForInsert(parsedInput);
  if (!serializedValue) {
    return undefined;
  }

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
      const targetType: string = astTypeCategory(target);
      const parsedInput = parseIncomingPrimitiveInput(intent.newValue);

      // Reject container targets
      if (targetType === 'object' || targetType === 'array') {
        return { success: false, error: 'TYPE_MISMATCH' };
      }

      // Allow changes across primitive types, but block non-primitive values.
      if (
        parsedInput.category !== 'string' &&
        parsedInput.category !== 'number' &&
        parsedInput.category !== 'boolean'
      ) {
        return { success: false, error: 'TYPE_MISMATCH' };
      }

      return null;
    }

    case 'rename-key': {
      // Parent must be an object
      if (!parent || parent.type !== 'object' || !property) {
        return { success: false, error: 'TYPE_MISMATCH' };
      }

      // newKey must be non-empty after trimming
      if (intent.newKey.trim().length === 0) {
        return { success: false, error: 'INVALID_TARGET' };
      }

      // newKey must differ from current key
      const currentKeyNode = property.children?.[0];
      if (
        currentKeyNode &&
        String(currentKeyNode.value ?? '') === intent.newKey
      ) {
        return { success: false, error: 'INVALID_TARGET' };
      }

      return null;
    }

    case 'create-child': {
      const targetType: string = astTypeCategory(target);
      const parsedInput = parseIncomingPrimitiveInput(intent.value);

      if (
        parsedInput.category !== 'string' &&
        parsedInput.category !== 'number' &&
        parsedInput.category !== 'boolean'
      ) {
        return { success: false, error: 'TYPE_MISMATCH' };
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
        return { success: false, error: 'TYPE_MISMATCH' };
      }

      return null;
    }

    case 'delete-node': {
      // Root deletion is not allowed
      if (!parent) {
        return { success: false, error: 'INVALID_TARGET' };
      }

      if (parent.type !== 'object' && parent.type !== 'array') {
        return { success: false, error: 'TYPE_MISMATCH' };
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

/**
 * Renames the key of an object property in the AST.
 * The parent must be an object and the new key must not duplicate existing keys.
 *
 * @param root - The root AST node.
 * @param nodeId - JSON Pointer of the target node.
 * @param newKey - The new property key.
 * @returns MutationResult indicating success or error.
 */
function renameKey(
  root: AstNode,
  nodeId: string,
  newKey: string,
): MutationResult {
  const resolved = resolveAstNode(root, nodeId);
  if (!resolved) {
    return { success: false, error: 'INVALID_TARGET' };
  }

  const { parent, property } = resolved;

  if (!parent || parent.type !== 'object' || !property) {
    return { success: false, error: 'TYPE_MISMATCH' };
  }

  // Check for duplicate keys among siblings
  for (const prop of parent.children ?? []) {
    if (prop === property) {
      continue;
    }
    const keyNode = prop.children?.[0];
    if (keyNode && String(keyNode.value ?? '') === newKey) {
      return { success: false, error: 'DUPLICATE_KEY' };
    }
  }

  // Mutate the key node in-place on the AST
  const keyNode = property.children?.[0];
  if (!keyNode) {
    return { success: false, error: 'INVALID_TARGET' };
  }
  keyNode.value = newKey;

  return { success: true };
}

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

  // 3.6. Capture pre-mutation snapshot for diagnostics (O(1) metadata)
  const resolvedTargetNode = resolveAstNode(root, intent.nodeId);
  const preMutationSnapshot: PreMutationSnapshot = {
    targetExists: Boolean(resolvedTargetNode),
    parentType: resolvedTargetNode?.parent?.type,
    parentChildrenCount: resolvedTargetNode?.parent?.children?.length,
    parentNode: resolvedTargetNode?.parent,
  };

  if (intent.type === 'change-value') {
    const targetNode = findNodeByPointer(root, intent.nodeId);
    if (!targetNode) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    const detectedType = astTypeCategory(targetNode);
    if (
      detectedType !== 'string' &&
      detectedType !== 'number' &&
      detectedType !== 'boolean'
    ) {
      return { success: false, error: 'TYPE_MISMATCH' };
    }

    const parsedInput = parseIncomingPrimitiveInput(intent.newValue);
    if (
      parsedInput.category !== 'string' &&
      parsedInput.category !== 'number' &&
      parsedInput.category !== 'boolean'
    ) {
      return { success: false, error: 'TYPE_MISMATCH' };
    }

    const start = targetNode.offset;
    const end = targetNode.offset + targetNode.length;
    const originalText = document.getText();
    const newValueText = serializePrimitive(
      parsedInput.value,
      parsedInput.category,
    );
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
      return { success: false, error: 'INVALID_TARGET' };
    }

    const deletionNode = parent.type === 'object' ? property : target;
    if (!deletionNode) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    const deleteStart = deletionNode.offset;
    const deleteEnd = deletionNode.offset + deletionNode.length;
    const originalText = document.getText();

    console.log('[MUTATION] DELETE_START', {
      nodeId: intent.nodeId,
      parentType: parent.type,
      indexInParent,
    });

    const rangeToDelete = computeDeleteRange(
      originalText,
      parent,
      deleteStart,
      deleteEnd,
      indexInParent,
    );

    if (!rangeToDelete) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    console.log('[MUTATION] DELETE_RANGE', rangeToDelete);

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

    console.log('[MUTATION] DELETE_SUCCESS', { nodeId: intent.nodeId });
    return { success: true, warnings: [] };
  }

  if (intent.type === 'create-child') {
    const resolvedCreate = resolveAstNode(root, intent.nodeId);
    if (!resolvedCreate) {
      return { success: false, error: 'INVALID_TARGET' };
    }

    const { target } = resolvedCreate;
    if (target.type !== 'object' && target.type !== 'array') {
      return { success: false, error: 'TYPE_MISMATCH' };
    }

    const originalText = document.getText();
    const insertion = buildCreateInsertText(originalText, target, intent);
    if (!insertion) {
      return { success: false, error: 'INVALID_TARGET' };
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

  // 4. Dispatch mutation
  let result: MutationResult;
  switch (intent.type) {
    case 'rename-key':
      result = renameKey(root, intent.nodeId, intent.newKey);
      break;
    default:
      return { success: false, error: 'UNKNOWN' };
  }

  if (!result.success) {
    return result;
  }

  // 4.5. Collect diagnostics (exactly once, after mutation success, before serialization)
  const warnings: DiagnosticWarning[] = computeNodeDiagnostics(
    preMutationSnapshot,
    root,
    intent,
  );

  // 5. Serialize full document from AST
  let serialized: string;
  try {
    const indent: string = detectIndent(text);
    const value: unknown = astToValue(root);
    serialized = serializeValue(value, indent);
    if (typeof serialized !== 'string') {
      return { success: false, error: 'INVALID_JSON' };
    }
    // Safety gate: never apply an edit that cannot be parsed again.
    if (!parseJsonTolerant(serialized)) {
      return { success: false, error: 'INVALID_JSON' };
    }
    // Preserve trailing newline if the original had one
    if (text.endsWith('\n') && !serialized.endsWith('\n')) {
      serialized += '\n';
    }
  } catch {
    return { success: false, error: 'INVALID_JSON' };
  }

  // 6. Validate version unchanged
  if (document.version !== versionAtParse) {
    return { success: false, error: 'VERSION_CONFLICT' };
  }

  // 7. Apply full-document replace via WorkspaceEdit
  try {
    const fullRange: Range = new Range(
      document.lineAt(0).range.start,
      document.lineAt(document.lineCount - 1).range.end,
    );
    const edit: WorkspaceEdit = new WorkspaceEdit();
    edit.replace(document.uri, fullRange, serialized);
    const applied: boolean = await workspace.applyEdit(edit);
    if (!applied) {
      return { success: false, error: 'UNKNOWN' };
    }
  } catch {
    return { success: false, error: 'UNKNOWN' };
  }

  // 8. Save document to persist changes
  try {
    await document.save();
  } catch {
    return { success: false, error: 'UNKNOWN' };
  }

  // 9. Invoke diagnostics callback if provided
  if (diagnosticsCallback) {
    diagnosticsCallback(intent.nodeId, warnings);
  }

  const successResult: MutationResult = { success: true, warnings };
  return successResult;
}
