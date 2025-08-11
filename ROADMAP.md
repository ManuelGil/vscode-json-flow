# JSON Flow - Roadmap

This document outlines the future direction of JSON Flow, highlighting planned improvements, new features, and the overall vision for the extension. Our goal is to provide a powerful yet user-friendly tool for visualizing and interacting with structured data formats.

---

## Table of Contents

- Vision
- Current State (2.1.x)
- Next Release (2.2.0): Split View Toggle
- Subsequent Releases
  - 2.3.0: Live Sync Phase 1 (Selection)
  - 2.4.0: Live Sync Phase 2 (Editing)
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
  - Incremental batch rendering with adaptive auto‑tuning.
  - Compact payloads via transferable TypedArrays and preallocation/pooling to reduce GC.
  - String interning and optional preallocation hints.
  - Throttled progress updates with coalescing.
  - Iterative traversal with cycle detection and timed cancellation checks.
- Worker Resilience:
  - Per‑request tokens, `PROCESSING_CANCELLED`, automatic worker recreation on errors.
- UX Compatibility:
  - React Flow virtualization disabled to keep full DOM for integrations.
  - User interactions disabled until `graphReady` during processing.
- Post‑processing:
  - Non‑destructive; preserves 100% of nodes and edges.
- Key Decisions:
  - No artificial limits for large/deep files.
  - Preserve current DOM; no extra data attributes.
  - JSONC tolerant parsing (comments and trailing commas).

---

## Next Release (2.2.0): Split View Toggle

Goal: open the source file and the JSON Flow webview side‑by‑side (two columns) with a toolbar toggle, and return to a single column with the same toggle.

- Scope
  - Manual toggle in editor toolbar (editor/title).
  - Open/reveal the source text editor and the `JSONProvider` webview in adjacent columns.
  - Reversible: single column when toggled off.
  - Optional per‑session preference.
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
    - Track per‑window/group state to handle multiple editor groups.
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
  - Use existing index‑route IDs from the worker (e.g., `root-0-2-5`).
  - No DOM attribute changes; keep current structure.
  - Manual Live Sync toggle (independent from Split View).

- Message Contracts
  - Extension → Webview: `EDITOR_SELECTION_CHANGED` { indexPath, requestId?, source? }.
  - Webview → Extension: `GRAPH_NODE_SELECTED` { nodeId, requestId?, source? }.
  - Bidirectional: `LIVE_SYNC_TOGGLE` { enabled }.

- Extension Implementation
  - Map indexPath ↔ JSON AST node ↔ text offsets using `jsonc-parser` (tolerant mode).
  - Visibility listeners; debounce/coalesce editor events.
  - Anti‑loop guard using `requestId`/`source`.

- Webview Implementation
  - `useEditorSync` hook to apply inbound selection (already scaffolded in `FlowCanvas.tsx`).
  - Emit `graphSelectionChanged` on node click.

- Acceptance Criteria
  - Robust selection across large/complex JSONC files.
  - Live Sync auto‑pauses with banner on JSON syntax errors; resumes when fixed.

### 2.4.0: Live Sync Phase 2 (Editing)

- Scope
  - Immediate reactive edits (no confirmation):
    - setValue (primitives), add/remove (property/item), renameKey.

- Message Contracts
  - Webview → Extension: `REQUEST_APPLY_JSON_EDIT` { op, indexPath, value?, key? }.
  - Extension → Webview: `EDITOR_DOC_CHANGED` diff/structural notification (optional compact form).

- Extension Implementation
  - Apply minimal text edits using `jsonc-parser.modify`, preserving comments/format.
  - Version checks (`document.version`) and anti‑loop protections.

- Webview Implementation
  - Minimal UI affordances (inline controls/context menu) to trigger ops.
  - Compact payload compatibility maintained; no DOM attribute changes.

- Acceptance Criteria
  - Edits reflected immediately in both views with formatting/comments preserved.

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

- Anti‑loop & Debounce
  - Maintain `lastEmittedRequestId` per channel; ignore inbound events that carry the same `requestId`.
  - Debounce timings: selection 75–120 ms; document change notifications 200–300 ms.
  - Coalesce rapid selection changes and only emit the last stable range.

- JSONC Helpers (extension side)
  - Parse with `jsonc-parser` in tolerant mode: `{ allowTrailingComma: true, disallowComments: false }`.
  - Selection mapping:
    - Editor → Graph: use `getLocation(text, offset)` to compute the index route; walk parents to build `root-...` path.
    - Graph → Editor: map `indexPath` to AST node; compute `{start, end}` byte offsets for `revealRange`.
  - Minimal edits: prefer `modify(text, path, value, { formattingOptions })` to preserve comments/formatting.

- Error States & UX
  - On JSON parse errors, pause Live Sync and show a small, dismissible banner in webview (“Paused due to syntax error”).
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
  - `src/app/controllers/json.controller.ts`: high‑level commands and editor coordination.
  - `src/app/providers/json.provider.ts`: webview lifecycle, messaging bridge.
- Webview
  - `webview/components/FlowCanvas/FlowCanvas.tsx`: graph interactions, `useEditorSync` wiring.
  - `webview/hooks/useEditorSync.ts`: selection/edit sync logic.
  - `webview/services/types.ts`: message types and VS Code messaging glue.
  - `webview/types/syncMessages.ts`: Live Sync message contracts (to be added).

---

## Quality Gates (Acceptance & Test Matrix)

- Acceptance (per release)
  - Functional toggle behavior and correct context key updates.
  - No duplicate panels; clean disposal; correct behavior across groups.
  - Stable selection/edit sync with anti‑looping and JSONC tolerance.
- Test Matrix
  - Files: small/large, deep nesting, JSON vs JSONC with comments/trailing commas.
  - UI: multiple groups, panel move/close/reopen, window reload.
  - Performance: CPU spikes bounded during incremental rendering; no UI jank.
  - Error States: malformed JSON, worker restart, panel recreation.

---

## Risks & Mitigations

- Event loops between editor and webview → requestId/source anti‑loop guards; coalescing.
- Panel duplication or orphan panels → panel reuse, lifecycle hooks, and robust disposal.
- Performance regressions on large files → keep compact payloads and adaptive batching.
- JSONC parse failures → pause Live Sync with banner; resume on fix.
- State drift across groups/windows → per‑group state tracking and context keys.

---

## Deferred Items

- Extended accessibility/localization (keyboard navigation, screen readers, i18n).
- Highly customizable visualizations (advanced filters, conditional styling).
- ID/label dictionary for extra compaction (deferred due to CPU considerations).
- Notes/annotations on tree (out of immediate scope).

---

## Release Cadence

- 2.2.0: Split View Toggle (immediate priority).
- 2.3.0: Live Sync Phase 1 (Selection).
- 2.4.0: Live Sync Phase 2 (Editing).
- Flexible cadence; announcements on GitHub and the project landing page.

---

## Contribution & Feedback

- File issues and suggestions on GitHub.
- Sample large/complex files are especially helpful.
- PRs welcome; see contribution guidelines.

---

Thank you for supporting JSON Flow as we strive to make structured data visualization more intuitive and powerful!

