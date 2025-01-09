# JSON Flow

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/imgildev.vscode-json-flow?style=for-the-badge&label=VS%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow&ssr=false#review-details)
[![GitHub Repo stars](https://img.shields.io/github/stars/ManuelGil/vscode-json-flow?style=for-the-badge&logo=github)](https://github.com/ManuelGil/vscode-json-flow)
[![GitHub license](https://img.shields.io/github/license/ManuelGil/vscode-json-flow?style=for-the-badge&logo=github)](https://github.com/ManuelGil/vscode-json-flow/blob/main/LICENSE)

Transform your JSON files into interactive node-based graphs directly in Visual Studio Code. JSON Flow makes working with structured data effortless and visually intuitive, turning raw data into dynamic, interactive visualizations. Perfect for developers, analysts, and data enthusiasts who want to understand and navigate complex JSON structures with ease.

[![JSON Flow](https://raw.githubusercontent.com/ManuelGil/vscode-json-flow/main/images/json-flow.png)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)

## Table of Contents

- [JSON Flow](#json-flow)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Features](#features)
    - [Interactive Data Visualization](#interactive-data-visualization)
    - [Enhanced JSON Management](#enhanced-json-management)
    - [Supported File Formats](#supported-file-formats)
      - [JSON Family](#json-family)
      - [YAML](#yaml)
      - [TOML](#toml)
      - [INI Format](#ini-format)
      - [Properties and Environment Files](#properties-and-environment-files)
      - [XML](#xml)
      - [CSV](#csv)
      - [TSV](#tsv)
      - [HCL](#hcl)
    - [File Explorer](#file-explorer)
  - [Usage](#usage)
  - [Project Settings](#project-settings)
  - [Development](#development)
    - [Getting Started](#getting-started)
    - [React Webview](#react-webview)
  - [Build](#build)
    - [Compile Webview](#compile-webview)
  - [VSXpert Template](#vsxpert-template)
  - [Other Extensions](#other-extensions)
  - [Contributing](#contributing)
  - [Code of Conduct](#code-of-conduct)
  - [Changelog](#changelog)
  - [Authors](#authors)
  - [License](#license)

## Requirements

- VSCode 1.88.0 or later

## Features

### Interactive Data Visualization

- **Node-Based Graphs**: Instantly visualize your JSON data as interactive node-based graphs, making complex structures easy to interpret and navigate.
- **Dynamic Data Exploration**: Use zoom and navigation controls to explore your data in real-time, providing a seamless, intuitive way to dive into JSON structures.

### Enhanced JSON Management

- **File Explorer**: Access and manage JSON files efficiently with the built-in file explorer, offering a range of organizational and file management tools.
- **File Conversion**: Easily convert formats like YAML, TOML, INI, and others to JSON with a single click, streamlining your workflow and expanding compatibility.
- **Show Selection as JSON**: Preview selected content in the JSON Flow view, simplifying data exploration and helping you make sense of your data at a glance.
- **Copy Content to Clipboard**: Copy the content of the selected file to the clipboard, simplifying data sharing and integration with other tools.
- **Copy Content as JSON**: Copy the content of the selected file as JSON, enabling seamless data transfer and integration with other applications.
- **Get File Properties**: Quickly access the basic properties of the selected file, including path, language, and line count, streamlining file management and organization.

### Supported File Formats

#### JSON Family

- **`json`**: Standard JSON files for all your data needs.
- **`jsonc`**: JSON with comments — great for configuration files that need explanations.
- **`json5`**: A more relaxed JSON format, offering improved readability and flexibility.

#### YAML

- **`yaml`** & **`yml`**: Widely used for configuration files, CI/CD pipelines, cloud deployment settings, and more.

#### TOML

- **`toml`**: A user-friendly config file format, especially popular in Rust and other applications needing readability.

#### INI Format

- **`ini` & `cfg`**: Classic key-value format for app and system settings, widely used in software configurations.

#### Properties and Environment Files

- **`properties`**: Java-style configuration files, perfect for managing app settings.
- **`env`**: Environment variable files commonly used for application configurations and secrets.

#### XML

- **`xml`**: A versatile, structured data format used in a variety of applications and document storage.

#### CSV

- **`csv`**: Comma-separated values, ideal for tabular data storage and exchange.

#### TSV

- **`tsv`**: Tab-separated values, another popular format for storing and sharing tabular data.

#### HCL

- **`hcl`**: HashiCorp Configuration Language, often used in DevOps tools like Terraform.

### File Explorer

| Title  | Purpose |
| --- | --- |
| Open File | Open the selected file |
| Convert to JSON | Convert the selected file to JSON |
| Copy Content to Clipboard | Copy the content of the selected file to the clipboard |
| Copy Content as JSON | Copy the content of the selected file as JSON |
| Get File Properties | Get the properties of the selected file |
| Show Selection as JSON | Show the Selection in the JSON Flow view |

## Usage

1. Open a JSON file in Visual Studio Code.

2. Click on the JSON Flow icon in the top right corner of the editor.

3. The JSON Flow view will open, displaying your JSON data as an interactive node-based graph.

4. Click on the navigation buttons to zoom in and out, and explore your data in real-time.

   - **Zoom In**: Click on the `+` button to zoom in on the graph.
   - **Zoom Out**: Click on the `-` button to zoom out on the graph.

![JSON Flow Preview](https://raw.githubusercontent.com/ManuelGil/vscode-json-flow/main/images/json-flow-1.gif)

![JSON Flow Menu](https://raw.githubusercontent.com/ManuelGil/vscode-json-flow/main/images/json-flow-2.gif)

## Project Settings

Configure your project by creating or updating a settings.json file at the project's root. If you already have a `.vscode/settings.json` file, skip the first two steps.

1. Open the command palette in VSCode:

   - `CTRL + SHIFT + P` (Windows)
   - `CMD + SHIFT + P` (Mac OS)

2. Type `Preferences: Open Workspace Settings (JSON)`.

3. In the `.vscode/settings.json` file, copy and paste the following settings:

   ```jsonc
   {
     "jsonFlow.enable": true, // Enable or disable the extension. Example: true, false
     "jsonFlow.files.include": [
         "json",
         "jsonc"
     ], // The file extensions to watch for changes. Example: "json", "jsonc"
     "jsonFlow.files.exclude": [
         "**/node_modules/**",
         "**/dist/**",
         "**/out/**",
         "**/build/**",
         "**/vendor/**"
     ], // The files to exclude from watching. Example: "**/node_modules/**", "**/dist/**", "**/out/**", "**/build/**", "**/vendor/**"
     "jsonFlow.files.showPath": true, // Show the path of the file in the file name. Example: "home.component.tsx (pages/home)"
     "jsonFlow.graph.showValues": true, // Show the values of the nodes in the graph. Example: "name: 'John Doe'"
     "jsonFlow.graph.nodeWidth": 200, // The width of the nodes in the graph. Example: 200
     "jsonFlow.graph.nodeHeight": 50, // The height of the nodes in the graph. Example: 50
     "jsonFlow.graph.nodeBorderColor": "white", // The border color of the nodes in the graph. Example: "white"
     "jsonFlow.graph.nodeColor": "white", // The color of the nodes in the graph. Example: "white"
     "jsonFlow.graph.edgeColor": "white", // The color of the edges in the graph. Example: "white"
     "jsonFlow.graph.layoutDirection": "TB", // The layout direction of the graph. Example: "TB", "LR"
     "jsonFlow.image.folder": "images", // The folder where the images will be saved. Example: "images"
   }
   ```

4. **Restart VS Code**

Your project is now set up to automatically format code upon saving.

## Development

For the development of this extension, you need to have Node.js installed on your machine. You can download it from the [official website](https://nodejs.org/).

### Getting Started

1. Clone the repository:

   ```bash
   git clone
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Open the project in VSCode:

   ```bash
   code .
   ```

4. Press `F5` to open a new window with the extension loaded.
5. Make your changes in the `src` directory.

### React Webview

To test the extension in a webview, run the following command:

   ```bash
   npm run dev
   ```

This command will open a new window with the extension loaded.

Make your changes in the `webview` directory.

## Build

### Compile Webview

1. Run the build command:

   ```bash
   npm run build
   ```

2. Run the compile command:

   ```bash
   npm run compile
   ```

3. The compiled files will be in the `out` directory.
4. Press `F5` to open a new window with the extension loaded.

## VSXpert Template

This extension was created using [VSXpert](https://vsxpert.com), a template that helps you create Visual Studio Code extensions with ease. VSXpert provides a simple and easy-to-use structure to get you started quickly.

## Other Extensions

- [Angular File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-angular-generator)
- [NestJS File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nestjs-generator)
- [T3 Stack / NextJS / ReactJS File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nextjs-generator)
- [Auto Barrel](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-auto-barrel)
- [CodeIgniter 4 Spark](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-codeigniter4-spark)

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for details on our code of conduct.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md)

## Authors

- **Manuel Gil** - _Owner_ - [ManuelGil](https://github.com/ManuelGil)
- **Santiago Rey** - _Collaborator_ - [ksreyr](https://github.com/ksreyr)
- **Andry Orellana** - _Collaborator_ - [AndryOre](https://github.com/AndryOre)

See also the list of [contributors](https://github.com/ManuelGil/vscode-json-flow/contributors) who participated in this project.

## License

JSON Flow is licensed under the MIT License - see the [MIT License](https://opensource.org/licenses/MIT) for details.
