# JSON Flow

[![VS Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/imgildev.vscode-json-flow?style=for-the-badge&label=VS%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![VS Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![VS Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![VS Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow&ssr=false#review-details)
[![GitHub Repo Stars](https://img.shields.io/github/stars/ManuelGil/vscode-json-flow?style=for-the-badge&logo=github)](https://github.com/ManuelGil/vscode-json-flow)
[![GitHub License](https://img.shields.io/github/license/ManuelGil/vscode-json-flow?style=for-the-badge&logo=github)](https://github.com/ManuelGil/vscode-json-flow/blob/main/LICENSE)

JSON Flow is a Visual Studio Code extension that transforms your data files—such as JSON, YAML, XML, and CSV—into interactive, node-based graphs. With its intuitive visualizations and robust features, JSON Flow simplifies the process of exploring and managing complex data structures, making it an ideal tool for developers, analysts, and data enthusiasts.

[![JSON Flow Screenshot](https://raw.githubusercontent.com/ManuelGil/vscode-json-flow/main/images/json-flow.png)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)

---

## Table of Contents

- [JSON Flow](#json-flow)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Key Features](#key-features)
    - [Interactive Data Visualization](#interactive-data-visualization)
    - [Enhanced JSON Management](#enhanced-json-management)
    - [Supported File Formats](#supported-file-formats)
    - [File Explorer](#file-explorer)
  - [Getting Started](#getting-started)
  - [Usage](#usage)
    - [Context Menu Options](#context-menu-options)
  - [Project Settings](#project-settings)
  - [Code Generation from JSON](#code-generation-from-json)
    - [Supported Languages](#supported-languages)
    - [How to Use](#how-to-use)
      - [Example](#example)
  - [Development](#development)
    - [React Webview](#react-webview)
  - [Build](#build)
    - [Compiling the Webview](#compiling-the-webview)
  - [Troubleshooting](#troubleshooting)
  - [Resources](#resources)
  - [VSXpert Template](#vsxpert-template)
  - [Other Extensions](#other-extensions)
  - [Contributing](#contributing)
  - [Authors](#authors)
  - [License](#license)

---

## Requirements

- Visual Studio Code version **1.88.0** or later.

---

## Key Features

### Interactive Data Visualization

- **Node-Based Graphs**: Instantly convert your data files into interactive graphs, making it easier to understand complex, nested structures.
- **Dynamic Exploration**: Navigate your data in real time with intuitive zooming, panning, and expand/collapse capabilities.

### Enhanced JSON Management

- **File Conversion**: Convert formats such as YAML, TOML, INI, and more into JSON with a single click.
- **Content Operations**: Quickly copy file content or its JSON representation, and view detailed file properties.

### Supported File Formats

- **JSON Family**: Standard JSON, JSON with comments (`jsonc`), and JSON5.
- **YAML**: `.yaml` and `.yml` files.
- **TOML**: For readable configuration files.
- **INI/CFG**: Traditional key-value configuration formats.
- **Properties & Environment Files**: Java-style properties and `.env` files.
- **XML**: Structured data for various applications.
- **CSV/TSV**: Tabular data formats.
- **HCL**: HashiCorp Configuration Language for DevOps tools.

### File Explorer

- **Efficient Management**: Open, convert, copy, and inspect files directly through an integrated file explorer interface.

---

## Getting Started

1. **Install the Extension**
   Download and install JSON Flow from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow).

2. **Open Your Data File**
   Open any supported file (JSON, YAML, XML, CSV, etc.) in VS Code.

3. **Visualize the Graph**
   Click on the JSON Flow icon in the Activity Bar or execute the command `Show Preview` from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

4. **Customize and Export**
   Adjust the graph layout using the toolbar and export your visualization as an image if needed.

For more detailed guidance, see the [Official Documentation](https://github.com/ManuelGil/vscode-json-flow/wiki).

---

## Usage

- **Launching the Graph View**: Access the graph via the Activity Bar icon or the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) using the command `Show Preview`.
- **Interactivity**: Click on nodes to expand or collapse details. Use the zoom controls to focus on specific areas of your data.
- **Export**: Easily export your graph as PNG, SVG, or other image formats with customizable background options.

![JSON Flow Demo](https://raw.githubusercontent.com/ManuelGil/vscode-json-flow/main/images/json-flow-1.gif)
![JSON Flow Menu](https://raw.githubusercontent.com/ManuelGil/vscode-json-flow/main/images/json-flow-2.gif)

---

### Context Menu Options

| Title  | Purpose |
| --- | --- |
| Open File | Open the selected file |
| Convert to JSON | Convert the selected file to JSON |
| Convert to Type or Structure | Convert the selected file to a specific type or structure. See [Code Generation from JSON](#code-generation-from-json) for more details |
| Copy Content to Clipboard | Copy the content of the selected file to the clipboard |
| Copy Content as JSON | Copy the content of the selected file as JSON |
| Get File Properties | Get the properties of the selected file |
| Show Selection as JSON | Show the Selection in the JSON Flow view |

---

## Project Settings

Customize JSON Flow by updating your workspace settings. Create or modify your `.vscode/settings.json` file with configurations like:

```jsonc
{
  "jsonFlow.enable": true,
  "jsonFlow.files.includedFilePatterns": ["json", "jsonc"],
  "jsonFlow.files.excludedFilePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/out/**",
      "**/build/**",
      "**/vendor/**"
  ],
  "jsonFlow.files.includeFilePath": true,
  "jsonFlow.graph.layoutOrientation": "TB"
}
```

After editing, restart VS Code to apply changes.

---

## Code Generation from JSON

Enhance your workflow by automatically generating code from JSON structures using the integrated quicktype library.

### Supported Languages

Generate types or structures for:

- TypeScript, Go, Rust, Python, Java, C#, Swift, Kotlin, Dart, C++, Objective-C, PHP, Ruby, Scala, Elm, JSON Schema, Haskell, JavaScript, Flow, Prop-Types, Pike, and more.

### How to Use

1. Open a JSON file.
2. Right-click in the editor and select `Convert to Type or Structure`.
3. Choose your target language and provide a name for the generated type.
4. Review the generated code in a new editor tab.

#### Example

Given the JSON:

```json
{
  "name": "John Doe",
  "age": 30,
  "email": "john.doe@example.com"
}
```

Selecting TypeScript and naming it `Person` produces:

```typescript
export interface Person {
  name: string;
  age: number;
  email: string;
}
```

---

## Development

For developers wishing to contribute, follow these steps:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/ManuelGil/vscode-json-flow.git
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Open the Project in VS Code**

   ```bash
   code .
   ```

4. **Run the Extension**
   Press `F5` to launch a new window with the extension loaded.

5. **Make Your Changes**
   Develop in the `src` directory.

### React Webview

To work on the webview interface:

```bash
npm run dev
```

This command opens a new VS Code window with the extension loaded for webview testing. Make changes in the `webview` directory.

---

## Build

### Compiling the Webview

1. Run the build command:

   ```bash
   npm run build
   ```

2. Press `F5` to launch the extension with the updated webview.

---

## Troubleshooting

If you experience issues, please refer to the [Troubleshooting Guide](./TROUBLESHOOTING.md) and check the [GitHub Issues Page](https://github.com/ManuelGil/vscode-json-flow/issues) for known problems or to report new ones.

---

## Resources

- [Official Documentation](https://github.com/ManuelGil/vscode-json-flow/wiki)
- [Submit Feature Requests](https://github.com/ManuelGil/vscode-json-flow/issues)
- [Report an Issue](https://github.com/ManuelGil/vscode-json-flow/issues)

---

## VSXpert Template

This extension was created using [VSXpert](https://vsxpert.com), a template that helps you create Visual Studio Code extensions with ease. VSXpert provides a simple and easy-to-use structure to get you started quickly.

---

## Other Extensions

- [Angular File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-angular-generator)
- [NestJS File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nestjs-generator)
- [T3 Stack / NextJS / ReactJS File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nextjs-generator)
- [Auto Barrel](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-auto-barrel)
- [CodeIgniter 4 Spark](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-codeigniter4-spark)

For more details, visit the [GitHub Repository](https://github.com/ManuelGil/vscode-json-flow).

---

## Contributing

We welcome contributions from the community. Please review our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on submitting pull requests and reporting issues.

---

## Authors

- **Manuel Gil** – Owner ([ManuelGil](https://github.com/ManuelGil))
- **Santiago Rey** – Collaborator ([ksreyr](https://github.com/ksreyr))
- **Andry Orellana** – Collaborator ([AndryOre](https://github.com/AndryOre))

See the complete list of [contributors](https://github.com/ManuelGil/vscode-json-flow/contributors).

---

## License

JSON Flow is licensed under the [MIT License](https://opensource.org/licenses/MIT).
