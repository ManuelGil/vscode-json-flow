# JSON Flow - Formal Technical Roadmap and Execution Contract

Version: 2.3.2
Scope: Single-file graph mode unless explicitly stated otherwise.

This document defines:

- Verified executable state.
- Structural invariants.
- Versioned progression.
- Permitted and prohibited changes.

If code contradicts this document, executable code defines reality until this document is updated.

No inference beyond explicit statements is allowed.

## 1. Sources of Truth

Valid sources:

1. Executable code paths.
2. Runtime-observable behavior.
3. Compile-time enforced type contracts.
4. Deterministic side effects.

Invalid sources:

- README files.
- Narrative roadmaps.
- Design documents.
- TODO or FIXME comments.
- Assumed intent.

## 2. Versioned Architectural Baseline

### 2.2.x - Architectural Foundation

- Web Worker became sole layout authority.
- `generateTree()` + `getRootId()` + `layoutElementsCore()` defined pure layout pipeline.
- Deterministic node identity established via RFC 6901 JSON Pointers.
- `GRAPH_ROOT_ID = '__GRAPH_ROOT__'` introduced as non-pointer structural root.
- Split View introduced.
- Bidirectional Live Sync introduced (single-file only).
- Adaptive layout threshold introduced at 2000 nodes.
- Collapse and expand functionality introduced.
- Layout unified into single pure engine (`layout-core.ts`).

### 2.3.x - Format Expansion and Structural Stabilization

- Multi-format preview support: JSON, JSONC, JSON5, YAML, CSV, TSV, TOML, INI, XML, HCL, ENV.
- Multi-format `SelectionMapper` implementations added.
- Partial graph search introduced (indexing, navigation, viewport centering).
- Extension host internationalization implemented via `vscode.l10n`.
- `useReducer` established as webview state authority.
- No main-thread layout fallback remains.

Version 2.3.2 represents stabilized single-file architecture.

## 3. Current Architecture (2.3.2)

### 3.1 Layout Authority

- Worker is the only layout computation path.
- Worker is stateless between requests.
- Worker calls only pure functions.
- No main-thread layout fallback exists.

### 3.2 Node Identity

- All data nodes use RFC 6901 JSON Pointers.
- All IDs generated via `buildPointer()`.
- All data node IDs start with `/`.
- `GRAPH_ROOT_ID` must not start with `/`.
- Identity generation must remain pure and shared across contexts.
- Identity must remain deterministic for identical document content.

### 3.3 Live Sync

- Single-file only.
- Disabled by default.
- Explicitly enabled via command.
- Guarded by `previewedPath`.
- Loop prevention via suppression flag, nonce tracking, origin tagging, and de-duplication.
- Editor-to-Graph throttled.
- Graph-to-Editor debounced.

Cross-file synchronization is prohibited.

### 3.4 Adaptive Layout Threshold

- `LARGE_GRAPH_THRESHOLD = 2000`.
- At or below threshold: entitree-flex.
- Above threshold: linear breadth-first layout.
- Output structure identical across both paths.
- entitree-flex remains sole layout dependency.

### 3.5 Webview State

- Selection, collapse, and search state are transient.
- Data, orientation, path, and file name persist across visibility changes only.
- State lost on extension restart.
- Reducer is single source of truth for flow data.

## 4. Structural Invariants

The following must always hold:

1. Worker is sole layout authority.
2. Node identity logic must not diverge.
3. Live Sync must remain single-file.
4. Worker must remain stateless.
5. Adaptive threshold must not change without validation.
6. No cross-file graph behavior may be introduced implicitly.
7. entitree-flex integration must not be replaced or duplicated.

## 5. Partial Systems (2.3.2)

The following exist but are incomplete:

- Graph search highlighting.
- Collapse-aware search.
- Format gating alignment between preview and selection mapping.

Completion must not alter identity, worker contract, or layout authority.

## 6. Non-Operational Elements

Symbols and message paths that produce no observable behavior must be removed or isolated in future minor versions.

Removal must not alter operational code paths.

## 7. Forward Progression

### 2.4.x - Completion Phase

- Add search highlighting.
- Add collapse-aware search.
- Remove dead message routes.
- Remove unused worker message handlers.
- Remove unused functions such as `reconstructFromCompact`.

Constraints:

- No identity changes.
- No worker contract changes.
- No new external dependencies.
- No layout algorithm changes.

### 2.5.x - Structural Hardening

- Align format gating between preview and selection mapping.
- Remove all non-operational symbols.
- Remove mock-data production bundling risk.
- Introduce webview internationalization via extension-provided locale.

Constraints:

- No identity changes.
- No layout contract changes.
- No worker state introduction.

### 2.6.x - Gated Single-File Editing

- Introduce graph-driven editing for current file only.
- Editing routed through extension host.
- Use `WorkspaceEdit` with version validation.
- Disabled by default via explicit setting.
- No worker involvement in edit execution.

Constraints:

- No cross-file editing.
- No identity modification.
- Live Sync must remain operational.
- Worker must remain stateless.
- Edit messages must be schema-validated.

## 8. Prohibited Changes

Without explicit escalation, the following are forbidden:

- Modifying `buildPointer()`, `parsePointer()`, or `GRAPH_ROOT_ID`.
- Introducing worker state persistence.
- Enabling cross-file Live Sync.
- Adding additional layout engines.
- Modifying adaptive threshold without validation.
- Removing loop prevention mechanisms.
- Altering `SelectionMapper` interface.
- Replacing entitree-flex.

## 9. Change Control

This document may be modified only if:

1. Executable code is updated first.
2. Invariants are re-validated.
3. Backward compatibility is preserved.
4. The version number is incremented accordingly.

No speculative changes are allowed.
