# JSON Flow - Usage Guide

Welcome to the **JSON Flow** usage guide! This document provides a clear, step-by-step walkthrough to help you get started and make the most of the extension.

---

## Index

- [JSON Flow - Usage Guide](#json-flow---usage-guide)
  - [Index](#index)
  - [1. Getting Started](#1-getting-started)
    - [Opening a Supported File](#opening-a-supported-file)
    - [Settings Tips](#settings-tips)
  - [2. Visualizing Data Structures](#2-visualizing-data-structures)
    - [Supported Formats](#supported-formats)
    - [Graph Visualization](#graph-visualization)
  - [3. Exporting Graphs](#3-exporting-graphs)
  - [4. Customizing the Visualization](#4-customizing-the-visualization)
  - [5. Live Sync (Selection)](#5-live-sync-selection)
    - [Unified Live Sync Throttle](#unified-live-sync-throttle)
    - [Diagnostics](#diagnostics)
  - [6. Troubleshooting](#6-troubleshooting)
    - [Common Issues](#common-issues)
  - [7. Additional Resources](#7-additional-resources)
  - [8. Appendix: Configuration Reference](#8-appendix-configuration-reference)

---

## 1. Getting Started

### Opening a Supported File

1. **Open a File**: Launch Visual Studio Code and open a file in one of the supported formats (e.g., JSON, YAML, XML, CSV).
2. **Activate JSON Flow**:
   - **Via the Activity Bar**: Click on the JSON Flow icon in the Activity Bar.
   - **Via the Command Palette**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and select **JSON Flow: Show Preview**.
3. **View the Graph**: JSON Flow will generate an interactive, node-based graph that represents your file's data structure.

> **Note:** Make sure your file is correctly formatted to avoid errors during visualization.

### Settings Tips

- **Include file types (extensions)**: Set `jsonFlow.files.includedFilePatterns` to a list of file type identifiers (extensions), e.g. `["json", "yaml", "xml"]`. These are not globs.
- **Exclude with globs**: Use `jsonFlow.files.excludedFilePatterns` for glob patterns like `**/node_modules/**` or `**/*.min.*`.
- **Graph orientation**: Choose the layout via `jsonFlow.graph.layoutOrientation` (`TB`, `LR`, `BT`, `RL`).
- **Live Sync performance**: Control update cadence with `jsonFlow.liveSync.throttleMs` (default `100`, range `0-1000` ms). Lower = more reactive; higher = fewer updates.
- **Where to change settings**: Open VS Code Settings and search for "JSON Flow", or edit your workspace `settings.json`.

Example `settings.json` snippet:

```jsonc
{
  // Include file types by extension (no dots)
  "jsonFlow.files.includedFilePatterns": ["json", "yaml", "xml"],
  // Exclude with globs
  "jsonFlow.files.excludedFilePatterns": ["**/node_modules/**", "**/dist/**"],
  // Live Sync throttle in ms
  "jsonFlow.liveSync.throttleMs": 100,
  // Layout orientation
  "jsonFlow.graph.layoutOrientation": "TB"
}
```

---

## 2. Visualizing Data Structures

### Supported Formats

JSON Flow supports a variety of file types, including:

- **JSON** (e.g., `.json`, `.jsonc`, `.json5`)
- **YAML** (e.g., `.yaml`, `.yml`)
- **XML** (e.g., `.xml`)
- **CSV** (e.g., `.csv`)
- And additional formats like **INI**, **TOML**, etc.

### Graph Visualization

- **Interactive Graphs**: Once activated, the extension displays a node-based graph where each node represents keys and values.
- **Compact View**: By default, keys and their corresponding values are grouped together for clarity.
- **Interactivity**: You can click nodes to expand or collapse nested data, making it easier to navigate through complex structures.

---

## 3. Exporting Graphs

JSON Flow allows you to export your visualized graphs as image files. In version 2.0.0, this feature is fully integrated and lets you:

- Export as **PNG**, **SVG**, or **JPG**.
- Customize the background color of the exported image before downloading.

To export:

1. Generate the visualization as described above.
2. Click the **Export** button in the webview toolbar.
3. Choose your desired format and settings.
4. Save the image to your preferred location.

---

## 4. Customizing the Visualization

Within the JSON Flow webview, you can personalize various aspects of the display:

- **Display Settings**: Adjust node colors, connector styles, and grouping options.
- **Theme Options**: Select themes that match your Visual Studio Code environment.
- **Node Behavior**: Utilize the collapse/expand controls to manage large or complex data structures.

> **Tip:** Customization changes are applied instantly without the need to restart VS Code.

---

## 5. Live Sync (Selection)

Live Sync mirrors the current selection between the editor and the graph when Split View is active.

- **Availability:** Active for supported files while Split View is open. If JSON has syntax errors, Live Sync may pause until fixed.
- **What syncs:** Node/selection changes (Phase 1). Text edits are not synchronized yet.
- **Performance:** Tune `jsonFlow.liveSync.throttleMs` (0-1000 ms, default 100). The webview aligns its debounce to this value.
- **Anti-loop & de-dup:** Messages include `origin/nonce` markers and selection de-duplication to avoid feedback loops and redundant updates.

### Unified Live Sync Throttle

- **Single global setting:** `jsonFlow.liveSync.throttleMs` governs batching for all Live Sync traffic. There are no separate throttles for selection vs. editing in Phase 1.
- **Clamping:** The value is clamped to `[0, 1000]` ms by both the extension and the webview. A value of `0` disables batching (messages flush immediately).
- **Dynamic updates:** Changes to this setting propagate live through `liveSyncState.throttleMs` so the webview stays aligned with the host.

### Diagnostics

- **Webview DevTools:** Run "Developer: Open Webview Developer Tools" in VS Code to inspect console output and state transitions.
- No dedicated Output Channel is provided at this time.

---

## 6. Troubleshooting

### Common Issues

1. **Performance with Large Files**
   - Large or deeply nested files may take longer to visualize.
   - As a workaround, consider collapsing unnecessary nodes for a smoother experience.

2. **File Formatting Errors**
   - Verify that your file is valid and free of syntax errors.

3. **Visualization Not Appearing**
   - Ensure the file type is supported and that JSON Flow is properly activated via the Activity Bar or Command Palette.
   - If issues persist, try reloading the extension.

---

## 7. Additional Resources

For further information and assistance, please refer to the following:

- [Official Documentation](https://github.com/ManuelGil/vscode-json-flow/wiki)
- [Submit Feature Requests](https://github.com/ManuelGil/vscode-json-flow/issues)
- [GitHub Repository](https://github.com/ManuelGil/vscode-json-flow)
- [Report an Issue](https://github.com/ManuelGil/vscode-json-flow/issues)

If you have any questions or need support, feel free to open an issue on GitHub.

---

## 8. Appendix: Configuration Reference

A concise reference for all JSON Flow settings. Edit these in your workspace `.vscode/settings.json` or VS Code Settings UI.

- **jsonFlow.enable**
  - Type: boolean
  - Default: `true`
  - Notes: Enable or disable the extension.

- **jsonFlow.files.includedFilePatterns**
  - Type: string[]
  - Default: `["json", "jsonc", "json5", "cfg", "csv", "env", "hcl", "ini", "properties", "toml", "tsv", "xml", "yaml", "yml"]`
  - Notes: File type identifiers (extensions, without dot). These are not glob patterns.

- **jsonFlow.files.excludedFilePatterns**
  - Type: string[]
  - Default: `["**/node_modules/**", "**/dist/**", "**/out/**", "**/build/**", "**/vendor/**"]`
  - Notes: Glob patterns to exclude files/folders.

- **jsonFlow.files.maxSearchRecursionDepth**
  - Type: number
  - Default: `0`
  - Notes: Maximum folder depth when searching; `0` means unlimited.

- **jsonFlow.files.supportsHiddenFiles**
  - Type: boolean
  - Default: `true`
  - Notes: Include hidden files (e.g., `.env`).

- **jsonFlow.files.preserveGitignoreSettings**
  - Type: boolean
  - Default: `false`
  - Notes: Respect rules defined in `.gitignore` during searches.

- **jsonFlow.files.includeFilePath**
  - Type: boolean
  - Default: `true`
  - Notes: Show full file path in views.

- **jsonFlow.graph.layoutOrientation**
  - Type: string
  - Default: `"TB"`
  - Enum: `TB`, `LR`, `BT`, `RL`
  - Notes: Graph layout orientation.

- **jsonFlow.liveSync.throttleMs**
  - Type: number
  - Default: `100`
  - Range: `0-1000`
  - Notes: Throttle duration for Live Sync updates (ms).

---

Enjoy using JSON Flow to effortlessly visualize and interact with your data!
