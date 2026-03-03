# JSON Flow — 2.x Roadmap (Reformulación Estructural Conservadora)

Executable code defines runtime behavior.
This document formally defines:

- The structural baseline of version series 2.x.
- The bounded evolution permitted within 2.x.

## 1. Baseline (Version 2.6.x)

JSON Flow SHALL operate as:

- Deterministic.
- Single-file scoped.
- Graph viewer only.

### 1.1 Layout

The following layout rules are mandatory:

1. Layout execution SHALL occur exclusively inside a Web Worker.
2. The UI thread SHALL NOT execute any layout logic.
3. The Worker SHALL use `entitree-flex` as the layout engine when applicable.
4. `LARGE_GRAPH_THRESHOLD` SHALL equal 2000.
5. If node count ≤ 2000 → `entitree-flex` SHALL be used.
6. If node count > 2000 → linear breadth-first layout SHALL be used.
7. Identical input SHALL produce identical layout output.
8. The Worker SHALL be stateless between requests.
9. No layout fallback mechanism SHALL exist.
10. No incremental layout mechanism SHALL exist.
11. Layout results SHALL be committed atomically.

### 1.2 Identity

Two identity domains SHALL exist and SHALL remain disjoint:

1. `GRAPH_ROOT_ID`
2. RFC 6901 JSON Pointer node IDs

The following identity constraints SHALL apply:

1. Node IDs SHALL begin with `/`.
2. `buildPointer()` SHALL be the sole constructor for pointers.
3. Manual pointer concatenation SHALL NOT occur.
4. `GRAPH_ROOT_ID` SHALL exist outside pointer space.
5. Identity SHALL be deterministic for identical document content.
6. Identity SHALL NOT mutate during interaction.

### 1.3 Scope

The following scope constraints SHALL apply:

1. Graph mode SHALL be single-file only.
2. No cross-file graph model SHALL exist.
3. No cross-file synchronization SHALL exist.
4. No structural filtering SHALL occur inside the Worker.
5. No persistent Worker state SHALL exist.
6. Worker messages SHALL include correlation identifiers.
7. Stale Worker responses SHALL be ignored.
8. File switching SHALL invalidate prior requests safely.

### 1.4 Live Sync

The following Live Sync rules SHALL apply:

1. Live Sync SHALL be disabled by default.

2. Live Sync SHALL require explicit activation.

3. Live Sync SHALL be single-file only.

4. Only the following formats SHALL be whitelisted:

   - json
   - jsonc
   - json5
   - yaml
   - yml

5. No filename heuristics SHALL be used.

6. The Worker SHALL NOT participate in selection mapping.

7. Identity rules SHALL remain unchanged.

The 2.6.x baseline SHALL be considered mechanically complete.
Version series 2.x SHALL NOT include stabilization-only releases.
Version series 2.x SHALL NOT include hardening-only releases.

## 2. 2.x Structural Boundaries

The following properties SHALL remain unchanged throughout the entire 2.x series:

1. Layout authority SHALL remain exclusively in the Worker.
2. Identity construction rules SHALL remain unchanged.
3. Adaptive threshold behavior SHALL remain unchanged.
4. Worker protocol shape SHALL remain unchanged.
5. Single-file scope SHALL remain unchanged.
6. No additional layout engines SHALL be introduced.
7. No incremental layout SHALL be introduced.
8. No structural pruning SHALL occur inside the Worker.
9. No persistent Worker cache SHALL be introduced.
10. No cross-file behavior SHALL be introduced.

## 3. Minor Versions

Minor versions SHALL introduce observable behavior changes.
Such changes SHALL remain within the existing structure.

Minor versions SHALL NOT modify:

- Layout authority.
- Identity rules.
- Threshold behavior.
- Protocol shape.
- Single-file scope.

### 3.1 Version 2.7.0 (Released) — Explorability & Search Ergonomics

#### Scope

Version 2.7.0 provides the following behaviors:

1. Refined search highlight clarity.
2. Clear visual distinction between selection and search matches.
3. Indication of matches located inside collapsed subtrees.
4. Improved keyboard navigation.
5. Optional, non-destructive UI-level filtering.

The following invariants apply to filtering:

1. Filtering SHALL NOT mutate graph data.
2. Filtering SHALL NOT modify Worker output.
3. Filtering SHALL NOT change layout ordering.
4. Filtering SHALL NOT alter identity values.

#### Constraints

1. No layout recalculation SHALL occur outside the existing pipeline.
2. No structural pruning SHALL occur inside the Worker.
3. Identity SHALL NOT mutate.
4. No new persistent state domains SHALL be introduced.
5. No multi-file behavior SHALL be introduced.

### 3.2 Version 2.8.0 — Controlled Graph Editing (Single-File)

#### Scope

Version 2.8.0 SHALL introduce controlled editing under the following rules:

1. Editing SHALL be mediated exclusively through the Extension Host.
2. Changes SHALL be applied using `WorkspaceEdit`.
3. Document version validation SHALL be required.

The following actions SHALL be supported:

- Add node.
- Remove node.
- Update value.
- Rename key.
- Deterministic sibling reordering.

Post-mutation processing SHALL follow these rules:

1. After mutation, the document SHALL be fully reprocessed through the existing pipeline.
2. No incremental layout SHALL be introduced.
3. The Worker SHALL remain uninvolved in mutation logic.
4. `buildPointer()` SHALL remain the sole pointer constructor.
5. No new identity domains SHALL be introduced.

#### Constraints

1. No cross-file editing SHALL be allowed.
2. No layout algorithm modification SHALL occur.
3. No adaptive threshold modification SHALL occur.
4. No persistent Worker state SHALL be introduced.
5. No protocol redesign SHALL occur.

### 3.3 Version 2.9.0 — Webview Localization Isolation

#### Scope

Version 2.9.0 SHALL introduce an isolated Webview localization mechanism under the following rules:

1. Localization within the Webview SHALL be independent.
2. `vscode.l10n` SHALL NOT be imported inside the Webview.
3. No shared translation schema SHALL exist.
4. No runtime bridge SHALL exist between localization systems.
5. A dictionary-based mapping mechanism SHALL be used.
6. Fallback behavior SHALL be supported.
7. The Worker SHALL NOT be involved in localization.
8. No protocol changes SHALL occur.
9. At least one additional functional locale SHALL be provided.

#### Constraints

1. No host ↔ webview localization contract SHALL exist.
2. No runtime translation engines SHALL be introduced.
3. No dynamic remote translation loading SHALL occur.
4. No structural changes SHALL occur to layout.
5. No structural changes SHALL occur to identity.
6. No heavy i18n frameworks SHALL be introduced.
