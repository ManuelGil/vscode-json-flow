# JSON Flow — Formal Technical Roadmap and Execution Contract

Version: 2.5.0
Scope: Single-file graph mode unless explicitly stated otherwise.

This document expresses strategic intent and architectural constraints.

Executable code defines runtime truth.
In case of contradiction, the codebase prevails.

This document contains three distinct categories of information:

1. Verified executable state (validated against the repository).
2. Structural invariants and governance constraints.
3. Versioned forward progression (design intent).

Only verified executable state reflects current runtime reality.
Forward progression sections represent planned intent and are not executable truth until implemented and revalidated.

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

## 4. Structural Baseline (2.5.0)

This section describes the structural characteristics of version 2.5.0.

These characteristics define the current architectural baseline.
They reflect implemented behavior at the time of release.

If future versions modify any of these characteristics,
a new architectural baseline should be declared.

### 4.1 Layout Authority

- Layout computation occurs exclusively inside the Web Worker.
- The main thread does not execute layout logic.
- `layoutElementsCore()` is invoked from the Worker context.
- The adaptive threshold mechanism operates inside the Worker.
- No alternative layout engine is present.

This reflects the 2.5.0 runtime structure.

### 4.2 Identity Model

The system contains two identity domains:

1. Structural root identifier (`GRAPH_ROOT_ID`)
2. Data node identifiers (RFC 6901 JSON Pointers)

Characteristics:

- Data node identifiers are generated through `buildPointer()`.
- Data node identifiers begin with `/`.
- `GRAPH_ROOT_ID` does not begin with `/`.
- Identity generation is deterministic based on document content.

This separation defines the identity structure of 2.5.0.

### 4.3 Live Sync Scope

Live Sync behavior in 2.5.0 is limited to:

- Single-file context
- Explicit activation
- Whitelisted formats:
  - json
  - jsonc
  - json5
  - yaml
  - yml

Live Sync behavior is implemented through Extension Host mediation.
The Worker is not involved in selection mapping.

### 4.4 Adaptive Threshold

- `LARGE_GRAPH_THRESHOLD = 2000`
- At or below threshold: entitree-flex layout
- Above threshold: linear breadth-first layout
- Both paths produce identical node and edge structures

The threshold is encapsulated within the Worker.

### 4.5 Worker State Model

- The Worker processes requests independently.
- No persistent cache is maintained between requests.
- `requestId` is part of the messaging protocol.
- Cancellation is supported.

This describes current operational behavior.

### 4.6 Webview State Model

- Flow state is managed through a reducer.
- Worker output is projected into render nodes and edges.
- Transient UI state (selection, collapse, search) remains local to the Webview.
- No layout computation occurs in the UI thread.

### 4.7 Interpretation Rule

Section 4 documents implemented architectural structure in 2.5.0.

It is descriptive of runtime behavior,
not prescriptive of all future possibilities.

If architectural structure changes in a later version,
this section should be updated alongside the new baseline.

## 5. Observed Limitations and Non-Blocking Considerations (Non-Binding)

This section documents known characteristics and areas that may warrant future attention.

It is descriptive, not prescriptive.

It does not imply defect, failure, or required remediation.
It does not create implementation obligation.
It does not define a deadline.
It does not represent an approved work queue.

All items listed here are informational.

### 5.1 Performance Characteristics

Certain internal mechanisms may have performance characteristics that could become relevant at scale.

Examples include:

- Tree traversal operations that may exhibit non-linear behavior in extreme cases.
- Rendering overhead under very large node counts.
- React reconciliation costs during rapid state transitions.

These characteristics are not classified as defects.

They are normal trade-offs within the current architectural model.

No performance change is required unless measurable degradation is demonstrated.

### 5.2 Testing and Verification Scope

The project intentionally operates without unit tests as a strategic decision.

There is:

- No automated invariant verification layer.
- No automated deterministic snapshot validation.
- No formal benchmark harness.

This is an explicit trade-off, not an omission.

Future reconsideration of verification mechanisms would require a separate architectural evaluation phase.

### 5.3 Messaging Contract Validation

The current message protocol between Extension Host, Webview, and Worker is stable and deterministic.

However:

- There is no schema validation layer.
- There is no runtime structural enforcement beyond TypeScript typing.

This is acceptable under the current scope.

No additional validation layer is required unless protocol complexity increases.

### 5.4 Bundle Inspection and Artifact Transparency

Manual verification confirms separation of Worker and main bundles.

There is currently:

- No automated bundle size regression guard.
- No automated duplicate dependency detection layer.

These are operational observations, not architectural weaknesses.

### 5.5 Format Classification Boundaries

Some formats rely on host classification (e.g., YAML-based file types).

The system does not attempt semantic differentiation beyond declared scope.

This is intentional.

Future refinement of format classification would require explicit scope expansion.

## 5.6 Interpretation Rule

Section 5 is informational only.

It does not:

- Mandate remediation.
- Define backlog.
- Imply hidden instability.
- Create technical debt pressure.

All items remain optional for future evaluation.

Executable code defines current system truth.

## 6. Forward Design Tracks (Directional — Non-Contractual)

This section outlines a possible evolutionary path beyond 2.5.0.

These tracks describe strategic direction.
They are not commitments or delivery guarantees.
They illustrate how the system could evolve while preserving its architectural baseline.

Future versions become real only when implemented in code.

### 2.6.0 — Perceptual Stability

Theme:
Make the system feel calmer without changing what it does.

Focus:
Refine visual and interaction polish while leaving architecture untouched.

Identity:
A refinement release centered on perceived smoothness and visual consistency.

Typical scope examples:

- Reduction of perceptual jitter.
- Scroll centering refinement.
- Minor alignment adjustments.
- Subtle UI consistency improvements.

This version strengthens confidence without expanding capability.

### 2.7.0 — Interaction Resilience

Theme:
Strengthen behavior under stress.

Focus:
Improve predictability during rapid interaction and larger data scenarios.

Identity:
A reinforcement release focused on making interactions feel dependable.

Typical scope examples:

- Cancellation flow refinement.
- Rapid file switching handling.
- Collapse and selection consistency improvements.

This version reinforces stability beyond visual polish.

### 2.8.0 — Explorability Enhancement

Theme:
Improve how users navigate and discover structure.

Focus:
Enhance search and navigation ergonomics without altering computation.

Identity:
A usability-centered release aimed at making structure easier to explore.

Typical scope examples:

- Improved search highlighting behavior.
- Clearer collapsed subtree indicators.
- Keyboard navigation refinements.
- Optional non-destructive filtering view.

This version deepens usability while preserving determinism.

### 2.9.0 — System Transparency

Theme:
Make internal behavior more visible.

Focus:
Improve development-time observability without affecting production behavior.

Identity:
A developer-experience release increasing inspectability and clarity.

Typical scope examples:

- Optional debug views.
- Development overlays.
- Layout execution visibility tools.

This version clarifies how the system behaves internally.

### 2.10.0 — Performance Insight

Theme:
Understand limits before changing them.

Focus:
Introduce measurement capability to inform future decisions.

Identity:
An introspection release enabling data-informed reasoning.

Typical scope examples:

- Lightweight internal metrics.
- Large graph timing visibility (development scope).
- Controlled benchmarking utilities.

This version builds understanding without modifying behavior.

### 2.11.0 — Controlled Capability Expansion

Theme:
Careful extension of interaction boundaries.

Focus:
Explore graph-assisted editing within single-file constraints.

Identity:
An exploratory capability release expanding interaction carefully and incrementally.

Typical scope examples:

- Extension-host mediated edit operations.
- Graph-assisted structure manipulation experiments.
- UI-assisted editing workflows.

This version represents cautious expansion grounded in prior stabilization.

### 2.12.0 — Structural Consolidation

Theme:
Refine through simplification.

Focus:
Reduce surface complexity and reinforce clarity.

Identity:
A consolidation release emphasizing coherence and maintainability.

Typical scope examples:

- Removal of unused UI elements.
- Documentation consolidation.
- Minor internal cleanup.
- Redundant state reduction.

This version stabilizes the gains of previous iterations.

### Interpretation Reminder

The progression above represents directional intent.
It illustrates a possible maturation path:

Perception → Stability → Usability → Transparency → Insight → Expansion → Consolidation.

It does not constitute a binding release plan.
Executable code defines runtime behavior.

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
