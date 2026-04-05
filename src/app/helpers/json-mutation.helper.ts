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
  | { nodeId: string; type: 'create-child' }
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
  | { success: true }
  | { success: false; error: MutationError };

/**
 * Discriminated union for non-blocking diagnostic warnings produced
 * after a successful mutation. Extensible for future variants.
 */
export type DiagnosticWarning = { type: 'FIELD_REMOVED'; pointer: string };

/**
 * O(1) metadata captured from the resolved target node before mutation.
 * Used by `collectDiagnostics` without requiring AST access.
 */
export interface PreMutationSnapshot {
  readonly parentType: string | undefined;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Evaluates pre-mutation metadata to detect semantic risks.
 * Pure, deterministic, O(1). Does not access or mutate the AST.
 *
 * @param snapshot - Metadata captured before mutation dispatch.
 * @param intent - The edit intent that was executed.
 * @returns An array of diagnostic warnings (empty if none).
 */
export function collectDiagnostics(
  snapshot: PreMutationSnapshot,
  intent: NodeEditIntent,
): DiagnosticWarning[] {
  if (intent.type === 'delete-node' && snapshot.parentType === 'object') {
    return [{ type: 'FIELD_REMOVED', pointer: intent.nodeId }];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_INDENT = 2;
const AUTO_KEY_PREFIX = 'newKey';

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
      const newType: string = jsonTypeOf(intent.newValue);

      // Reject container targets
      if (targetType === 'object' || targetType === 'array') {
        return { success: false, error: 'TYPE_MISMATCH' };
      }

      // Reject container newValues
      if (newType === 'object' || newType === 'array') {
        return { success: false, error: 'TYPE_MISMATCH' };
      }

      // Enforce same-type replacement
      if (targetType !== newType) {
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

/**
 * Changes the value of a primitive node in the AST.
 * Rejects type changes and container targets.
 *
 * @param root - The root AST node.
 * @param nodeId - JSON Pointer of the target node.
 * @param newValue - The new value (must match existing type).
 * @returns MutationResult indicating success or error.
 */
function changeValue(
  root: AstNode,
  nodeId: string,
  newValue: unknown,
): MutationResult {
  const resolved = resolveAstNode(root, nodeId);
  if (!resolved) {
    return { success: false, error: 'INVALID_TARGET' };
  }

  const { target } = resolved;
  const targetCategory: string = astTypeCategory(target);
  const newCategory: string = jsonTypeOf(newValue);

  // Reject containers
  if (targetCategory === 'object' || targetCategory === 'array') {
    return { success: false, error: 'TYPE_MISMATCH' };
  }

  // Enforce same-type replacement
  if (targetCategory !== newCategory) {
    return { success: false, error: 'TYPE_MISMATCH' };
  }

  // Mutate the value in-place on the AST
  target.value = newValue as string | number | boolean | null;

  return { success: true };
}

/**
 * Creates a new child entry on a container node in the AST.
 * Objects get a new auto-generated key with null value.
 * Arrays get a null element appended.
 *
 * @param root - The root AST node.
 * @param nodeId - JSON Pointer of the target container.
 * @returns MutationResult indicating success or error.
 */
function createChild(root: AstNode, nodeId: string): MutationResult {
  const resolved = resolveAstNode(root, nodeId);
  if (!resolved) {
    return { success: false, error: 'INVALID_TARGET' };
  }

  const { target } = resolved;

  if (target.type === 'object') {
    if (!target.children) {
      target.children = [];
    }
    const existingKeys = new Set<string>();
    for (const prop of target.children) {
      const keyNode = prop.children?.[0];
      if (keyNode) {
        existingKeys.add(String(keyNode.value ?? ''));
      }
    }

    // Generate a unique key
    let candidateKey: string = AUTO_KEY_PREFIX;
    let counter = 1;
    while (existingKeys.has(candidateKey)) {
      candidateKey = `${AUTO_KEY_PREFIX}${counter}`;
      counter++;
    }

    // Build a synthetic property AST node
    const newKeyNode: AstNode = {
      type: 'string',
      offset: 0,
      length: 0,
      value: candidateKey,
    };
    const newValueNode: AstNode = {
      type: 'null',
      offset: 0,
      length: 0,
      value: null,
    };
    const newProp: AstNode = {
      type: 'property',
      offset: 0,
      length: 0,
      children: [newKeyNode, newValueNode],
    };
    target.children.push(newProp);

    return { success: true };
  }

  if (target.type === 'array') {
    if (!target.children) {
      target.children = [];
    }
    const newElement: AstNode = {
      type: 'null',
      offset: 0,
      length: 0,
      value: null,
    };
    target.children.push(newElement);

    return { success: true };
  }

  // Primitive target — cannot add children
  return { success: false, error: 'TYPE_MISMATCH' };
}

/**
 * Removes a node from its parent container in the AST.
 * Root deletion is not allowed.
 *
 * @param root - The root AST node.
 * @param nodeId - JSON Pointer of the node to delete.
 * @returns MutationResult indicating success or error.
 */
function deleteNode(root: AstNode, nodeId: string): MutationResult {
  const resolved = resolveAstNode(root, nodeId);
  if (!resolved) {
    return { success: false, error: 'INVALID_TARGET' };
  }

  const { parent, indexInParent } = resolved;

  // Root deletion is not allowed
  if (!parent) {
    return { success: false, error: 'INVALID_TARGET' };
  }

  if (
    !parent.children ||
    indexInParent < 0 ||
    indexInParent >= parent.children.length
  ) {
    return { success: false, error: 'INVALID_TARGET' };
  }

  // Remove the child at the resolved index
  parent.children.splice(indexInParent, 1);

  return { success: true };
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
  const diagnosticResolved = resolveAstNode(root, intent.nodeId);
  const preMutationSnapshot: PreMutationSnapshot = {
    parentType: diagnosticResolved?.parent?.type,
  };

  // 4. Dispatch mutation
  let result: MutationResult;
  switch (intent.type) {
    case 'rename-key':
      result = renameKey(root, intent.nodeId, intent.newKey);
      break;
    case 'change-value':
      result = changeValue(root, intent.nodeId, intent.newValue);
      break;
    case 'create-child':
      result = createChild(root, intent.nodeId);
      break;
    case 'delete-node':
      result = deleteNode(root, intent.nodeId);
      break;
    default:
      return { success: false, error: 'UNKNOWN' };
  }

  if (!result.success) {
    return result;
  }

  // 4.5. Collect diagnostics (exactly once, after mutation success, before serialization)
  const warnings: DiagnosticWarning[] = collectDiagnostics(
    preMutationSnapshot,
    intent,
  );
  for (const warning of warnings) {
    console.warn(`[json-mutation] ${warning.type}: ${warning.pointer}`);
  }

  // 5. Serialize full document from AST
  let serialized: string;
  try {
    const indent: string = detectIndent(text);
    const value: unknown = astToValue(root);
    serialized = serializeValue(value, indent);
    // Preserve trailing newline if the original had one
    if (text.endsWith('\n') && !serialized.endsWith('\n')) {
      serialized += '\n';
    }
  } catch {
    return { success: false, error: 'UNKNOWN' };
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
    // Log but don't fail if save fails - edit was applied successfully
    console.warn('[json-mutation] Document save failed (edit was applied)');
  }

  // 9. Invoke diagnostics callback if provided
  if (diagnosticsCallback) {
    diagnosticsCallback(intent.nodeId, warnings);
  }

  return { success: true };
}
