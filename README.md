# JSON Flow

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/imgildev.vscode-json-flow?style=for-the-badge&label=VS%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/imgildev.vscode-json-flow?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-json-flow&ssr=false#review-details)
[![GitHub Repo stars](https://img.shields.io/github/stars/ManuelGil/vscode-json-flow?style=for-the-badge&logo=github)](https://github.com/ManuelGil/vscode-json-flow)
[![GitHub license](https://img.shields.io/github/license/ManuelGil/vscode-json-flow?style=for-the-badge&logo=github)](https://github.com/ManuelGil/vscode-json-flow/blob/main/LICENSE)

This extension allows you to manage your JSON files in a more efficient way. It provides a set of commands to manipulate JSON files, such as sorting, formatting, and minifying.

## Table of Contents

- [JSON Flow](#json-flow)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Project Settings](#project-settings)
  - [Development](#development)
    - [Getting Started](#getting-started)
    - [React Webview](#react-webview)
  - [Build](#build)
    - [Compile Webview](#compile-webview)
    - [Compile Extension](#compile-extension)
  - [Connect with me](#connect-with-me)
  - [Other Extensions](#other-extensions)
  - [Contributing](#contributing)
  - [Code of Conduct](#code-of-conduct)
  - [Changelog](#changelog)
  - [Authors](#authors)
  - [License](#license)

## Requirements

- VSCode 1.76.0 or later

## Project Settings

Configure your project by creating or updating a settings.json file at the project's root. If you already have a `.vscode/settings.json` file, skip the first two steps.

1. Open the command palette in VSCode:

   - `CTRL + SHIFT + P` (Windows)
   - `CMD + SHIFT + P` (Mac OS)

2. Type `Preferences: Open Workspace Settings (JSON)`.

3. In the `.vscode/settings.json` file, copy and paste the following settings:

   ```jsonc
   {
     "jsonFlow.files.include": [
         "json",
         "jsonc"
     ], // The file extensions to watch for changes. Example: "json", "jsonc"
     "jsonFlow.files.exclude": [
         "**/node_modules/**",
         "**/dist/**",
         "**/out/**",
         "**/build/**",
         "**/.*/**"
     ], // The files to exclude from watching. Example: "**/node_modules/**", "**/dist/**", "**/out/**", "**/build/**", "**/.*/**"
     "jsonFlow.files.showPath": true, // Show the path of the file in the file name. Example: "home.component.tsx (pages/home)"
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

### Compile Extension

1. Run the package command:

   ```bash
   vsce package
   ```

2. Run the publish command:

   ```bash
   vsce publish
   ```

## Connect with me

[![GitHub followers](https://img.shields.io/github/followers/ManuelGil?style=for-the-badge&logo=github)](https://github.com/ManuelGil)
[![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/imgildev?style=for-the-badge&logo=x)](https://twitter.com/imgildev)

## Other Extensions

- [NestJS File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nestjs-generator)
- [NestJS Snippets](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nestjs-snippets-extension)
- [Angular File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-angular-generator)
- [T3 Stack / NextJS / ReactJS File Generator](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-nextjs-generator)
- [CodeIgniter 4 Snippets](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-codeigniter4-snippets)
- [CodeIgniter 4 Shield Snippets](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-codeigniter4-shield-snippets)
- [CodeIgniter 4 Spark](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-codeigniter4-spark)
- [Moodle Pack](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-moodle-snippets)
- [Mustache Template Engine - Snippets & Autocomplete](https://marketplace.visualstudio.com/items?itemName=imgildev.vscode-mustache-snippets)

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
