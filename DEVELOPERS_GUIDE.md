# Developer's Guide

Welcome to the **JSON Flow** developer's guide! This document provides an overview of the project structure, setup instructions, and tips for contributing effectively.

---

## Index

- [Developer's Guide](#developers-guide)
  - [Index](#index)
  - [Project Structure](#project-structure)
    - [**1. src/**](#1-src)
    - [**2. webview/**](#2-webview)
    - [**3. Additional Important Folders:**](#3-additional-important-folders)
  - [Setting Up the Project](#setting-up-the-project)
  - [Running Tests](#running-tests)
  - [Extending Functionality](#extending-functionality)
  - [Debugging Tips](#debugging-tips)
  - [Best Practices](#best-practices)
  - [Additional Resources](#additional-resources)

---

## Project Structure

The project follows a modular organization for maintainability and scalability:

### **1. src/**

- **Purpose:** Core application logic following an MVC-like structure.
- **Key Subfolders:**
  - `configs/`: Application configuration constants and settings.
  - `controllers/`: Handles business logic, such as file management and JSON transformations.
  - `helpers/`: Utility functions for security and JSON operations.
  - `interfaces/`: TypeScript interfaces for strong typing.
  - `models/`: Data models, such as nodes for the JSON tree.
  - `providers/`: Abstraction layers for external resources, like feedback and file operations.

### **2. webview/**

- **Purpose:** Manages the graphical user interface built with React and React Flow.
- **Key Subfolders:**
  - `components/`: Contains reusable UI elements, including custom controls for JSON visualization.
  - `helpers/`: Functions for tree generation and layout management.
  - `hooks/`: Custom React hooks for managing state and layout behavior.
  - `lib/`: Shared utility functions for the webview.
  - `types/`: Shared TypeScript types.

### **3. Additional Important Folders:**

- **schemas/**: JSON schema definitions for configuration validation.
- **l10n/**: Localization files for internationalization.
- **docs/**: Documentation files for contributors and end users.
- **images/**: Media assets used in documentation.

---

## Setting Up the Project

Follow these steps to get started:

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/your-organization/vscode-json-flow.git
   cd vscode-json-flow
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Build the Extension:**

   ```bash
   npm run build
   ```

4. **Launch the Extension in VS Code:**
   - Open the project in VS Code.
   - Press `F5` to start a new Extension Development Host.

---

## Running Tests

We use Jest for unit testing and Playwright for end-to-end testing.

- **Run Unit Tests:**

  ```bash
  npm run test
  ```

- **Run E2E Tests:**

  ```bash
  npm run test:e2e
  ```

---

## Extending Functionality

To add new features or enhance existing ones:

1. **Identify the Module:** Locate the relevant controller, helper, or model in `src/`.
2. **Implement the Changes:** Add new logic or modify existing code.
3. **Update Tests:** Ensure proper test coverage for your changes.
4. **Test Your Changes:** Verify functionality in the Extension Development Host.

---

## Debugging Tips

1. **Use Debugger Logs:** Insert `console.log` statements in your TypeScript code.
2. **Inspect the Webview:** Use browser developer tools by right-clicking in the webview and selecting "Inspect."
3. **Check the Logs:** Review the VS Code output panel for extension logs.

---

## Best Practices

- **Follow Coding Standards:** Use Biome linting rules and adhere to TypeScript best practices.
- **Write Modular Code:** Keep functions small and focused.
- **Document Your Changes:** Update README or USAGE_GUIDE.md if user-facing functionality is modified.

---

## Additional Resources

- [VS Code Extension API Documentation](https://code.visualstudio.com/api)
- [React Flow Documentation](https://reactflow.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

If you have questions or need help, feel free to open an issue in the repository!
