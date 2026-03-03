# JSON Flow — Architecture

This document describes the internal architecture, data pipeline, identity model, and structural guarantees of JSON Flow. It is intended for contributors and developers working on the codebase.

For user-facing documentation, see [README.md](README.md).

## Table of Contents

- [System Overview](#system-overview)
- [Identity Model](#identity-model)
- [Tree Construction](#tree-construction)
- [Layout System](#layout-system)
- [Search Engine](#search-engine)
- [Collapse Model](#collapse-model)
- [Projection Model](#projection-model)
- [Performance Characteristics](#performance-characteristics)
- [Structural Guarantees](#structural-guarantees)

## System Overview

JSON Flow operates as a three-layer system: Extension Host, Webview, and Web Worker. Data flows through a linear pipeline from parse to render.

```text
Extension Host: parse file → send parsed JSON to Webview
  ↓
Webview: dispatch to Worker (debounced)
  ↓
Worker: generateTree → getRootId → layoutElementsCore → return positioned nodes + edges
  ↓
Webview: workerNodes / workerEdges (immutable from this point)
  ↓
Collapse filter: visibleNodes = workerNodes.filter(n => !collapsedNodes.has(n.id))
  ↓
Parent map: buildParentMap(treeData) → child-to-parent Map<string, string>
  ↓
Search: computeMatches(term, allNodes, labelIndex) → matchIds
  ↓
Projection: searchContextSet derived per mode (highlight / focus-context / focus-strict)
  ↓
useSearchProjection: filter visibleNodes by searchContextSet, enrich with isSearchMatch
  ↓
renderNodes / renderEdges → ReactFlow
```

### Layer Responsibilities

**Extension Host** — Runs inside the VS Code process. Parses all supported file formats, handles commands and file system operations, manages Live Sync state and format gating, validates all messages received from the webview, and handles localization. The extension host never renders UI and never runs layout algorithms.

**Webview** — A sandboxed iframe running React. Renders the interactive graph, manages UI state (collapse, search, projection, settings), persists appearance settings, and computes collapse filtering, search matching, and projection. Communicates with the extension host exclusively via structured message passing. Has no access to the VS Code API, the filesystem, or extension host state.

**Web Worker** — The sole layout authority. Receives parsed JSON data and a layout direction. Executes the layout pipeline deterministically via `generateTree()`, `getRootId()`, and `layoutElementsCore()`. Returns positioned nodes and edges. Stateless: processes each request independently with no state preserved between requests. Contains no DOM dependencies or React runtime. No layout logic runs in the main thread.

## Identity Model

Every node in the graph has a deterministic identity based on its structural position in the source data. Two identity domains exist and remain disjoint.

### Data Node Identity

All data nodes are identified by RFC 6901 JSON Pointer strings (e.g. `/users/0/name`). Pointers are constructed exclusively via `buildPointer()` from `src/shared/node-pointer.ts`. This function is shared across the Worker, the main thread, and the extension host. Manual pointer concatenation does not occur anywhere in the codebase.

### Graph Root Identity

The graph structural root uses a sentinel identifier `GRAPH_ROOT_ID` (value: `'__GRAPH_ROOT__'`), defined in `src/shared/graph-identity.ts`. This sentinel is intentionally not a valid JSON Pointer — it does not start with `/` — so it can never collide with any RFC 6901 pointer derived from document content.

A development-only assertion in `generateTree()` verifies at runtime that `GRAPH_ROOT_ID` does not start with `/`.

### Stability

Node IDs are stable across re-renders for the same file content. Identity survives Worker restart given unchanged document content. This enables reliable preservation of collapse state, search results, and selection during updates.

## Tree Construction

Tree construction is performed by `generateTree()` in `webview/helpers/generateTree.ts`. This function runs inside the Web Worker.

### Behavior

`generateTree()` takes a parsed JSON value and recursively produces a `TreeMap` (a `Record<string, TreeNode>`). Each node receives:

- An `id` based on its JSON Pointer path via `buildPointer()`.
- A `name` used as the display label.
- A `data` object containing `type` (JavaScript `typeof` value) and `line` (estimated line number).
- An optional `children` array of child node IDs.

The graph root node receives `GRAPH_ROOT_ID` as its ID and `GRAPH_ROOT_LABEL` (`'Root'`) as its name. When the current node is the graph root, child JSON Pointers are built relative to `POINTER_ROOT` (`'/'`), not relative to the sentinel.

### Node Naming Conventions

- **Branch nodes** (objects and arrays): Named by their key segment via `lastSegment(parentId)`, or `GRAPH_ROOT_LABEL` for the root.
- **Leaf nodes**: Named using the format `key: value` (with `": "` as separator). This exact format is a contract: `searchService.extractKey()` and `searchService.extractValue()` depend on it.

### Line Number Tracking

Each node stores an estimated `line` number in `data.line`. This value is approximated during tree construction and used for display purposes.

### Properties

- Pure function: identical input produces identical output.
- Single recursive pass: O(N) where N is the total number of JSON values.
- Accumulator-based: builds the TreeMap in a single shared `acc` object to avoid intermediate allocations.

## Layout System

### Worker Authority

The Web Worker is the sole layout authority. Layout computation occurs exclusively inside the Worker via `layoutElementsCore()` in `webview/services/layout-core.ts`. No layout logic runs in the main thread or the extension host.

### Adaptive Layout Strategy

`layoutElementsCore()` selects a layout algorithm based on node count:

- **≤ 2000 nodes** (`LARGE_GRAPH_THRESHOLD`): `layoutFromMap()` using `entitree-flex` for hierarchical layout with optimal edge routing and spacing.
- **> 2000 nodes**: `layoutLinearSimple()` using O(N) breadth-first positioning for responsive performance on large documents.

Both paths produce identical output shape via shared `createNode()` and `createEdge()` functions. `entitree-flex` is the sole external layout dependency.

### Node Creation

`createNode()` produces a ReactFlow node with:

- `data.label`: display label from the tree node's `name`.
- `data.type`: the JavaScript `typeof` value from `tree[node.id]?.data?.type`.
- `data.direction`: layout direction.
- `data.isRoot`: whether the node is the graph root.
- `data.line`: source line number.

### Immutability

Worker output arrays (`workerNodes`, `workerEdges`) are treated as immutable after return. All downstream stages (collapse filtering, search projection, edge settings) produce new arrays and new node objects. The Worker-defined node ordering is preserved through the entire pipeline.

## Search Engine

Search is implemented in `webview/services/searchService.ts` as a set of pure functions with no React dependencies or side effects.

### Token Parsing

`parseSearchTokens(term)` splits the search string on whitespace and classifies each segment into a `ParsedToken`:

| Kind | Prefix | Behavior |
| --- | --- | --- |
| `text` | (none) | Case-insensitive substring match against node label |
| `key` | `key:` | Match the key portion of a leaf label (before `": "`) |
| `value` | `value:` | Match the value portion of a leaf label (after `": "`) |
| `type` | `type:` | Exact match against `node.data.type` |
| `path` | `path:` | Case-insensitive substring match against node ID |
| `depth` | `depth>`, `depth<`, `depth=` | Compare depth (from JSON Pointer segmentation) against threshold |

Tokens are combined with AND semantics: a node matches only when all tokens evaluate to true.

### Label Parsing

`extractKey(label)` returns the portion before the first `": "` separator, or the full label if no separator exists. `extractValue(label)` returns the portion after the first `": "` separator, or empty string. These functions depend on the `": "` format contract established by `generateTree()`.

### Depth Computation

`getDepth(nodeId)` counts `/` segments in the node ID. IDs not starting with `/` (i.e. `GRAPH_ROOT_ID`) return depth 0.

### Match Computation

`computeMatches(term, nodes, labelIndex)` parses the term into tokens and evaluates each node. For single plain-text tokens, an exact full-label index (`labelIndex`) provides a fast-path lookup. Otherwise, all nodes are filtered by evaluating all tokens per node.

### Hidden Match Handling

Match computation runs against the full Worker node set (`allNodes`). The result is partitioned in the UI layer: nodes present in the post-collapse visible set are visible matches; nodes absent are hidden matches. The hidden count is displayed as `(+N hidden)` in the search counter. When all matches are hidden, an indicator banner is shown.

## Collapse Model

Collapse is managed by `useFlowController` in the webview. State is a `Set<string>` of collapsed node IDs managed via `useReducer` with actions: `COLLAPSE_NODES`, `EXPAND_NODES`, `TOGGLE_NODE`, `RESET`.

### ParentMap Derivation

`buildParentMap(tree)` in `webview/services/treeService.ts` builds a `Map<string, string>` (child → parent) in a single O(N) pass over the tree. This map is used for:

- `computeNodesWithCollapsedDescendants()`: walks up from each collapsed node to find ancestor nodes that should display a collapse indicator. Short-circuits on already-visited ancestors.
- `collectAncestors()`: walks up from search matches to collect ancestor IDs for `focus-context` projection. Short-circuits on already-visited ancestors, ensuring each node is visited at most once across all walks.

### On-Demand Descendant Traversal

`getDescendantsOf(nodeId, tree)` in `webview/services/treeService.ts` collects all descendant IDs via iterative stack-based traversal. Complexity is O(subtree). This function is called on-demand per collapse toggle — there is no persistent descendant cache or eager precomputation.

### isCollapsed Computation

`computeNodesWithCollapsedDescendants(collapsedNodes, parentMap)` returns the set of node IDs that have at least one descendant in the collapsed set. This is used to render the collapse indicator on ancestor nodes.

### Ordering Invariant

Collapse filtering precedes search and projection. The pipeline order is:

1. Worker produces `workerNodes`.
2. Collapse filter produces `visibleNodes = workerNodes.filter(n => !collapsedNodes.has(n.id))`.
3. Search operates on `allNodes` (full Worker output) and produces `matchIds`.
4. Projection operates on `visibleNodes` and `matchIds`.

## Projection Model

Projection is computed by `useSearchProjection` in `webview/hooks/useSearchProjection.ts`. It derives `renderNodes` and `renderEdges` from `visibleNodes` and `workerEdges`.

### searchContextSet

A `Set<string> | null` computed upstream in `FlowCanvas`:

- **No active search**: `null` (no filtering applied).
- **`highlight` mode**: `null` (all visible nodes remain; match state is applied per-node).
- **`focus-context` mode**: `matchIds ∪ collectAncestors(matchIds, parentMap)`.
- **`focus-strict` mode**: `matchIds` only.

When `searchContextSet` is non-null, `visibleNodes` are filtered to only those present in the set.

### Per-Node Match State

`computeSearchMatch(nodeId, searchMatchIds, searchProjectionMode)` returns a tri-state value per node:

| Mode | Match | Non-match | No search |
| --- | --- | --- | --- |
| `highlight` | `true` (ring) | `false` (opacity 50%) | `undefined` |
| `focus-context` | `true` (ring) | `undefined` (ancestor, normal) | `undefined` |
| `focus-strict` | `undefined` (all projected are matches) | — | `undefined` |

### Edge Filtering

Edges are filtered to those where both `source` and `target` are present in the projected node set. Edge settings (type, animation, arrow) are applied after filtering.

### Immutability

`useSearchProjection` produces new node objects via spread (`{ ...node, data: { ...node.data, ... } }`) and new edge arrays. Worker output is never mutated.

## Performance Characteristics

All stages of the pipeline are designed to operate in linear time relative to the number of nodes.

- **Tree construction** (`generateTree`): Single recursive pass over the parsed JSON. O(N).
- **Layout** (`layoutElementsCore`): O(N) for both layout strategies. The hierarchical layout delegates to `entitree-flex`; the linear layout uses breadth-first positioning.
- **Collapse filter**: Single `.filter()` pass over `workerNodes`. O(N).
- **Parent map** (`buildParentMap`): Single pass over tree nodes and their children arrays. O(N).
- **Search** (`computeMatches`): Evaluates each token per node. O(N × T) where T is the number of tokens. Each token evaluation is O(1).
- **Ancestor collection** (`collectAncestors`): Walks parent chain per match. O(N) amortized — each node is visited at most once across all walks.
- **Descendant collection** (`getDescendantsOf`): O(subtree) per toggle invocation. On-demand, not cached.
- **Projection** (`useSearchProjection`): Filters and maps `visibleNodes`. O(N).

There is no quadratic computation in the pipeline. No persistent descendant storage is maintained. Memory usage is proportional to tree size: the parent map holds one entry per non-root node, and the collapsed-nodes set holds only explicitly collapsed node IDs.

Performance depends on structural complexity (depth, branching factor), not only file size. There is no hard file size cap.

## Structural Guarantees

The following properties are assumed and maintained throughout the system. They are foundational to the correct operation of identity, collapse, search, projection, and rendering.

### Identity

- The system assumes `GRAPH_ROOT_ID` does not start with `/`. It belongs to a separate domain from JSON Pointer IDs and cannot collide with any pointer derived from document content.
- The system assumes all data node IDs are valid RFC 6901 JSON Pointers, constructed exclusively via `buildPointer()`.
- The system assumes manual pointer concatenation does not occur.
- The system assumes `generateTree()` is pure: identical input produces identical output.

### Node Data

- The system assumes each node carries `data.label` (display label) and `data.type` (JavaScript `typeof` value), both set explicitly during `createNode()` from the source tree.
- The system assumes leaf node labels use the `": "` separator format. `searchService.extractKey()` and `searchService.extractValue()` depend on this.

### Pipeline

- The system assumes collapse filtering precedes projection. The pipeline order is: Worker → collapse → search → projection → render.
- The system assumes Worker output arrays are never mutated. All downstream stages produce new arrays and new node objects.
- The system assumes Worker-defined node ordering is preserved through the pipeline.
- The system assumes projection does not trigger layout recalculation.
- The system assumes search matching operates on the full Worker output; visibility partitioning uses the post-collapse node set.

### Worker

- The system assumes the Worker is the sole layout authority. No layout logic runs outside the Worker.
- The system assumes the Worker remains stateless between requests. Workers may be created or destroyed at any time.
- The system assumes `LARGE_GRAPH_THRESHOLD` is fixed at 2000. Both layout paths produce identical output shape via shared `createNode()` / `createEdge()`.

### Collapse

- The system assumes collapse state is local to the webview, managed as a `Set<string>` via `useReducer`.
- The system assumes collapse derivation walks upward via `parentMap`, not via a descendants cache.
- The system assumes the `RESET` action exists but is not dispatched on dataset swap. Stale collapse IDs referencing non-existent nodes are handled gracefully by the filter.
