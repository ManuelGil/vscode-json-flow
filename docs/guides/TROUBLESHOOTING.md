# Troubleshooting Guide

This document aims to assist users in resolving common issues encountered while using the JSON Flow extension.

---

## Index

- [Troubleshooting Guide](#troubleshooting-guide)
  - [Index](#index)
  - [General Issues](#general-issues)
    - [1. Graph Rendering Takes Too Long](#1-graph-rendering-takes-too-long)
    - [2. Graph Not Displaying Properly](#2-graph-not-displaying-properly)
  - [Export Issues](#export-issues)
    - [3. Unable to Export Graph as an Image](#3-unable-to-export-graph-as-an-image)
  - [Configuration Issues](#configuration-issues)
    - [4. Changes to Configuration Are Not Reflected](#4-changes-to-configuration-are-not-reflected)
  - [Debugging Steps](#debugging-steps)

---

## General Issues

### 1. Graph Rendering Takes Too Long

**Symptom:** Rendering large JSON or other supported file types (e.g., YAML, XML) results in slow performance or unresponsiveness.

**Solution:**

- Use the option to visualize only a section of the file. Select the portion of the file you want to view, right-click the selection, and choose the context menu option to render a graph for the selected section.
- This approach reduces the complexity and size of the data being processed, leading to faster rendering times.

### 2. Graph Not Displaying Properly

**Symptom:** The graph doesn't render as expected, or certain elements appear misaligned.

**Solution:**

- Ensure the file format is supported and properly structured.
- Verify there are no syntax errors in the file.
- Refresh the graph view by closing and reopening the visualization.
- If the issue persists, restart Visual Studio Code to reset the extension.

---

## Export Issues

### 3. Unable to Export Graph as an Image

**Symptom:** The export functionality for PNG, SVG, or other formats doesn't work.

**Solution:**

- Verify that the export settings, such as the background color, are correctly configured in the export dialog.
- Ensure you have write permissions for the directory where the image is being saved.
- Try restarting the extension if the issue persists.

---

## Configuration Issues

### 4. Changes to Configuration Are Not Reflected

**Symptom:** Updates to configuration settings don't apply immediately.

**Solution:**

- Configuration changes made within VS Code's settings may require a restart of the editor to take effect.
- For features managed through the webview interface, changes should apply immediately without requiring a restart.

---

## Debugging Steps

If the above solutions do not resolve your issue:

1. Check the [Official Documentation](https://github.com/ManuelGil/vscode-json-flow/wiki) for detailed guides and usage instructions.
2. Visit the [GitHub Repository](https://github.com/ManuelGil/vscode-json-flow) for updates and community discussions.
3. Submit bug reports or feature requests via the [Issue Tracker](https://github.com/ManuelGil/vscode-json-flow/issues).

For further assistance, feel free to contact the maintainers through the GitHub repository. Your feedback is invaluable in improving JSON Flow!

---

If you have any questions or need support, feel free to open an issue on GitHub.
