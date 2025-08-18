# JSON Flow - Roadmap

This document outlines the future direction of JSON Flow, highlighting planned improvements, new features, and the overall vision for the extension. Our goal is to provide a powerful yet user-friendly tool for visualizing and interacting with structured data formats.

---

## Table of Contents

- Vision
- Current State (2.1.x)
- Next Release (2.2.0): Split View Toggle
- Subsequent Releases
  - 2.3.0: Live Sync Phase 1 (Selection)
  - 2.4.0: Live Sync Phase 2 (Editing, Multi-Format)
  - 2.5.0: Theming & VS Code Tokens (High Contrast MVP)
  - 2.6.0: Graph Search/Filter (Phased Delivery)
  - 2.7.0: Webview i18n & Language Packs
  - 2.8.0: Workspace Graph Phase 1 (Indexing & Navigation)
  - 2.9.0: Workspace Graph Phase 2 (Cross-file Live Sync & Overlay)
- Architecture & Contracts
- File Map
- Quality Gates (Acceptance & Test Matrix)
- Risks & Mitigations
- Deferred Items
- Release Cadence
- Contribution & Feedback

---

## Vision

Deliver a smooth and faithful visualization of structured data, enabling reactive bidirectional JSON ↔ Graph editing without artificial limits. Preserve the current DOM structure for compatibility with advanced customizations.

---

## Current State (2.1.x)

- Performance & Memory:
  - Incremental batch rendering with adaptive auto-tuning.
  - Compact payloads via transferable TypedArrays and preallocation/pooling to reduce GC.
  - String interning and optional preallocation hints.
  - Throttled progress updates with coalescing.
  - Iterative traversal with cycle detection and timed cancellation checks.
- Worker Resilience:
  - Per-request tokens, `PROCESSING_CANCELED`, automatic worker recreation on errors.
- UX Compatibility:
  - React Flow virtualization disabled to keep full DOM for integrations.
  - User interactions disabled until `graphReady` during processing.
- Post-processing:
  - Non-destructive; preserves 100% of nodes and edges.
- Key Decisions:
  - No artificial limits for large/deep files.
  - Preserve current DOM; no extra data attributes.
  - JSONC tolerant parsing (comments and trailing commas).

---

## Next Release (2.2.0): Split View Toggle

Goal: open the source file and the JSON Flow webview side-by-side (two columns) with a toolbar toggle, and return to a single column with the same toggle.

- Scope
  - Manual toggle in editor toolbar (editor/title).
  - Open/reveal the source text editor and the `JSONProvider` webview in adjacent columns.
  - Reversible: single column when toggled off.
  - Optional per-session preference.
  - No telemetry; no DOM changes in the webview.

- Manifest (already added in `package.json`)
  - Commands: `jsonFlow.view.enableSplitView`, `jsonFlow.view.disableSplitView`.
  - Menus: `editor/title` using `jsonFlow.splitView` and resource extname guards.

- Extension Implementation
  - Context Keys:
    - `jsonFlow.splitView`: boolean, managed via `vscode.commands.executeCommand('setContext', ...)`.
    - `jsonFlow.liveSyncEnabled`: boolean (reserved for later phases).
  - Opening Logic:
    - Show active text editor in current column; reveal/create webview panel in `ViewColumn.Beside`.
    - Reuse existing panel if present; avoid duplicates.
    - Track per-window/group state to handle multiple editor groups.
  - Closing Logic:
    - Toggle off closes or hides the webview panel and clears `jsonFlow.splitView`.
  - Edge Cases:
    - File switches, unsupported extensions, panel disposal, and group movement.

- APIs & Operations
  - `vscode.window.showTextDocument(uri, { viewColumn: ViewColumn.One|Beside, preserveFocus: true })`.
  - Webview reveal via provider (`JSONProvider`) with `ViewColumn.Beside`.
  - `setContext('jsonFlow.splitView', true|false)`.

- Acceptance Criteria
  - Toggle visible and functional only for supported file types.
  - Consistent open/reveal behavior with no duplicated panels.
  - Works across multiple groups without degrading UX.
  - State resets correctly when panel closes or file changes to unsupported type.

- Test Matrix
  - Large JSON/JSONC files; deep nesting; comments and trailing commas.
  - Multiple editor groups; move/close/reopen webview; window reload.
  - Switching between supported/unsupported files.

---

## Subsequent Releases

### 2.3.0: Live Sync Phase 1 (Selection)

- Scope
  - Bidirectional selection sync on explicit click only (no hover).
  - Graph → Editor: reveal/select text range.
  - Editor → Graph: highlight corresponding node.

- Decisions & Rules
  - Use existing index-route IDs from the worker (e.g., `root-0-2-5`).
  - No DOM attribute changes; keep current structure.
  - Manual Live Sync toggle (independent from Split View).
  - Unified selection mapper registry: `getSelectionMapper()` lives in `src/app/helpers/selection-mapper.helper.ts`.
  - Compatibility: `src/app/helpers/format-selection.helper.ts` acts as a shim and re-exports `getSelectionMapper`.

- Message Contracts
  - Extension → Webview: `EDITOR_SELECTION_CHANGED` { indexPath, requestId?, source? }.
  - Webview → Extension: `GRAPH_NODE_SELECTED` { nodeId, requestId?, source? }.
  - Bidirectional: `LIVE_SYNC_TOGGLE` { enabled }.

- Extension Implementation
  - Map indexPath ↔ JSON AST node ↔ text offsets using an internal tolerant JSON/JSONC mapper (no external dependency).
  - Visibility listeners; debounce/coalesce editor events.
  - Anti-loop guard using `requestId`/`source`.

- APIs & Operations
  - Compute editor ranges with an internal resolver (scanner/parser tolerant of comments and trailing commas) and walk parents to build `indexPath` (route-by-indices).
  - Reveal text ranges via `vscode.window.showTextDocument` + `editor.revealRange(range, InCenterIfOutsideViewport)`.
  - Debounce selection emits (75-120 ms) and coalesce rapid updates.

- Webview Implementation
  - `useEditorSync` hook to apply inbound selection (already scaffolded in `FlowCanvas.tsx`).
  - Emit `graphSelectionChanged` on node click.

- Follow-up minors
  - Editor → Graph highlight from editor selection.
  - Graph → Editor: reveal text range on node click.
  - Hardening: anti-loop, debounce/coalesce, multi-group edge cases.

- Acceptance Criteria
  - Robust selection across large/complex JSONC files.
  - Live Sync auto-pauses with banner on JSON syntax errors; resumes when fixed.
  - Entity tree compatibility: selection mapping works with custom nodes (`type: 'custom'`) and existing IDs; no reliance on extra DOM attributes.
  - No hard limits: selection sync remains responsive without imposing caps on file size or depth; degrade gracefully with debouncing and coalescing.

- Test Matrix
  - Editor → Graph and Graph → Editor selection mapping on deep objects/arrays.
  - JSON vs JSONC (comments, trailing commas); very large files.
  - Multi-group/window focus changes; rapid click bursts (debounce/coalesce verified).
  - Live Sync pause/resume on syntax errors without event loops.

### 2.4.0: Live Sync Phase 2 (Editing, Multi-Format)

- Scope
  - Immediate reactive edits (no confirmation):
    - setValue (primitives), add/remove (property/item), renameKey.

- Decisions & Rules
  - Preserve formatting/comments whenever possible; avoid DOM attribute changes.
  - Index-path is the addressing scheme for all edit operations.
  - Anti-loop via `requestId`/`source`; debounce/coalesce rapid ops.
  - Respect per-format editing modes (see Multi-Format Editing Strategy & settings).

- Message Contracts
  - Webview → Extension: `REQUEST_APPLY_JSON_EDIT` { op, indexPath, value?, key? }.
  - Extension → Webview: `EDITOR_DOC_CHANGED` diff/structural notification (optional compact form).

- Extension Implementation
  - TBD: apply minimal text edits using an internal edit engine (no external dependency) that aims to preserve comments/formatting; provide safe reprint fallback where needed.
  - Version checks (`document.version`) and anti-loop protections.

- APIs & Operations
  - JSON/JSONC minimal edits: internal edit engine (planned) with formatting options; reprint fallback when minimal preservation is not possible.
  - Apply using `WorkspaceEdit`/`TextEdit.replace(document.uri, range, newText)` with current `document.version` check.
  - Map `indexPath` ↔ offsets using internal tolerant selection helpers or format-specific helpers.
  - Notify webview (`EDITOR_DOC_CHANGED`) with compact structural hints; debounce bursts.

- Webview Implementation
  - Minimal UI affordances (inline controls/context menu) to trigger ops.
  - Compact payload compatibility maintained; no DOM attribute changes.

- Follow-up minors
  - `setValue` (primitives) via the internal minimal edit engine (when available).
  - `add/remove` (property/item) preserving formatting/comments.
  - `renameKey` with basic validations.
  - Optional: improved conflict UX and retries.

- Acceptance Criteria
  - Edits reflected immediately in both views with formatting/comments preserved.
  - Entity tree compatibility: edit operations are addressed by index paths only; graph updates without requiring structural DOM changes.
  - No hard limits: apply minimal text edits even on very large files; operations throttle/coalesce to avoid UI jank while maintaining correctness.

- Test Matrix
  - JSON/JSONC with comments and trailing commas; deep nesting; large files.
  - JSON5 in each edit mode (off/reprint/preserveIfPossible).
  - YAML/TOML limited vs reprint paths; indentation and comment preservation.
  - INI/CFG/PROPERTIES and .env line-based edits (set/add/remove) with comments retained.
  - CSV/TSV cell edits and row/column add/remove honoring header/delimiters/quotes.
  - XML/HCL limited edits with reprint fallback when necessary.

#### Multi-Format Strategy

- Goals
  - Reuse existing format-specific helpers in `src/app/helpers/` to support Live Sync for: JSON, JSONC, JSON5, YAML/YML, TOML, INI/CFG/PROPERTIES, `.env`, XML, CSV, TSV, and HCL.
  - Preserve formatting/comments wherever feasible; otherwise provide configurable, explicit fallback behaviors.

- Approach
  - Selection mapping always normalizes to JSON paths/index routes produced by the worker. No DOM attribute changes.
  - Editing applies a format-specific text edit strategy. For formats lacking CST-aware minimal edit support, fall back to reprint or disable by default (configurable).
  - Implementation: per-format selection mappers located in `src/app/helpers/*-selection.helper.ts`, orchestrated by `src/app/helpers/selection-mapper.helper.ts`.

- Format Support Matrix (initial)
  - JSON/JSONC: Selection via internal tolerant mapper (no external dependency). Editing redesigned to use an internal minimal edit engine (WIP) with best-effort comment/format preservation; configurable reprint fallback. Scope of `setValue`, `add/remove`, and `renameKey` to follow the internal engine readiness.
  - JSON5: read tolerant via `json5.parse`. Editing modes (configurable): `off` (default), `reprint` (lossy re-serialize), `preserveIfPossible` (best-effort heuristics).
  - YAML/YML: parse via helper; apply best-effort minimal edits when possible, else `reprint`. Preserve indentation and comments where feasible.
  - TOML: limited editing; prefer key/value updates and add/remove with best-effort preservation. Option to `reprint` for complex changes.
  - INI/CFG/PROPERTIES: line-based minimal edits keyed by section/key; preserve comments and spacing. Support `setValue`, `add/remove`; no nested rename.
  - .env: line-based key/value edits; preserve ordering/comments and quoting.
  - CSV/TSV: cell-level edits; add/remove row or column; preserve delimiter/quoting rules and header when present.
  - XML: basic element/attribute edits; best-effort formatting preservation; complex structural changes may `reprint`.
  - HCL: key/value and list/object edits based on normalization; preservation best-effort, allow `reprint` fallback.

- Planned Settings (per-format editing mode)
  - `jsonFlow.liveSync.editMode.json5`: `"off" | "reprint" | "preserveIfPossible"` (default: `"off"`).
  - `jsonFlow.liveSync.editMode.toml`: `"limited" | "reprint"` (default: `"limited"`).
  - `jsonFlow.liveSync.editMode.xml`: `"limited" | "reprint" | "off"` (default: `"limited"`).
  - `jsonFlow.liveSync.editMode.csvTsv`: `"cellsOnly" | "rowsAndColumns"` (default: `"cellsOnly"`).
  - `jsonFlow.liveSync.editMode.iniEnv`: `"lineBased" | "off"` (default: `"lineBased"`).

- Notes
  - All strategies maintain existing index-path mapping and compact payload contracts.
  - Lossy paths (e.g., `reprint`) will be clearly indicated in the UI copy and release notes when enabled.
  - Import compatibility: `src/app/helpers/format-selection.helper.ts` re-exports the unified registry for existing consumers.

### 2.5.0: Theming & VS Code Tokens (High Contrast MVP)

- Current state
  - Theme runtime exists in `webview/components/ThemeProvider.tsx`:
    - Uses `matchMedia('(prefers-color-scheme: dark)')` to set `html.dark` or `html.light`.
    - Custom CSS variables defined in `webview/index.css` for light (`:root`) and dark (`.dark`).
{{ ... }}
    - Accent palettes via classes (e.g., `neutral`, `blue`, ...).
    - Limited usage of VS Code tokens (e.g., `--vscode-progressBar-background` in `Loading.css`).
    - No explicit High Contrast handling yet.

- Scope
  - Align with VS Code theme (Light/Dark/High Contrast) rather than OS only.
  - Map core CSS variables to VS Code theme tokens with safe fallbacks.
  - High Contrast MVP: stronger borders/focus/minimap contrast using VS Code contrast tokens.
  - Accessibility base: visible focus and ARIA for key controls.

- Follow-up minors
  - Expand token coverage (editor, list, focus, button, badge, status).
  - High Contrast: full contrast audit and targeted visual adjustments.
  - Optional: theme override control and palette switcher; keyboard navigation and webview shortcuts (deferred if no capacity).

- Implementation
  - Detect VS Code theme:
    - Read `document.body.getAttribute('data-vscode-theme-kind')` or `vscode-light|vscode-dark|vscode-high-contrast` classes (when present in webviews).
    - Observe changes with a `MutationObserver` and update `html.dark` class and `colorMode` accordingly.
  - Token mapping with fallbacks in `webview/index.css`:
    - Example: `--background: var(--vscode-editor-background, 0 0% 100%);`
    - Keep existing HSL defaults to preserve current design.
  - High Contrast selectors:
    - Under `.vscode-high-contrast` (or theme-kind equivalent), boost borders/focus: use `--vscode-contrastBorder`, `--vscode-contrastActiveBorder`.
    - Minimap edges/nodes use HC-aware variables; no DOM attribute mutations.
  - Accessibility base: add focus outlines and ARIA labels for key controls; tab order review.
  - Compatibility: preserve entity tree structure (`type: 'custom'` nodes), avoid direct DOM mutations beyond toggling root classes.

- Acceptance Criteria
  - Theme parity: webview matches the active VS Code theme on load and switches within 200ms when the theme changes.
  - High Contrast MVP: focus/borders/minimap meet WCAG AA with VS Code contrast tokens; HC mode legible.
  - Accessibility base verified: visible focus and appropriate ARIA on main controls.
  - No hard limits: no performance caps or regressions on large graphs; no additional DOM attributes.

- Test Matrix
  - Theme changes (Light/Dark/High Contrast) reflect within 200ms; MutationObserver fires reliably.
  - Token fallbacks: verify visuals when VS Code tokens are unavailable; CSS defaults hold.
  - High Contrast: borders/focus/minimap visibility across dense graphs; keyboard focus rings visible.
  - No DOM mutations beyond root classes; entity tree unaffected.

### 2.6.0: Graph Search/Filter (Phased Delivery)

- Scope (MVP)
  - Quick search by label substring (case-insensitive) using existing node labels.
  - Navigate a single match or cycle prev/next between matches and center the viewport.
  - Maintain "no hard limits": never trim the search domain; use only optimizations (debounce/streaming).

- Follow-up minors
  - Highlight: style matches via `matchedIds` without mutating DOM attributes.
  - Result list: clickable list with jump-to-node + human-readable path and "Copy path"; index refresh on expand/collapse.
  - Hidden matches: count in collapsed branches + "Reveal match" to auto-expand to the node.
  - Optional: persist search state per session.

- Implementation
  - Index nodes after load; update the index on visibility changes (expand/collapse) or mount/unmount.
  - Highlight via global state in the webview; styles applied in `CustomNode`.
  - Derive human-readable paths from index routes when a result list is present.
  - Performance: no hard limits; apply input debounce, stream initial results, and paginate the UI list only (never limit the search domain).

- Acceptance Criteria
  - Search remains responsive on large graphs; reliable navigation between matches.
  - Follow-up minors deliver incremental value without breaking compatibility with the entity tree.
  - No hard limits: first results appear quickly; the UI remains interactive under heavy datasets.

- Test Matrix
  - Large graphs with deep nesting; rapid typing with debounce; streaming initial results.
  - Hidden matches: indicate counts and reveal path works without DOM attribute mutations.
  - Index refresh on expand/collapse and mount/unmount events; no stale IDs.
  - Theming/HC visuals remain legible; performance remains smooth.

### 2.7.0: Webview i18n & Language Packs

- Scope
  - Integrate runtime i18n in the webview using existing `l10n/bundle.l10n.*.json` files.
  - Auto-select language based on VS Code display language (extension passes locale to webview).
  - Fallback to English; ensure 100% coverage of UI strings in webview.
  - Publish translation guidelines for community contributors.

- Implementation
  - Extension: send `locale` to webview on create/reload; listen for locale changes via `onDidChangeConfiguration` (display language) and notify webview.
  - Webview: load the appropriate bundle at runtime; provide a tiny i18n helper hook (`useI18n`) with key lookup and fallback.
  - Tooling: add a script to validate missing/unused keys across bundles; document contribution steps.
  - Performance: lazy-load language bundles and cache lookups; ensure i18n initialization does not block rendering on large graphs.

- Follow-up minors
  - Infra: webview i18n hook + automatic language selection + runtime fallback.
  - Tooling: validation script, contribution docs, bundle templates.
  - Packs: add 1-2 initial community languages (e.g., es, pt) subject to PRs.

- Acceptance Criteria
  - Webview strings switch language consistently with VS Code display language.
  - No missing keys at build time (validation script passes in CI).
  - Docs include a short section for adding a new language.
  - No hard limits: language switching causes no full graph re-render; no noticeable perf regression on large/complex files.

- Test Matrix
  - Language switching at runtime; fallback to English for missing keys.
  - Bundle loading performance; lazy-load does not block large graph rendering.
  - Validation script flags missing/unused keys; CI passes; contribution guide clarity.
  - Multi-group/session consistency and persistence where applicable.

### 2.8.0: Workspace Graph Phase 1 (Indexing & Navigation)

- Scope
  - Index and visualize references across workspace files for supported formats (JSON/JSONC/JSON5, YAML/YML, TOML, XML, HCL, etc.).
  - Resolve `$ref` (JSON Schema/OpenAPI), YAML anchors/aliases, relative references between documents, and HCL modules.
  - Navigation: Go to Definition, Find Usages, Peek Definition.

- Decisions & Rules
  - Incremental index maintained by the extension (no FS access from the webview). Respect Workspace Trust.
  - Addressing via `(uri, indexPath)`; no DOM attribute mutations.
  - Reindex using workspace watchers, debouncing, and limits based on size/supported formats.
  - Remote resolution disabled by default; opt-in for network fetches (with cache and timeouts).

- Message Contracts
  - Extension → Webview: `REF_GRAPH_UPDATE` { summary: { files: number; refs: number }; edges: Array<{ from: { uri: string; indexPath: string }; to: { uri: string; indexPath: string }; kind: 'ref'|'alias'|'include' }>; requestId?: string }.
  - Webview → Extension: `REQUEST_OPEN_DEFINITION` { uri: string; indexPath: string; requestId?: string }.
  - Webview → Extension: `REQUEST_FIND_USAGES` { uri: string; indexPath: string; requestId?: string }.

- Implementation
  - Indexer: use per-format parsing helpers; detect `$ref`/anchors/links and build a graph `(uri,indexPath) ↔ (uri,indexPath)`.
  - File Watchers: `workspace.createFileSystemWatcher` with glob patterns; partial reindexing and coalescing.
  - Navigation: resolve text ranges by `(uri,indexPath)` and open/reveal with VS Code APIs.

- APIs & Operations
  - Commands: `Go to Definition`, `Find Usages`, `Peek Definition`, `Reveal in Explorer`.

- Follow-up minors
  - Inline preview of referenced nodes and cross-file breadcrumb.
  - Persistent index cache (e.g., `.jsonflow/index.json`) with safe invalidation.
  - Opt-in for cross-workspace references or multi-root monorepos.

- Acceptance Criteria
  - Definitions/Usages correctly resolved across files; fast and accurate navigation.
  - Incremental indexing stable on large workspaces; no hard limits.
  - Editor parity: correct ranges.

- Test Matrix
  - Projects with dozens of linked files; circular references; missing targets; mixed formats.
  - Rapid file changes (create/move/delete); debounced reindex without losing consistency.
  - Workspace Trust disabled: no network access; clear degraded behavior messaging.

### 2.9.0: Workspace Graph Phase 2 (Cross-file Live Sync & Overlay)

- Scope
  - Cross-file Live Sync: selection/edits in one file immediately reflect in the graph and open/reveal the target if necessary.
  - Selection synchronization Editor ↔ Webview across files using `(uri, indexPath)`.
  - Reference edge overlay with density toggle; no DOM mutations.

- Decisions & Rules
  - Respect Workspace Trust; no network access from the webview. Remote resolution opt‑in (if applicable) with cache and timeouts.
  - Address via `(uri, indexPath)` for all cross-file operations.
  - Anti-loop with `requestId`; debounce/coalesce selection/edit events.

- Message Contracts
  - Webview → Extension: `graphSelectionChanged` { uri: string; indexPath: string; requestId?: string }.
  - Extension → Webview: `EDITOR_SELECTION_CHANGED` { uri: string; indexPath: string; requestId?: string }.
  - Extension → Webview: `EDITOR_DOC_CHANGED` { uri: string; indexPath?: string; ranges?: Array<{ start: number; end: number }>; requestId?: string }.
  - Extension ↔ Webview: `LIVE_SYNC_TOGGLE` { enabled: boolean; requestId?: string }.

- Implementation
  - Editor → Webview: map editor selection/edits to `(uri, indexPath)` and reflect in the graph (center/smooth zoom; no flicker).
  - Webview → Editor: when selecting a node, open/reveal the target document and highlight the corresponding range.
  - Overlay: compute visible edges from the index and render the overlay with density controls; prefer incremental calculations.

- APIs & Operations
  - Commands: `Toggle Reference Overlay`, `Reveal in Explorer`, `Sync Selection Across Files` (enable/disable).
  - Settings: include/exclude globs for sync, rate limits (debounce), overlay state persistence.

- Follow-up minors
  - Cross-file breadcrumb and inline previews on hover.
  - Persistent index cache (e.g., `.jsonflow/index.json`) with safe invalidation.
  - Opt-in for cross-workspace references or multi-root monorepos.

- Acceptance Criteria
  - Selection/edits consistently reflected Editor ↔ Webview across files; open/reveal without losing focus.
  - Stable, configurable, and performant overlay on large repos; no DOM mutations.
  - No hard limits; clear degraded behavior with Workspace Trust disabled.

- Test Matrix
  - Rapid changes (create/move/delete) and alternating selection; no loops or jitter.
  - Multi-root/monorepo; circular references; missing targets.
  - Measure sync latency; verify no performance regressions.

---

## Architecture & Contracts

- Context Keys
  - `jsonFlow.splitView`: split view on/off.
  - `jsonFlow.liveSyncEnabled`: live sync on/off.
- Commands (manifested)
  - `jsonFlow.view.enableSplitView`, `jsonFlow.view.disableSplitView`.
  - `jsonFlow.view.enableLiveSync`, `jsonFlow.view.disableLiveSync` (UI only until phases 2.3/2.4).
- Messaging (webview/services/types.ts)
  - Outbound (webview → extension): `graphSelectionChanged`.
  - Inbound types to be added for editor events: `EDITOR_SELECTION_CHANGED`, `EDITOR_DOC_CHANGED`, `LIVE_SYNC_TOGGLE`.

### Search Indexing (Webview)

- Source of truth for IDs and labels comes from React Flow nodes created via `layoutService.createNode()`; labels mirror `TreeNode.name`.
- Index must be refreshed when the set of visible nodes changes (expand/collapse) to avoid stale IDs.
- Hidden matches strategy: either (a) auto-expand to reveal on demand, or (b) indicate hidden counts with an affordance to reveal.
- Do not mutate DOM attributes to mark matches; rely on state and props for `CustomNode`.
- No hard limits: indexing should scale to large graphs without imposing caps; prefer incremental updates and debounced recomputation.

### Developer Notes (Implementation Details)

- Message Envelope
  - Shape: `{ type: string; payload?: unknown; requestId?: string; source?: 'editor'|'webview'; ts?: number }`.
  - Generate `requestId` per interaction to prevent loops; echo it back when reflecting state.
  - Prefer a single messenger module to centralize `postMessage` and listeners.

- Split View Orchestration
  - Always reuse an existing `JSONProvider` panel if available; else create with `ViewColumn.Beside`.
  - Call `vscode.window.showTextDocument(uri, { preserveFocus: true })` before revealing the webview to avoid focus flicker.
  - Maintain a lightweight registry keyed by `documentUri.toString()` → `{ panel, groupId }` to handle multiple groups.
  - Update `jsonFlow.splitView` context only after successful reveal; clear on panel `onDidDispose` and on unsupported file switches.

- Anti-loop & Debounce
  - Maintain `lastEmittedRequestId` per channel; ignore inbound events that carry the same `requestId`.
  - Debounce timings: selection 75-120 ms; document change notifications 200-300 ms.
  - Coalesce rapid selection changes and only emit the last stable range.

- JSON/JSONC Helpers (extension side)
  - Parse and locate via an internal tolerant scanner/parser (supports comments and trailing commas; optionally unquoted keys where applicable). Implemented in `src/app/helpers/jsonc-path.helper.ts` (no `jsonc-parser` dependency for selection).
  - Selection mapping:
    - Editor → Graph: compute index route via internal location resolver and build `root-...` path (route-by-indices).
    - Graph → Editor: map `indexPath` to node ranges computed by the internal AST walk; compute `{start, end}` byte offsets for `revealRange`.
  - Minimal edits: planned internal edit engine to preserve comments/formatting where feasible; otherwise reprint fallback. No external dependency.

- Error States & UX
  - On JSON parse errors, pause Live Sync and show a small, dismissible banner in webview ("Paused due to syntax error").
  - Resume automatically once parsing succeeds; throttle banner updates to avoid flicker.
  - Never mutate DOM attributes; rely solely on existing node ids.

- Logging & Diagnostics
  - Use a dedicated OutputChannel: `JSON Flow` for debug logs.
  - Gate verbose logs behind a hidden setting or context key to avoid noise in normal usage.

- Testing Tips
  - Validate split view behavior when moving the panel across groups and after window reload.
  - Test selection on deeply nested arrays/objects and with comments/trailing commas.
  - Ensure edits via `REQUEST_APPLY_JSON_EDIT` preserve whitespace and comments.

---

## File Map

- Extension Host
  - `src/extension.ts`: command registration, context keys, panel orchestration.
  - `src/app/controllers/json.controller.ts`: high-level commands and editor coordination.
  - `src/app/providers/json.provider.ts`: webview lifecycle, messaging bridge.
- Webview
  - `webview/components/FlowCanvas/FlowCanvas.tsx`: graph interactions, `useEditorSync` wiring.
  - `webview/hooks/useEditorSync.ts`: selection/edit sync logic.
  - `webview/services/types.ts`: message types and VS Code messaging glue.
  - `webview/types/syncMessages.ts`: Live Sync message contracts (to be added).

- Core Helpers
  - `src/app/helpers/selection-mapper.helper.ts`: unified registry `getSelectionMapper(languageId, fileName?)` to resolve the per-format mapper.
  - `src/app/helpers/*-selection.helper.ts`: per-format selection mappers (json, yaml, csv, env, ini, toml, xml, hcl) that implement `SelectionMapper`.
  - `src/app/helpers/jsonc-path.helper.ts`: internal tolerant parser/mapping for JSON/JSONC (comments and trailing commas) that maps between text offsets, AST nodes, and index paths.
  - `src/app/helpers/format-selection.helper.ts`: compatibility shim that re-exports `getSelectionMapper` from the unified registry.

---

## Quality Gates (Acceptance & Test Matrix)

- Acceptance (per release)
  - Functional toggle behavior and correct context key updates.
  - No duplicate panels; clean disposal; correct behavior across groups.
  - Stable selection/edit sync with anti-looping and JSONC tolerance.
- Test Matrix
  - Files: small/large, deep nesting, JSON vs JSONC with comments/trailing commas.
  - UI: multiple groups, panel move/close/reopen, window reload.
  - Performance: CPU spikes bounded during incremental rendering; no UI jank.
  - Error States: malformed JSON, worker restart, panel recreation.

---

## Risks & Mitigations

- Event loops between editor and webview → requestId/source anti-loop guards; coalescing.
- Panel duplication or orphan panels → panel reuse, lifecycle hooks, and robust disposal.
- Performance regressions on large files → keep compact payloads and adaptive batching.
- JSONC parse failures → pause Live Sync with banner; resume on fix.
- State drift across groups/windows → per-group state tracking and context keys.

---

## Deferred Items

- Extended accessibility (keyboard navigation depth, screen reader hints beyond basics).
- Advanced localization tooling (automation with crowd platforms, screenshots in context).
- Highly customizable visualizations (advanced filters, conditional styling).
- ID/label dictionary for extra compaction (deferred due to CPU considerations).
- Webview keyboard shortcuts (e.g., dedicated Ctrl/Cmd+F, navigation/editing hotkeys) beyond basic accessibility.
- Notes/annotations on tree (out of immediate scope).
 - Extended search: key/path/value search and advanced filters.
 - Expand/Collapse All and Expand to depth N global actions.

---

## Release Cadence

- 2.2.0: Split View Toggle (immediate priority).
- 2.3.0: Live Sync Phase 1 (Selection).
- 2.4.0: Live Sync Phase 2 (Editing).
- Flexible cadence; announcements on GitHub and the project landing page.

### Semantic Versioning Policy

- MAJOR (X.0.0): breaking changes to public behavior or APIs that may require user action.
- MINOR (x.Y.0): new features and UI capabilities. All features in this roadmap ship only in MINOR releases.
- PATCH (x.y.Z): bug fixes, internal refactors, and performance improvements. No new features.

---

## Contribution & Feedback

- File issues and suggestions on GitHub.
- Sample large/complex files are especially helpful.
- PRs welcome; see contribution guidelines.

---

Thank you for supporting JSON Flow as we strive to make structured data visualization more intuitive and powerful!

