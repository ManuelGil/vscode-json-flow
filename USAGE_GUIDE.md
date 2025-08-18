# JSON Flow - Usage Guide

Welcome to the **JSON Flow** usage guide! This document provides a clear, step-by-step walkthrough to help you get started and make the most of the extension.

---

## Index

- [JSON Flow - Usage Guide](#json-flow---usage-guide)
  - [Index](#index)
  - [1. Getting Started](#1-getting-started)
    - [Opening a Supported File](#opening-a-supported-file)
  - [2. Visualizing Data Structures](#2-visualizing-data-structures)
    - [Supported Formats](#supported-formats)
    - [Graph Visualization](#graph-visualization)
  - [3. Exporting Graphs](#3-exporting-graphs)
  - [4. Customizing the Visualization](#4-customizing-the-visualization)
  - [5. Troubleshooting](#5-troubleshooting)
    - [Common Issues](#common-issues)
  - [6. Additional Resources](#6-additional-resources)
  - [7. Live Sync (Preview)](#7-live-sync-preview)

---

## 1. Getting Started

### Opening a Supported File

1. **Open a File**: Launch Visual Studio Code and open a file in one of the supported formats (e.g., JSON, YAML, XML, CSV).
2. **Activate JSON Flow**:
   - **Via the Activity Bar**: Click on the JSON Flow icon in the Activity Bar.
   - **Via the Command Palette**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and select **JSON Flow: Show Preview**.
3. **View the Graph**: JSON Flow will generate an interactive, node-based graph that represents your file's data structure.

> **Note:** Make sure your file is correctly formatted to avoid errors during visualization.

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

## 5. Troubleshooting

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

## 6. Additional Resources

For further information and assistance, please refer to the following:

- [Official Documentation](https://github.com/ManuelGil/vscode-json-flow/wiki)
- [Submit Feature Requests](https://github.com/ManuelGil/vscode-json-flow/issues)
- [GitHub Repository](https://github.com/ManuelGil/vscode-json-flow)
- [Report an Issue](https://github.com/ManuelGil/vscode-json-flow/issues)

If you have any questions or need support, feel free to open an issue on GitHub.

---

Enjoy using JSON Flow to effortlessly visualize and interact with your data!

---

## 7. Live Sync (Preview)

Live Sync mirrors selection (and, in future versions, edits) between the editor and the JSON Flow graph when Split View is active.

- Toggle from the editor title bar using:
  - JSON Flow: Enable Live Sync
  - JSON Flow: Disable Live Sync

### Selection Throttle

- To coalesce rapid selection events, configure the delay:
  - Setting key: jsonFlow.liveSync.selectionThrottleMs
  - Type: number (range 0–1000)
  - Default: 100
  - 0 disables the delay

You can configure it via Settings UI (search for "JSON Flow") or add to .vscode/settings.json:

```jsonc
{
  // Delay (ms) for selection synchronization in Live Sync
  "jsonFlow.liveSync.selectionThrottleMs": 100
}
```
