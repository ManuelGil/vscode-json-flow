# JSON Flow - Technical ROADMAP

Version: 2.3.2

This document defines the verified executable state of the JSON Flow extension, its structural invariants, and its controlled forward progression. It serves as a technical source of truth, a regression-prevention baseline, a contributor orientation document, and an execution contract for LLM agents.

## 0. Execution Rule

All actions performed in this repository must comply with the rules defined in this document.

If an action is not explicitly permitted, it must not be executed.

No inference, extrapolation, or assumption is allowed beyond the statements contained here.

## 1. Ground Truth Definition

Only the following are valid sources of truth:

- Executable code paths
- Runtime behavior produced by the code
- Type-level contracts enforced at compile time
- Side effects that occur during execution

The following must not be used to infer system behavior:

- README content
- Human-authored roadmap files
- Design decision narratives
- TODO or FIXME comments
- Comments describing future phases

If a contradiction exists between code and documentation, the code defines reality.

## 2. Historical Baseline (2.2.x to 2.3.x)

### 2.2.x - Architectural Foundation

- Worker-based layout authority introduced. `JsonLayoutWorker.ts` became the sole layout computation path, calling `generateTree()`, `getRootId()`, and `layoutElementsCore()` as pure functions.
- Deterministic node identity established via JSON Pointers (RFC 6901). `buildPointer()` in `src/shared/node-pointer.ts` became the single identity constructor. `GRAPH_ROOT_ID = '__GRAPH_ROOT__'` established as the structural root sentinel, separate from the JSON Pointer domain.
- Split View introduced. `JSONProvider` manages a `WebviewPanel` alongside the active editor.
- Bidirectional selection synchronization (Live Sync) introduced. Editor-to-Graph via `nodeIdFromOffset`. Graph-to-Editor via `rangeFromNodeId`. Loop prevention via suppression flag, nonce tracking, origin tagging, and de-duplication.
- Adaptive layout threshold introduced. `LARGE_GRAPH_THRESHOLD = 2000` in `layout-core.ts`. entitree-flex for 2000 nodes or fewer. O(n) linear BFS layout for more than 2000 nodes.
- Collapse and expand of subtrees introduced via `useFlowController` with `collapsedNodes` Set and `descendantsCache`.
- Layout unification completed. `layout-core.ts` became the single pure layout engine. Worker bundle reduced to approximately 24KB by eliminating accidental `@xyflow/react` bundling.

### 2.3.x - Format Expansion and Search

- Multi-format preview support expanded. `parseJsonContent` handles JSON, JSONC, JSON5, YAML, CSV, TSV, TOML, INI, XML, HCL, ENV.
- Multi-format selection mapping added. `SelectionMapper` interface implemented for all supported formats via `getSelectionMapper()`.
- Graph search introduced (partial). `GoToSearch` component provides search input, label indexing, match navigation, and viewport centering. Node highlighting and collapsed-node awareness are not implemented.
- Extension host internationalization added via `vscode.l10n` with language bundles for de, es, fr, it, pt-br.
- `FlowProvider` removed. `useReducer` in `FlowCanvas` became the single source of truth for flow data.
- `reactFlowKey` stabilized. Key changes only on direction change or dataset change, not on collapse or expand.

## 3. Current Stable Architecture (2.3.2)

### 3.1 Verified Capabilities

The following capabilities are fully proven by execution-chain connectivity:

- **Multi-format preview** - `parseJsonContent(text, fileType)` handles JSON, JSONC, JSON5, YAML, CSV, TSV, TOML, INI, XML, HCL, ENV via format-specific parsers in `json.controller.ts`. Result sent to webview via `update` message, processed by worker, rendered as graph.
- **Worker-based async layout** - `PROCESS_JSON` / `PROCESSING_COMPLETE` protocol with `requestId` gating via `uuidv4()`. Worker calls only `generateTree()`, `getRootId()`, `layoutElementsCore()`.
- **Adaptive layout** - `LARGE_GRAPH_THRESHOLD = 2000` in `layout-core.ts`. Nodes at or below 2000 use `layoutFromMap()` via entitree-flex. Nodes above 2000 use `layoutLinearSimple()` via O(n) BFS. Both paths produce identical output shape via shared `createNode()` / `createEdge()`.
- **Deterministic node identity** - JSON Pointers from shared `generateTree()` + `buildPointer()` across worker, main thread, and extension host. `GRAPH_ROOT_ID = '__GRAPH_ROOT__'` for the structural root. All data nodes use RFC 6901 JSON Pointer IDs starting with `/`.
- **Bidirectional selection sync (Live Sync)** - Editor-to-Graph throttled at `selectionThrottleMs` (100ms default). Graph-to-Editor debounced at 200ms. Loop prevention via suppression flag, nonce tracking, origin tagging, and de-duplication.
- **Multi-format selection mapping** - `SelectionMapper` interface with implementations for JSON, JSONC, JSON5, YAML, CSV, TSV, TOML, INI, XML, HCL, ENV via `getSelectionMapper(languageId, fileName)`.
- **Collapse and expand subtrees** - `useFlowController` with `collapsedNodes` Set and `descendantsCache`.
- **Layout rotation** - TB, BT, LR, RL via `useFlowSettings` + `SET_ORIENTATION` dispatch.
- **Edge appearance customization** - Type, animated, arrow marker via `useFlowSettings`.
- **Split View** - Status bar toggle via `jsonFlow.view.enableSplitView` / `jsonFlow.view.disableSplitView`. `jsonFlow.splitView` context key.
- **Worker cancellation** - `CANCEL` message with `requestId` matching.
- **Debounced worker invocation** - 80ms debounce to coalesce rapid updates.
- **Multi-root workspace support** - Persistent folder selection via `globalState`, runtime switching via `changeWorkspace` command. `previewedPath` fsPath guard prevents cross-folder sync.
- **WebviewPanel serialization and revival** - `registerWebviewPanelSerializer`.
- **Fetch JSON from URL** - `jsonController.fetchJsonData()`.
- **Extension host internationalization** - `vscode.l10n` with 5 language bundles (de, es, fr, it, pt-br) covering all extension host UI strings.
- **Graph search (partial)** - `GoToSearch` component provides search input, label index (`Map<string, string[]>`), exact and partial match computation, prev/next navigation, and viewport centering via `reactFlow.setCenter()`.

### 3.2 Partially Implemented Systems

The following systems have verified execution chains with missing steps:

- **Graph search highlighting** - `GoToSearch` finds and navigates matches but does not set any visual attribute (className, style, or data) on matched nodes. Matched and unmatched nodes are visually identical. Only the counter badge and viewport pan indicate a match.
- **Graph search collapsed-node awareness** - `GoToSearch` receives `renderNodes` (post-collapse-filtered). Collapsed nodes are invisible to search. No auto-expand logic exists. No indication of matches inside collapsed subtrees.
- **Format gating consistency** - `isFileTypeSupported` accepts `dockercompose` and other formats for preview, but `getSelectionMapper` has no mapper for them. Files can be previewed but Live Sync immediately pauses for these formats.
- **Collapse and sync interaction** - Collapsed nodes are invisible to `handleApplyGraphSelection`. Editor-to-Graph sync silently clears graph selection for collapsed nodes. Extension host is not notified of collapse state.

### 3.3 Observed Architectural Properties

The following properties are true at runtime:

- Workers may restart at any time.
- Worker state is not preserved across restarts, but node identity is preserved because it is derived from document content.
- Webview transient UI state (selection, collapse) is lost on reload.
- Webview data state (`data`, `orientation`, `path`, `fileName`) survives visibility changes via `acquireVsCodeApi().setState()` but not extension restarts.
- The extension maps between editor offsets and graph node IDs via format-specific `SelectionMapper` implementations.
- The webview `useReducer` is the single source of truth for flow data.
- No main-thread layout fallback exists. Worker failure results in perpetual loading state for valid trees.

## 4. System Invariants

The following invariants must hold at all times.

### Invariant 1 - Node Identity Is Deterministic

- All node IDs are JSON Pointers built via `buildPointer()` from `src/shared/node-pointer.ts`.
- The graph structural root uses `GRAPH_ROOT_ID = '__GRAPH_ROOT__'` which is not a valid JSON Pointer.
- All data-level nodes use RFC 6901 JSON Pointer IDs (starting with `/`).
- `GRAPH_ROOT_ID` and `POINTER_ROOT` belong to separate identity domains that must not collide.
- `generateTree()` is a pure function: identical JSON input produces identical node IDs.
- Worker and main-thread paths use the same `generateTree` function from the same shared module.
- The extension host's selection mapper uses the same `buildPointer` / `parsePointer` from the same `node-pointer.ts`.
- Node identity survives worker restart and reload given unchanged document content.

Under no circumstances must node identity generation logic be duplicated or diverged between execution contexts.

### Invariant 2 - Worker Is Sole Layout Authority

- The Web Worker is the only execution path that computes layout.
- `JsonLayoutWorker.ts` calls only pure functions: `generateTree()`, `getRootId()`, `layoutElementsCore()`.
- `activeRequestId` and `processingCanceled` are request-scoped and reset per `PROCESS_JSON`.
- No state restoration mechanism exists or is required.
- Workers may be created or destroyed at any time.

Workers must not be treated as state holders. No main-thread layout path exists.

### Invariant 3 - Live Sync Is Single-File and Gated

- `JSONProvider.liveSyncEnabled` defaults to `false`.
- Enabled only via `jsonFlow.view.enableLiveSync` command.
- Disabled on extension deactivation.
- Visible only when split view is active (status bar item).
- `previewedPath` fsPath guard in both directions prevents cross-file synchronization.

Loop Prevention:

- `suppressEditorSelectionEvent` flag released on next tick.
- Nonce tracking via `lastOutNonceRef`.
- De-duplication via `lastAppliedNodeId` and `lastSentNodeIdRef`.
- Origin tagging: `origin: 'webview'` or `origin: 'extension'`.

Under no circumstances must Live Sync operate across multiple files simultaneously.

### Invariant 4 - Extension Has Structural Mapping

- `jsonc-path.helper.ts` contains a full tolerant JSON/JSONC AST parser.
- `nodeIdFromOffset(text, offset)` maps cursor offset to JSON Pointer node ID.
- `rangeFromNodeId(text, nodeId)` maps JSON Pointer node ID to byte range `{start, end}`.
- Eight additional format mappers implement the same `SelectionMapper` interface.
- Format resolution occurs via `getSelectionMapper(languageId, fileName)` with languageId switch and extension fallback.

### Invariant 5 - Webview State Is Ephemeral

- Selection state exists only in React state.
- Collapse state exists only in `useFlowController` React state.
- Data state survives visibility changes via `acquireVsCodeApi().setState()`.
- State is lost on extension restart or webview disposal.
- The webview's `useReducer` is the single source of truth for flow data.

Webview state must be treated as local and transient beyond visibility changes.

### Invariant 6 - Adaptive Layout Threshold Is Fixed

- `LARGE_GRAPH_THRESHOLD = 2000` in `layout-core.ts`.
- Nodes at or below 2000: `layoutFromMap()` via entitree-flex.
- Nodes above 2000: `layoutLinearSimple()` via O(n) BFS.
- Both paths produce identical output shape via shared `createNode()` / `createEdge()`.
- entitree-flex is the sole external layout dependency.

## 5. Blocked Capabilities

The following capabilities do not exist in executable code:

- **Graph-driven document edits** - No `TextEdit`, `WorkspaceEdit`, or `applyEdit` connected to any webview message handler.
- **Editor-driven graph structural modifications** - No webview message carries edit payloads.
- **Workspace-level or cross-file graphs** - No cross-file indexing, reference detection, or (uri, nodeId) addressing.
- **Cross-file selection synchronization** - `previewedPath` guards explicitly prevent cross-file interaction.
- **Webview internationalization** - No i18n hook, no locale passed from extension, all webview UI strings are hardcoded English.

Any reference to these capabilities is invalid.

## 6. Non-Operational Symbols

The following symbols exist in code but produce no observable runtime behavior.

### 6.1 Unused Exported Symbols

| Symbol | Location | Status |
| --- | --- | --- |
| `forceSendSelection` | `useEditorSync.ts` | Returned from hook, never consumed |
| `setLiveSyncEnabled` | `useEditorSync.ts` | Returned from hook, never consumed |
| `VscodeConfigUpdate` | `webview/services/types.ts` | Used only by non-operational `updateConfig` path |
| `vscodeService.updateConfig()` | `webview/services/vscodeService.ts` | Sends message never handled by extension |
| `sampleJsonData` | `webview/helpers/mockData.ts` | Exported, never imported |
| `JsonNode` | `webview/types/index.ts` | Exported interface, never imported |
| `JsonString` | `webview/types/index.ts` | Exported type, never imported |
| `reconstructFromCompact` | `webview/hooks/useLayoutWorker.ts` | Defined, never invoked |

### 6.2 Dead Extension Host Symbols

| Symbol | Location | Status |
| --- | --- | --- |
| `JSONProvider.tryRecoverLiveSync()` | `json.provider.ts` | Defined, never called |
| `JSONProvider.updateConfigState()` | `json.provider.ts` | Defined, never called |
| `JSONProvider.configState` | `json.provider.ts` | Never meaningfully written or read |
| `JSONProvider.hostThrottleMs` | `json.provider.ts` | Never set by any code path; always `undefined` |

### 6.3 Message Contract Inconsistencies

| Message | Direction | Status |
| --- | --- | --- |
| `configUpdate` | Extension to Webview | Emitter `updateConfigState()` never called |
| `configSync` | Extension to Webview | Emitted on panel create, no webview handler |
| `updateConfig` | Webview to Extension | Extension only handles `graphSelectionChanged` |
| `PROCESSING_PARTIAL` | Worker to Main | Handler exists, worker never emits |
| `PROCESSING_PARTIAL_COMPACT` | Worker to Main | Handler exists, worker never emits |
| `PROCESSING_COMPLETE_COMPACT` | Worker to Main | Handler exists, worker never emits |

### 6.4 Unused Zod Schemas

| Schema | Location | Status |
| --- | --- | --- |
| `updateStateSchema` | `vscodeMessenger.ts` | In union, never triggered |
| `openSettings` | `vscodeMessenger.ts` | In union, never triggered |

### 6.5 Verified Structural Limitations

- Edge settings changes applied via `useFlowSettings` update controller edges. When `workerEdges` exist, the update is invisible until the next worker run.
- `descendantsCache` in `useFlowController` is O(N squared) in the worst case for flat trees.
- `onConnect` writes to controller `setEdges`, not `renderEdges`. Edge additions from user interaction are invisible when worker edges exist.
- `createSampleJsonData` is unconditionally imported in `FlowCanvas.tsx`. If Vite tree-shaking fails, `@faker-js/faker` ships in production bundle. `sampleJsonData` executes faker at module load time.

## 7. Forward Roadmap (2.4.x to 2.9.x)

### 2.4.x - Completion of Partial Systems

**Scope:**

- Complete graph search by adding node highlighting for matched nodes.
- Complete graph search by adding collapse-aware search (auto-expand or indicate matches in collapsed subtrees).
- Remove or finalize dead message routes (`configUpdate`, `configSync`, `updateConfig`).
- Remove non-operational worker message handlers (`PROCESSING_PARTIAL`, `PROCESSING_PARTIAL_COMPACT`, `PROCESSING_COMPLETE_COMPACT`) and associated types.
- Remove `reconstructFromCompact` function.

**Explicit exclusions:**

- No new message contracts.
- No identity changes.
- No worker contract changes.
- No new external dependencies.

**Architectural constraints:**

- Search highlighting must operate on existing React Flow node data attributes.
- Collapse-aware search must use existing `collapsedNodes` Set and `descendantsCache`.
- Dead code removal must not alter any operational code path.

**Backward compatibility:**

- All verified capabilities in Section 3.1 must remain operational.
- All invariants in Section 4 must hold.

### 2.5.x - Structural Hardening

**Scope:**

- Remove all non-operational symbols listed in Section 6.
- Align format gating: `isFileTypeSupported` and `getSelectionMapper` must accept the same set of formats.
- Introduce webview internationalization via locale passed from extension host.
- Remove unconditional `createSampleJsonData` import; gate mock data behind build-time exclusion.
- Eliminate `sampleJsonData` module-level faker execution.

**Explicit exclusions:**

- No identity changes.
- No worker contract changes.
- No layout algorithm changes.

**Architectural constraints:**

- Webview i18n must receive locale from extension host via message, not from build-time constants.
- Mock data must be excluded from production bundle at build time, not gated at runtime.
- Format alignment must not alter existing parser behavior.

**Backward compatibility:**

- All verified capabilities must remain operational.
- All invariants must hold.
- Extension host l10n must not be altered.

### 2.6.x - Single-File Graph Editing (Gated)

**Scope:**

- Introduce graph-driven document edits for the currently previewed single file only.
- Webview sends edit operations via a new message type.
- Extension applies `WorkspaceEdit` with document version validation.
- Editor state update propagated back to webview via existing `update` message.

**Explicit exclusions:**

- No cross-file editing.
- No workspace-level operations.
- No worker involvement in edit application.
- No changes to node identity generation.

**Architectural constraints:**

- Edit operations must flow through the extension host; the webview must not modify documents directly.
- Worker authority must not change; editing does not alter layout computation.
- Node identity must remain deterministic from document content.
- A new Zod-validated message schema must be defined for edit operations.
- Edit operations must be gated behind an explicit user setting, defaulting to disabled.

**Backward compatibility:**

- All read-only capabilities must remain fully operational when editing is disabled.
- All invariants must hold.
- Live Sync must continue functioning during and after edits.

### 2.7.x - Stabilization and Performance Hardening

**Scope:**

- Optimize `descendantsCache` computation in `useFlowController` to sub-quadratic complexity.
- Address collapse and sync interaction: extension host must be notified when graph selection is cleared due to collapse state.
- Add `requestId` to extension-to-webview `update` messages to enable stale message rejection.
- Cancel pending `setTimeout(1000ms)` in `json.controller.ts` on rapid file switching.

**Explicit exclusions:**

- No new capabilities.
- No identity changes.
- No new message types beyond `requestId` addition to existing `update` message.

**Architectural constraints:**

- `descendantsCache` optimization must not alter collapse and expand observable behavior.
- Stale message rejection must not alter successful update delivery behavior.
- File switching cancellation must not alter final-state correctness.

**Backward compatibility:**

- All capabilities must remain operational.
- All invariants must hold.

### 2.8.x - Advanced Search and Filtering

**Scope:**

- Persistent node highlighting across navigation (matched nodes visually distinct until search is cleared).
- Collapsed-node resolution: search results indicate matches inside collapsed subtrees, with option to auto-expand.
- Non-destructive filtering: hide non-matching nodes while preserving graph structure.
- Keyboard shortcuts for search navigation.

**Explicit exclusions:**

- No DOM mutation beyond existing React Flow node rendering pipeline.
- No identity changes.
- No worker involvement in search (search operates on rendered nodes only).

**Architectural constraints:**

- Highlighting must use React Flow node `className` or `data` attributes, not direct DOM manipulation.
- Filtering must operate on `renderNodes` / `renderEdges` state, not on worker output.
- Search state must remain in webview React state (Invariant 5 applies).

**Backward compatibility:**

- Graph rendering without active search must be unaltered.
- All invariants must hold.

### 2.9.x - Workspace-Level Graph (Strictly Isolated, Optional)

**Scope:**

- Multi-file graph rendering with (uri, nodeId) composite addressing.
- `FileSystemWatcher` for workspace-level file indexing.
- Cross-file reference detection for `$ref` or import-like patterns.
- Cross-file edge rendering.
- Navigation from graph node to source file.

**Explicit exclusions:**

- Under no circumstances must single-file graph behavior be altered.
- Under no circumstances must node identity generation for single-file mode change.
- Under no circumstances must worker layout authority be shared or split.

**Architectural constraints:**

- Workspace graph must be a separate, opt-in mode with its own entry point.
- Single-file identity (`buildPointer`) must not be modified; workspace identity must use a new composite addressing scheme.
- Worker must receive workspace graph data through the same `PROCESS_JSON` contract or a new, separately validated contract.
- Live Sync in workspace mode must be explicitly scoped and gated.

**Backward compatibility:**

- All single-file capabilities must remain fully operational when workspace mode is disabled.
- All invariants must hold for single-file mode.
- Workspace mode must be fully separable (removable without affecting single-file mode).

## 8. Structural Safeguards

### 8.1 Forbidden Actions

The following actions must not be executed under any circumstances without explicit escalation:

- Altering `buildPointer()`, `parsePointer()`, `GRAPH_ROOT_ID`, or `POINTER_ROOT`.
- Introducing state into the Web Worker beyond request-scoped variables.
- Enabling Live Sync to operate across multiple files.
- Adding external layout dependencies alongside or replacing entitree-flex.
- Modifying the `LARGE_GRAPH_THRESHOLD` value without performance benchmarks.
- Removing loop prevention mechanisms (suppression flag, nonce, origin tagging, de-duplication).
- Adding worker message types without Zod schema validation.
- Hardcoding API keys or secrets.

### 8.2 Escalation Rules

The following actions require explicit review and must not be executed autonomously:

- Graph-driven document editing implementation.
- Workspace-level or cross-file graph logic.
- New external runtime dependencies.
- Changes to worker message contracts.
- Changes to node identity generation.
- Changes to the `SelectionMapper` interface.
- Modifications to entitree-flex integration.

### 8.3 Permitted Autonomous Actions

The following actions may be executed without escalation:

- Refactors improving separation of concerns.
- Renaming for semantic clarity.
- Removal of symbols listed in Section 6.
- JSDoc additions for public APIs.
- Worker performance improvements that do not introduce state.
- UI styling improvements that do not alter data flow.
- Test additions.

### 8.4 Contradiction Resolution

Before introducing new features, contradictions between code and this document must be resolved.

Each contradiction must be resolved using exactly one of the following actions:

1. Remove the contradicting symbol entirely if unused.
2. Rename to explicitly indicate non-implementation.
3. Isolate behind a build-time exclusion flag.
4. Gate behind an explicit, disabled-by-default user setting.

Comments and TODOs do not resolve contradictions.

### 8.5 Interpretation Rules

- Lack of permission implies prohibition.
- If a contradiction exists between code and this document, the code defines reality until this document is updated.
- Stability has priority over expansion.
- Uncertainty requires escalation.
- Hypothesis documents, design narratives, and TODO comments have no authority.

## 9. Change Constraints

Changes to this document require:

- Corresponding executable code changes that validate the new state.
- Re-validation of all invariants listed in Section 4.
- Explicit review.

No section of this document may be modified without verifying that the change reflects executable code reality.
