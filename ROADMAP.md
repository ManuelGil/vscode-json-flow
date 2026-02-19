# JSON Flow - Formal Technical Roadmap and Execution Contract

Version: 2.5.0
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

### 2.2.x – Architectural Foundation

- Worker established as sole layout authority.
- Deterministic RFC 6901 identity introduced.
- `GRAPH_ROOT_ID` separated from pointer domain.
- Adaptive layout threshold set to 2000.
- Live Sync (single-file) introduced.
- Layout pipeline unified.

### 2.3.x – Structural Stabilization

- Multi-format preview added (independent from Live Sync whitelist).
- SelectionMapper layer expanded.
- Partial search introduced.
- `useReducer` established as webview state authority.
- Main-thread layout fallback removed.

Preview capability does not imply Live Sync activation.

Live Sync activation is strictly controlled by the 2.5.x whitelist and must not be inferred from preview support.

Version 2.5.0 represents structural hardening and invariant consolidation.

## 3. Current Architecture (2.5.0)

### 3.1 Layout Authority

- Worker is the only layout computation path.
- Worker is stateless between requests.
- Worker calls only pure functions.
- No main-thread layout fallback exists.
- entitree-flex is present only in the Worker bundle.

### 3.2 Node Identity

- All data nodes use RFC 6901 JSON Pointers.
- All IDs generated via `buildPointer()`.
- All data node IDs start with `/`.
- `GRAPH_ROOT_ID` must not start with `/`.
- Identity generation must remain pure and shared across contexts.
- Identity must remain deterministic for identical document content.
- No additional identity domain may be introduced in 2.x.

Structural root and JSON Pointer domains are strictly disjoint and must never collide.
GRAPH_ROOT_ID must never pass through buildPointer().

## 3.3 Live Sync (2.5.0 Contract)

- Single-file only.
- Disabled by default.
- Explicit activation required.
- Guarded by `previewedPath`.
- Loop prevention via suppression flag, nonce tracking, origin tagging, and de-duplication.
- Editor → Graph throttled.
- Graph → Editor debounced.

Live Sync whitelist (frozen):

- json
- jsonc
- json5
- yaml
- yml

**No formats outside this whitelist may activate Live Sync.**

The whitelist is closed for all 2.5.x releases.

The following are explicitly prohibited:

- Filename-based heuristics.
- Implicit activation based on inferred format.
- Runtime extension of the whitelist.
- Fallback activation outside the declared list.

TOML retains SelectionMapper support but is explicitly excluded from Live Sync activation in 2.5.x.

Cross-file synchronization is prohibited.

### 3.4 Adaptive Layout Threshold

- `LARGE_GRAPH_THRESHOLD = 2000`.
- At or below threshold: entitree-flex.
- Above threshold: linear breadth-first layout.
- Output structure identical across both paths.
- entitree-flex remains the only external layout dependency.
- The linear BFS layout is an internal threshold-based strategy executed inside the Worker.

### 3.5 Webview State

- Selection, collapse, and search state are transient.
- Data, orientation, path, and file name persist across visibility changes only.
- State lost on extension restart.
- Reducer is primary UI data authority for flow state.
- Auxiliary ephemeral runtime state (refs, worker handles) exists but is not layout-authoritative.

## 4. Structural Invariants

The following must always hold:

1. Worker is sole layout authority.
2. Node identity logic must not diverge.
3. Live Sync must remain single-file.
4. Worker must remain stateless.
5. Adaptive threshold must not change without benchmark evidence and explicit version escalation.
6. No cross-file graph behavior may be introduced implicitly.
7. entitree-flex integration must not be replaced or duplicated.
8. requestId must remain mandatory in worker protocol.
9. No identity mutation during editing.
10. No shadow layout state.
11. No persistent worker state.
12. i18n domains must remain isolated.

## 5. Controlled Debt (Non-Blocking)

Acknowledged structural debt:

- descendantsCache worst-case O(N²)
- No automated invariant tests
- No automated performance benchmarks
- No schema validation layer on messaging protocol
- No runtime invariant enforcement
- Webview i18n scaffold incomplete
- dockercompose is not treated as a first-class format and is outside the 2.5.x Live Sync whitelist

## 6. Forward Progression

Forward progression describes hypothetical controlled tracks beyond 2.5.0.

Forward tracks are hypothetical and require explicit version reclassification before execution.

No forward track is automatically approved.
Each track requires explicit re-validation of all frozen invariants before execution.

Forward tracks do not imply commitment, timeline, or guarantee of implementation.

### 2.6.x – Conditional Track: Gated Single-File Editing

This track is conditional and not committed.

If pursued, it must comply with all 2.5.0 invariants.

Permitted scope:

- Graph-driven editing for the currently previewed file only.
- Editing routed exclusively through extension host.
- Use `WorkspaceEdit` with document version validation.
- Disabled by default via explicit user setting.
- Worker remains uninvolved in edit execution.
- Editing must not alter existing node identity determinism.
- Editing must not modify pointer construction rules.
- Editing must not introduce new identity domains.

Strict constraints:

- No cross-file editing.
- No identity modification.
- No Worker protocol changes.
- No Worker message shape changes.
- No layout pipeline modification.
- No introduction of layout outside Worker.
- No persistent state in Worker.
- No schema changes to existing message types.
- Any new editing message type must be strictly additive and isolated.

If any invariant conflict is detected, this track must be suspended.

## 7. i18n Isolation (Formalized in 2.5.0)

Extension Host:

- Uses `vscode.l10n`.

Webview:

- Must NOT import `vscode`.
- Uses independent localization system.
- No shared schema or translation bridge.

Worker:

- Completely language-agnostic.

Independence between domains is mandatory.

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
- Introducing shared i18n schema between host and webview.

## 9. Change Control

This document may be modified only if:

1. Executable code is updated first.
2. Invariants are re-validated.
3. Backward compatibility is preserved.
4. The version number is incremented accordingly.

No speculative changes are allowed.

## 10. Architectural Freeze Status (2.5.0)

2.5.0 is a structural hardening release.

It does not:

- Change layout authority.
- Change node identity logic.
- Change worker protocol.
- Change adaptive threshold.
- Introduce cross-file behavior.
- Expand Live Sync formats.

All invariants are considered frozen unless explicitly escalated.

Executable code defines truth.
