# JSON Flow - Technical ROADMAP

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

## 2. Verified System State

This section defines the complete set of capabilities that currently exist.

### 2.1 Existing Capabilities

The system supports all of the following:

- Parsing of JSON and JSONC
- Graph rendering using React Flow
- Layout computation using Web Workers
- Automatic fallback to main-thread computation
- Stateless worker execution
- Local node selection within the webview
- Split View between editor and webview
- One-way message passing without synchronization guarantees

Any capability not listed here must be treated as non-existent.

### 2.2 Observed Architectural Properties

The following properties are true at runtime:

- Workers may restart at any time
- Worker state is not preserved
- UI state is not persisted across reloads
- The editor has no knowledge of graph structure
- The graph has no knowledge of editor offsets

These properties define the operational boundary of the system.

## 3. System Invariants

The following invariants must hold at all times.

### Invariant 1 - Node Identity Is Not Stable

- Worker-generated node identifiers are positional
- Main-thread fallback identifiers are semantic
- Identifiers change across worker restarts
- No normalization or reconciliation exists

No logic may assume node identifier stability.

### Invariant 2 - Workers Are Stateless

- Workers may be created or destroyed at any time
- All internal worker state is lost on restart
- No state restoration mechanism exists

Workers must not be treated as authorities or state holders.

### Invariant 3 - No Synchronization Protocol Exists

- Messages lack request identifiers
- Message ordering is not guaranteed
- No acknowledgment or rejection exists
- Loop prevention is not implemented

Bidirectional synchronization must not be implemented.

### Invariant 4 - Extension Has No Structural Mapping

- No AST-to-offset mapping exists
- No offset-to-node mapping exists
- Editor selection events are not processed

The extension cannot map between editor state and graph structure.

### Invariant 5 - Webview State Is Ephemeral

- Selection state exists only in React state
- State is lost on reload
- No shared authority exists with the extension

Webview state must be treated as local and transient.

## 4. Blocked Capabilities

The following capabilities must not exist in code, UI, or documentation:

- Editor ↔ Graph selection synchronization
- Graph-driven document edits
- Editor-driven graph updates
- Workspace or cross-file graphs
- Search or filtering based on node identity
- Features requiring stable node identifiers

Any reference to these capabilities is invalid.

## 5. Mandatory Correction Process

Before introducing new features, contradictions must be resolved.

### 5.1 Contradiction Identification

The system must identify symbols, files, or UI elements that imply blocked capabilities.

Examples include:

- Synchronization-related hooks or services
- Flags implying active synchronization
- UI toggles implying bidirectional behavior
- Placeholder handlers for blocked features

### 5.2 Contradiction Resolution

Each contradiction must be resolved using exactly one of the following actions:

1. Rename to explicitly indicate non-implementation
2. Move to an `_experimental` or `_scaffold` namespace
3. Isolate behind disabled or inert states
4. Remove entirely if unused

Comments or TODOs do not resolve contradictions.

## 6. Permitted Autonomous Actions

The following actions may be executed without escalation:

- Refactors improving separation of concerns
- Renaming for semantic clarity
- Identification of dead code
- Documentation reclassification
- Worker performance improvements without state
- UI improvements not dependent on identity
- JSDoc additions for public APIs

## 7. Restricted Actions

The following actions require escalation and must not be executed automatically:

- Synchronization logic of any form
- Identity persistence mechanisms
- Editor ↔ graph coupling
- Assumptions of identifier stability
- Promotion of blocked capabilities

Such actions must be classified as conflicts and documented separately.

## 8. Capability Promotion Conditions

A blocked capability may only be reconsidered if all of the following are true:

- Node identifiers are deterministic across all execution paths
- The extension is the single source of truth
- A formal synchronization protocol exists
- AST ↔ offset ↔ node mapping is implemented
- Workers remain stateless processors

If any condition is unmet, the capability remains blocked.

## 9. Interpretation Rules

- Lack of permission implies prohibition
- Hypothesis documents have no authority
- Stability has priority over expansion
- Uncertainty requires escalation

## 10. Change Constraints

Changes to this document require:

- Corresponding executable code changes
- Re-validation of all invariants
- Explicit review
