# JSON Flow - Structured JSON Graph Explorer for VS Code

[![VS Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/imgildev.vscode-json-flow?style=for-the-badge&label=VS%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![VS Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![VS Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![VS Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow&ssr=false#review-details)
[![GitHub Repo Stars](https://img.shields.io/github/stars/ManuelGil/vscode-json-flow?style=for-the-badge&logo=github)](https://github.com/ManuelGil/vscode-json-flow)
[![GitHub License](https://img.shields.io/github/license/ManuelGil/vscode-json-flow?style=for-the-badge&logo=github)](https://github.com/ManuelGil/vscode-json-flow/blob/main/LICENSE)

JSON Flow is a VS Code extension for exploring structured data as an interactive graph. Search across the entire graph using structured tokens - `key:`, `value:`, `type:`, `path:`, `depth>` - and apply projection modes to highlight, isolate, or focus matched nodes with their ancestor chain.

Supports JSON, JSONC, JSON5, YAML, TOML, XML, CSV, HCL, and more through the same graph interface. Editing is available only for JSON-based files. Layout is computed in a background worker. Built for developers working with structured data. Fully local. No telemetry. Open-source.

![JSON Flow Demo](https://raw.githubusercontent.com/ManuelGil/vscode-json-flow/main/assets/images/json-flow-1.gif)

## Why JSON Flow?

- **Explore deeply nested structures** - Navigate JSON as a full node graph where every object, array, and value is a visible, interactive element - regardless of nesting depth.
- **Search with structured tokens** - Find nodes by key, value, data type, JSON Pointer path, or structural depth (`key:`, `value:`, `type:`, `path:`, `depth>`) with composable AND logic.
- **Project search results in context** - Three projection modes: highlight matches across the full graph, show matches with their ancestor chain, or isolate matches exclusively.
- **Collapse and expand** - Fold any branch to reduce clutter. Hidden match indicators tell you when search results exist inside collapsed subtrees.
- **Background layout computation** - Layout is computed in a background worker.
- **Multi-format graph pipeline** - JSON, JSONC, JSON5, YAML, TOML, XML, CSV, INI, ENV, HCL - all parsed and rendered through the same graph interface.
- **Sync with your editor** - Bidirectional Live Sync links your editor cursor to the graph. Click in one, jump in the other.
- **Export and generate** - Save graphs as PNG, JPG, or SVG. Convert formats to JSON. Generate typed code in 20+ languages.

### How It Works

JSON Flow parses your file, converts it into a tree structure, and computes a deterministic graph layout in a background worker. The resulting graph is rendered in a VS Code webview panel where you can search, collapse, and apply projection modes without blocking the editor.

## Why This Extension Stands Out

- **Graph-first exploration.** Most JSON visualization tools present data as collapsible outlines or formatted text. JSON Flow renders a full node graph where every object, array, and value is a visible, navigable element - making structural relationships immediately apparent regardless of nesting depth.
- **Structured search beyond text matching.** Beyond simple text search, JSON Flow supports composable query tokens: `key:`, `value:`, `type:`, `path:`, and `depth>` / `depth<` / `depth=`. Combine multiple tokens with AND logic to express precise structural queries across the entire graph.
- **Projection modes for focused analysis.** Search results can be visualized in three ways: highlight matches while keeping the full graph visible, show only matches and their ancestor path for structural context, or isolate matches exclusively. This enables targeted analysis without losing orientation.
- **Responsive graph rendering.** Graph layout is computed in a dedicated background worker. Performance depends on graph size, depth, and edge density.
- **Multiple formats, one interface.** JSON, JSONC, JSON5, YAML, TOML, INI, ENV, XML, CSV, TSV, HCL, Docker Compose, and Properties are supported for graph preview and conversion.
- **Bidirectional editor-graph synchronization.** Live Sync connects your editor cursor to the graph in both directions. Click a line in the editor to focus the corresponding node; click a node to jump to its source location. Selection mapping is format-aware.
- **Deterministic, stable layout.** The same file content always produces the same graph layout. Node identities remain stable across re-renders, so collapse state, search results, and navigation position are preserved during updates.
- **Collapse-aware search.** When search matches exist inside collapsed branches, the match counter reports them as hidden. You always know whether results are obscured by the current view state.
- **Code generation in 20+ languages.** Generate typed data structures from any supported file using quicktype - TypeScript, Python, Rust, Go, Java, Kotlin, C#, and more.
- **Cross-editor compatibility.** Works with VS Code, VSCodium, Cursor, WindSurf, and any VS Code-compatible editor or platform.
- **Fully local, fully private.** All parsing, layout, search, and rendering runs inside your editor. No data is transmitted. No telemetry. No analytics. No external dependencies at runtime.

## Table of Contents

- [JSON Flow - Structured JSON Graph Explorer for VS Code](#json-flow---structured-json-graph-explorer-for-vs-code)
  - [Why JSON Flow?](#why-json-flow)
    - [How It Works](#how-it-works)
  - [Why This Extension Stands Out](#why-this-extension-stands-out)
  - [Table of Contents](#table-of-contents)
  - [Supported Formats](#supported-formats)
  - [Format Capability Matrix](#format-capability-matrix)
  - [Installation](#installation)
  - [Getting Started](#getting-started)
  - [Interactive JSON Graph Visualization](#interactive-json-graph-visualization)
  - [Graph Editing (Experimental)](#graph-editing-experimental)
  - [Editing Constraints](#editing-constraints)
  - [How Editing Works](#how-editing-works)
  - [Safety Model](#safety-model)
  - [Graph Export](#graph-export)
  - [Structured Search \& Projection](#structured-search--projection)
    - [Structured Tokens](#structured-tokens)
    - [Projection Modes](#projection-modes)
    - [Hidden Matches](#hidden-matches)
    - [Search Lifecycle](#search-lifecycle)
  - [Live Sync](#live-sync)
  - [Format Conversion \& Partial Operations](#format-conversion--partial-operations)
  - [Code Generation](#code-generation)
  - [Fetch JSON from URL](#fetch-json-from-url)
  - [Appearance and Settings](#appearance-and-settings)
  - [Explorer and File Management](#explorer-and-file-management)
  - [Split View Mode](#split-view-mode)
  - [Commands](#commands)
  - [Configuration](#configuration)
  - [Performance \& Scalability](#performance--scalability)
  - [Limitations](#limitations)
  - [Technical Overview](#technical-overview)
  - [Security and Privacy](#security-and-privacy)
  - [Internationalization (i18n)](#internationalization-i18n)
  - [Requirements](#requirements)
  - [Troubleshooting](#troubleshooting)
  - [Contributing](#contributing)
  - [Code of Conduct](#code-of-conduct)
  - [Changelog](#changelog)
  - [Support and Contact](#support-and-contact)
  - [Other Extensions](#other-extensions)
  - [Recommended Browser Extension](#recommended-browser-extension)
  - [License](#license)

## Supported Formats

JSON Flow supports preview, conversion, and graph visualization for:

- JSON / JSONC / JSON5
- YAML (`.yaml`, `.yml`)
- TOML
- INI / CFG / Properties
- ENV (`.env`, `.env.*`)
- XML
- CSV / TSV
- HCL
- Docker Compose

Editing is supported only for JSON, JSONC, and JSON5.

## Format Capability Matrix

| Format         | Parse | Graph Preview | Convert to JSON | Code Generation | Live Sync | Sync Strategy |
| -------------- | ----- | ------------- | --------------- | --------------- | --------- | ------------- |
| JSON           | ✓     | ✓             | -               | ✓               | ✓         | AST-based     |
| JSONC          | ✓     | ✓             | -               | ✓               | ✓         | AST-based     |
| JSON5          | ✓     | ✓             | -               | ✓               | ✓         | AST-based     |
| YAML (.yaml)   | ✓     | ✓             | ✓               | ✓               | ✓         | Line-based    |
| YAML (.yml)    | ✓     | ✓             | ✓               | ✓               | ✓         | Line-based    |
| TOML           | ✓     | ✓             | ✓               | ✓               | ✗         | Standard      |
| INI / CFG      | ✓     | ✓             | ✓               | ✓               | ✗         | Standard      |
| Properties     | ✓     | ✓             | ✓               | ✓               | ✗         | Standard      |
| ENV            | ✓     | ✓             | ✓               | ✓               | ✗         | Standard      |
| XML            | ✓     | ✓             | ✓               | ✓               | ✗         | Standard      |
| CSV            | ✓     | ✓             | ✓               | ✓               | ✗         | Standard      |
| TSV            | ✓     | ✓             | ✓               | ✓               | ✗         | Standard      |
| HCL            | ✓     | ✓             | ✓               | ✓               | ✗         | Standard      |
| Docker Compose | ✓     | ✓             | ✓               | ✓               | ✗         | -             |

Live Sync is available for `json`, `jsonc`, `json5`, `yaml`, and `yml` only. Formats like `toml` and `dockercompose` are explicitly excluded.

## Installation

1. Open VS Code or any VS Code-compatible editor.
2. Go to the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **JSON Flow**.
4. Click **Install**.

Alternatively, install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow).

## Getting Started

1. Open any supported file (JSON, YAML, TOML, etc.).
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run **JSON Flow: Show Preview**.

The graph panel opens and renders your file as an interactive JSON explorer.

## Interactive JSON Graph Visualization

Explore structured data visually in the JSON graph view:

- **Zoom and pan** - Scroll to zoom, drag empty space to pan, use Fit View to center the graph.
- **Minimap** - Quick orientation via the minimap in the corner.
- **Node details** - Click any node to inspect its details.
- **Collapse and expand** - Toggle any node with children to fold or unfold its subtree. Reduces clutter and improves navigation in large and deeply nested files.
- **Layout direction** - Rotate through Top-Bottom (TB), Left-Right (LR), Bottom-Top (BT), and Right-Left (RL).
- **Draggable nodes** - Reposition nodes freely; lockable via the interactivity toggle.
- **Deterministic layout** - Computed in a background Web Worker.

## Graph Editing (Experimental)

JSON Flow supports direct editing for JSON-based files from the graph view.

Supported actions:

- Rename key
- Update value
- Add child node
- Delete node

## Editing Constraints

Editing is supported only for JSON-based formats:

- JSON
- JSONC
- JSON5

Editing is not supported for:

- YAML
- TOML
- XML
- CSV / TSV
- INI / ENV
- HCL / Docker Compose

## How Editing Works

- Edits are handled by the VS Code Extension Host.
- Changes are applied through a full-document `WorkspaceEdit`.
- The graph is regenerated after the document changes.
- No local mutations are performed in the graph.

## Safety Model

- No optimistic UI updates.
- All edits are validated before applying.
- The document is the single source of truth.
- The graph is always derived from the file.

## Graph Export

Export the current JSON visualization from the toolbar inside the graph panel.

- **Formats**: PNG, JPG (2× pixel ratio), SVG, or Clipboard (PNG blob).
- **Options**: Custom filename, background color (hex/preset/transparent).
- **Clean output**: UI chrome (controls, minimap) is automatically excluded.

Use Fit View before exporting to ensure the full graph is captured.

## Structured Search & Projection

JSON Flow includes a structured search engine with composable query tokens and three projection modes for filtering the JSON graph view.

- Case-insensitive and debounced (250ms). Minimum 2 characters to activate.
- Enter commits search immediately, bypassing debounce.
- Exact full-label match priority with indexed lookup.
- Prev/Next navigation with match counter.
- Hidden match indicator when matches exist inside collapsed branches.

### Structured Tokens

Search terms are whitespace-separated and combined with implicit **AND** semantics.

| Token     | Format       | Description                                                                      |
| --------- | ------------ | -------------------------------------------------------------------------------- |
| `text`    | plain text   | Case-insensitive label substring match                                           |
| `key:`    | `key:term`   | Match the key portion of a `key: value` leaf label                               |
| `value:`  | `value:term` | Match the value portion of a `key: value` leaf label                             |
| `type:`   | `type:term`  | Match node data type (exact match, e.g. `string`, `number`, `object`, `boolean`) |
| `path:`   | `path:term`  | Match against the node's JSON Pointer path (substring)                           |
| `depth>n` | `depth>2`    | Match nodes with structural depth greater than `n`                               |
| `depth<n` | `depth<5`    | Match nodes with structural depth less than `n`                                  |
| `depth=n` | `depth=3`    | Match nodes with structural depth equal to `n`                                   |

Example:

```text
key:user type:string depth>2
```

A node matches only when all tokens are satisfied. Matches are computed against the full graph, then partitioned into visible and hidden based on the current collapse state.

### Projection Modes

Control how matched and non-matched nodes appear in the interactive JSON explorer:

| Mode            | UI Label | Behavior                                                                                                        |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `highlight`     | All      | Full visible graph rendered. Matches receive a visual ring; non-matches are attenuated (opacity 50%).           |
| `focus-context` | Tree     | Only matches and their ancestor chain are rendered. Matches receive a ring; ancestors appear at normal opacity. |
| `focus-strict`  | Only     | Only matched nodes are rendered. All projected nodes are matches.                                               |

Projection operates after collapse filtering and affects rendering only. No layout recalculation occurs. Edges include only those where both endpoints are present in the projected node set.

### Hidden Matches

The match counter displays `(+N hidden)` when additional matches exist outside the current visible projection:

- Collapsed branches (**highlight** mode): matches under collapsed subtrees are not visible.
- Projection filtering (**focus-context** mode): matches exist but ancestor filtering excludes some.

When all matches are hidden (no visible matches), an indicator banner appears.

In **focus-strict** mode, all projected nodes are matches by definition.

### Search Lifecycle

- Typing updates input only.
- Debounce (250ms) or Enter commits search.
- Minimum 2 characters required to activate search.
- Explicit clear resets search and projection.
- Closing the panel or changing dataset resets search.
- Navigation operates on the current render projection.
- Clearing the input field alone does not clear the active search; only the Clear button does.

## Live Sync

Bidirectional synchronization between the editor cursor and the JSON graph view. Click in the editor to focus the corresponding graph node, or click a graph node to jump to its source location.

**Supported formats:** `json`, `jsonc`, `json5`, `yaml`, `yml`

**How to enable:**

1. Open a file in Split View (`Ctrl+Alt+F` / `Cmd+Alt+F`).
2. Enable Live Sync via the Title Bar button or the command **JSON Flow: Enable Live Sync**.

**Behavior:**

- **Disabled by default.** Requires explicit activation.
- **Mouse-only.** Triggered by clicks, not keyboard or hover.
- **Context-aware.** Active document must match the previewed file.
- **Throttled.** Configurable delay (default 100ms).
- **Loop-safe.** De-duplicates redundant events and prevents feedback loops.
- **Single-file only.** No cross-file sync.

## Format Conversion & Partial Operations

Convert structured data to JSON or generate code from full files or text selections:

| Action                  | Scope     | Output            |
| ----------------------- | --------- | ----------------- |
| Convert to JSON         | Full file | New JSON document |
| Convert Partial to JSON | Selection | New JSON document |
| Copy Content as JSON    | Full file | Clipboard         |
| Copy Partial as JSON    | Selection | Clipboard         |
| Copy Content            | Full file | Clipboard (raw)   |
| Show Partial Preview    | Selection | Graph panel       |
| Convert Partial to Type | Selection | Generated code    |

Partial operations are available via the Editor context menu submenu.

**Normalization:** JS/TS object literal selections with single quotes or trailing commas are automatically normalized to valid JSON.

## Code Generation

Generate typed data structures from any supported file using quicktype.

**Supported languages:**
TypeScript, JavaScript, Flow, Rust, Kotlin, Dart, Python, C#, Go, C++, Java, Scala, Swift, Objective-C, Elm, JSON Schema, Pike, PropTypes, Haskell, PHP, Ruby.

**Example:** Selecting TypeScript for `{ "name": "...", "age": 0 }` produces:

```typescript
export interface Person {
  name: string;
  age:  number;
}
```

## Fetch JSON from URL

Fetch JSON from a remote URL and visualize it as a graph.

- **HTTP GET only.** No authentication or custom headers.
- **10s timeout** with cancellation.
- Validates URL format before sending the request.
- Falls back to text parsing if content-type is not JSON.
- No persistent connection.

## Appearance and Settings

All settings are persisted to `localStorage`.

- **Theme**: Light, Dark, or System
- **Theme Color**: Multiple named palettes
- **Background**: Lines, Dots, or Cross
- **Edges**: Straight, Step, Smooth Step, Simple Bezier (with optional arrows and animation)
- **Reset**: Restore defaults button available

## Explorer and File Management

Adds a dedicated **JSON Explorer** to the Activity Bar.

- **Views**: Files list (grouped by type) and Feedback links.
- **Discovery**: Efficient file discovery with caching.
- **Sorting**: Groups by size (descending); files alphabetically.
- **Settings**: Configurable includes/excludes, recursion depth, hidden files, `.gitignore`.
- **Actions**: Open, Copy Content/JSON, Get Properties, Convert.

## Split View Mode

Opens the graph panel beside the active editor.

- Toggle via Title Bar button or `Ctrl+Alt+F` / `Cmd+Alt+F`.
- Live Sync is available only in Split View.

## Commands

Accessible via Command Palette (`Ctrl+Shift+P`).

| Command                                   | Description                                        |
| ----------------------------------------- | -------------------------------------------------- |
| `JSON Flow: Show Preview`                 | Open graph panel for the current file              |
| `JSON Flow: Show Partial Preview`         | Open graph panel from current text selection       |
| `JSON Flow: Fetch JSON Data`              | Fetch JSON from a URL and open graph panel         |
| `JSON Flow: Convert to JSON`              | Convert file to JSON in a new document             |
| `JSON Flow: Convert Partial to JSON`      | Convert selection to JSON in a new document        |
| `JSON Flow: Convert to Type`              | Generate typed code from file using quicktype      |
| `JSON Flow: Convert Partial to Type`      | Generate typed code from selection using quicktype |
| `JSON Flow: Copy Content`                 | Copy raw file content to clipboard                 |
| `JSON Flow: Copy Content as JSON`         | Copy file content as JSON to clipboard             |
| `JSON Flow: Copy Partial Content as JSON` | Copy selection as JSON to clipboard                |
| `JSON Flow: Get File Properties`          | Show file name, language, line count, version      |
| `JSON Flow: Refresh List`                 | Refresh the file list in the Explorer view         |
| `JSON Flow: Open File`                    | Open file from Explorer view in editor             |
| `JSON Flow: Enable Split View`            | Open graph panel beside editor                     |
| `JSON Flow: Disable Split View`           | Close graph panel                                  |
| `JSON Flow: Enable Live Sync`             | Enable editor ↔ graph synchronization              |
| `JSON Flow: Disable Live Sync`            | Disable editor ↔ graph synchronization             |

## Configuration

Configured via `jsonFlow` settings in VS Code.

```jsonc
{
  "jsonFlow.enable": true,
  "jsonFlow.files.includedFilePatterns": [
    "json", "jsonc", "json5",
    "yaml", "yml",
    "toml",
    "ini", "cfg",
    "xml",
    "csv", "tsv",
    "env",
    "hcl",
    "properties"
  ],
  "jsonFlow.files.excludedFilePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/out/**",
    "**/build/**",
    "**/vendor/**"
  ],
  "jsonFlow.files.maxSearchRecursionDepth": 0,
  "jsonFlow.files.supportsHiddenFiles": true,
  "jsonFlow.files.preserveGitignoreSettings": false,
  "jsonFlow.files.includeFilePath": true,
  "jsonFlow.graph.layoutOrientation": "TB",
  "jsonFlow.liveSync.throttleMs": 100
}
```

| Setting                                    | Type                   | Default         | Description                                         |
| ------------------------------------------ | ---------------------- | --------------- | --------------------------------------------------- |
| `jsonFlow.enable`                          | boolean                | `true`          | Enable or disable the extension                     |
| `jsonFlow.graph.layoutOrientation`         | `TB`\|`LR`\|`BT`\|`RL` | `TB`            | Initial layout direction                            |
| `jsonFlow.liveSync.throttleMs`             | number (0-1000)        | `100`           | Live Sync throttle delay in milliseconds            |
| `jsonFlow.files.includedFilePatterns`      | string[]               | 14 extensions   | File extensions managed by the Explorer view        |
| `jsonFlow.files.excludedFilePatterns`      | string[]               | 5 glob patterns | Glob patterns excluded from file search             |
| `jsonFlow.files.maxSearchRecursionDepth`   | number                 | `0`             | Max recursion depth for file search (0 = unlimited) |
| `jsonFlow.files.supportsHiddenFiles`       | boolean                | `true`          | Include hidden files (dot-prefixed) in search       |
| `jsonFlow.files.preserveGitignoreSettings` | boolean                | `false`         | Respect `.gitignore` rules in file search           |
| `jsonFlow.files.includeFilePath`           | boolean                | `true`          | Show relative path alongside filename in Explorer   |

## Performance & Scalability

JSON Flow renders the graph with React Flow using DOM/SVG-based rendering. Performance depends on graph size and shape, especially:

- Number of nodes
- Depth of the structure
- Edge density

Large or deeply nested files may lead to:

- Slower rendering
- Increased memory usage
- Reduced interactivity

The extension is optimized for small to medium-sized documents and for exploratory analysis rather than full-scale visualization of very large datasets.

## Limitations

- **Single-file mode only.** One file per preview panel. No cross-file graph.
- **Editing is single-file only.** Edits apply to the active document only.
- **No batch editing.** Each edit action is applied individually.
- **No graph-level undo/redo.** Undo and redo rely on VS Code document history.
- **No cross-file Live Sync.** Live Sync only operates on the file currently open in the preview panel.
- **No persistent layout cache.** Layout is recomputed on every open.
- **No background indexing.** Files are scanned only when the Explorer view is opened or refreshed.
- **State resets on extension reload.** No state is persisted between VS Code sessions.
- **Live Sync is mouse-only.** Keyboard navigation in the editor does not trigger graph sync.
- **Fetch JSON from URL is GET-only.** No POST, no authentication, no custom headers.
- **Docker Compose has no selection mapper.** Preview and conversion work; Live Sync does not.
- **Rendering performance depends on graph size and complexity.** Large or highly connected graphs can be slower to render.
- **Not intended for very large datasets.** DOM/SVG-based rendering limits scalability for very large graphs.
- **`path:` operates on escaped JSON Pointer IDs.** The `path:` search token matches against the node's RFC 6901 JSON Pointer ID, which uses `~0` for `~` and `~1` for `/` in key segments. Searching for a literal key containing `/` requires the escaped form.
- **`type:` uses JavaScript type categories.** Valid values are `string`, `number`, `boolean`, `object`. There is no `array` type; arrays report as `object`.
- **Collapse state is not auto-reset on dataset swap.** When switching files, previously collapsed node IDs may reference nodes that no longer exist. The collapse filter handles this gracefully - non-existent IDs are simply never matched.
- **`focus-strict` does not display non-projected nodes.** In `focus-strict` mode, only matched nodes are rendered. Navigation operates on the projected node set. Nodes that are not projected cannot be centered or navigated to.
- **`focus-context` includes ancestors without match highlighting.** Ancestor nodes in `focus-context` mode appear at normal opacity without a match ring, distinguishing them visually from actual matches (ring) and non-matches (dimmed).
- **Search minimum length.** Active search requires at least 2 characters after trimming. Single-character inputs are not committed.
- **Depth is derived from JSON Pointer segmentation.** Depth counts the number of path segments in the node's JSON Pointer ID. The graph root (which is not a JSON Pointer) returns depth 0.

## Technical Overview

For detailed architecture documentation, data pipeline description, identity model, search evaluation logic, collapse and projection internals, performance characteristics, and structural guarantees, see [ARCHITECTURE.md](https://github.com/ManuelGil/vscode-json-flow/blob/main/ARCHITECTURE.md).

## Security and Privacy

**Processing boundary:** All parsing, layout, search, and code generation runs locally inside VS Code. No data leaves the machine unless the user explicitly invokes `Fetch JSON from URL`.

**Webview security:**

- Unique nonce per instantiation
- Strict Content-Security-Policy
- No `unsafe-eval`
- Remote scripts are not loaded

**Input sanitization:**

- All messages are validated before processing
- HTML sanitization applied to all user-controlled content

**Workspace Trust:** The extension respects VS Code Workspace Trust. It supports untrusted workspaces and virtual workspaces (with limitations).

**No telemetry. No analytics. No automatic uploads.**

## Internationalization (i18n)

The extension is fully localized.

- **Extension Host**: Uses VS Code's native localization APIs.
- **Webview**: Uses a dedicated internal localization layer.
- **Worker**: Language-agnostic.

## Requirements

- VS Code 1.102.0 or later
- Windows, macOS, or Linux
- Works in untrusted workspaces (with limitations)
- Works in virtual workspaces (with limitations)
- Compatible with VSCodium, Cursor, WindSurf, and any VS Code-compatible platform

## Troubleshooting

**Performance is slow:**

- Collapse large branches to reduce rendered node count
- Switch to a different layout orientation
- Disable Live Sync temporarily
- Avoid files with extremely wide root objects (hundreds of top-level keys)

**Live Sync does not respond:**

- Confirm the format is `json`, `jsonc`, `json5`, `yaml`, or `yml`
- Confirm Live Sync is enabled (Editor Title Bar button)
- Confirm the active editor document matches the previewed file
- Click (mouse) in the editor - keyboard navigation does not trigger sync

**Graph export is blank or clipped:**

- Use Fit View before exporting
- Ensure the graph has finished loading before exporting

For issues: [https://github.com/ManuelGil/vscode-json-flow/issues](https://github.com/ManuelGil/vscode-json-flow/issues)

## Contributing

Contributions are welcome.

- Follow project coding standards
- Maintain deterministic behavior
- Do not modify identity logic
- Do not introduce layout computation outside the Web Worker
- Do not alter the adaptive threshold without benchmarking
- Do not mutate Worker output arrays

Architecture stability is prioritized over feature expansion. Contributions that alter layout authority, identity construction rules, the Worker protocol, or the single-file scope model should be discussed before implementation.

See [ARCHITECTURE.md](https://github.com/ManuelGil/vscode-json-flow/blob/main/ARCHITECTURE.md) for technical details on system invariants.

## Code of Conduct

We are committed to providing a friendly, safe, and welcoming environment for all, regardless of gender, sexual orientation, disability, ethnicity, religion, or other personal characteristic. Please review our [Code of Conduct](https://github.com/ManuelGil/vscode-json-flow/blob/main/CODE_OF_CONDUCT.md) before participating in our community.

## Changelog

For a complete list of changes, see the [CHANGELOG.md](https://github.com/ManuelGil/vscode-json-flow/blob/main/CHANGELOG.md).

## Support and Contact

If you need help, want to discuss ideas, or have questions about the project:

- Submit an [Issue](https://github.com/ManuelGil/vscode-json-flow/issues)

For urgent matters or partnership inquiries, please use the contact information provided in the [repository profile](https://github.com/ManuelGil/vscode-json-flow).

- **Manuel Gil** - *Owner* - [ManuelGil](https://github.com/ManuelGil)
- **Santiago Rey** - *Collaborator* - [ksreyr](https://github.com/ksreyr)
- **Andry Orellana** - *Collaborator* - [AndryOre](https://github.com/AndryOre)

See the list of [contributors](https://github.com/ManuelGil/vscode-json-flow/contributors).

## Other Extensions

- **[Auto Barrel](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-auto-barrel)**
  Automatically generates and maintains barrel (`index.ts`) files for your TypeScript projects.

- **[Angular File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-angular-generator)**
  Generates boilerplate and navigates your Angular (9→20+) project from within the editor, with commands for components, services, directives, modules, pipes, guards, reactive snippets, and JSON2TS transformations.

- **[NestJS File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nestjs-generator)**
  Simplifies creation of controllers, services, modules, and more for NestJS projects, with custom commands and Swagger snippets.

- **[NestJS Snippets](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nestjs-snippets-extension)**
  Ready-to-use code patterns for creating controllers, services, modules, DTOs, filters, interceptors, and more in NestJS.

- **[T3 Stack / NextJS / ReactJS File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nextjs-generator)**
  Automates file creation (components, pages, hooks, API routes, etc.) in T3 Stack (Next.js, React) projects and can start your dev server from VSCode.

- **[Drizzle ORM Snippets](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-drizzle-snippets)**
  Collection of code snippets to speed up Drizzle ORM usage, defines schemas, migrations, and common database operations in TypeScript/JavaScript.

- **[CodeIgniter 4 Spark](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-codeigniter4-spark)**
  Scaffolds controllers, models, migrations, libraries, and CLI commands in CodeIgniter 4 projects using Spark, directly from the editor.

- **[CodeIgniter 4 Snippets](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-codeigniter4-snippets)**
  Snippets for accelerating development with CodeIgniter 4, including controllers, models, validations, and more.

- **[CodeIgniter 4 Shield Snippets](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-codeigniter4-shield-snippets)**
  Snippets tailored to CodeIgniter 4 Shield for faster authentication and security-related code.

- **[Mustache Template Engine - Snippets & Autocomplete](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-mustache-snippets)**
  Snippets and autocomplete support for Mustache templates, making HTML templating faster and more reliable.

## Recommended Browser Extension

For developers who work with `.vsix` files for offline installations or distribution, the complementary [**One-Click VSIX**](https://chromewebstore.google.com/detail/imojppdbcecfpeafjagncfplelddhigc?utm_source=item-share-cb) extension is recommended, available for both Chrome and Firefox.

> **One-Click VSIX** integrates a direct "Download Extension" button into each VSCode Marketplace page, ensuring the file is saved with the `.vsix` extension, even if the server provides a `.zip` archive. This simplifies the process of installing or sharing extensions offline by eliminating the need for manual file renaming.

- [Get One-Click VSIX for Chrome &rarr;](https://chromewebstore.google.com/detail/imojppdbcecfpeafjagncfplelddhigc?utm_source=item-share-cb)
- [Get One-Click VSIX for Firefox &rarr;](https://addons.mozilla.org/es-ES/firefox/addon/one-click-vsix/)

## License

JSON Flow is licensed under the **MIT License**. For full license details, please refer to the [LICENSE](https://github.com/ManuelGil/vscode-json-flow/blob/main/LICENSE) file included in this repository.
