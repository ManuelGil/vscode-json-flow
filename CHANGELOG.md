# Change Log

All notable changes to the "JSON Flow" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

* refactor: 💄 clean up configuration and remove unused properties ([8235223](https://github.com/ManuelGil/vscode-json-flow/commit/8235223))
* refactor: update file patterns handling and rename layoutDirection to layoutOrientation ([9cf5c17](https://github.com/ManuelGil/vscode-json-flow/commit/9cf5c17))
* feat: update package.json keywords and categories, adjust webview resource paths ([2d318a6](https://github.com/ManuelGil/vscode-json-flow/commit/2d318a6))
* refactor: remove webview configuration from JsonController and update related components ([6377f5b](https://github.com/ManuelGil/vscode-json-flow/commit/6377f5b))
* feat: implement tree generation from JSON data structure ([f286fd1](https://github.com/ManuelGil/vscode-json-flow/commit/f286fd1))
* feat: enhance tree generation logic and improve background rendering options ([0109a9e](https://github.com/ManuelGil/vscode-json-flow/commit/0109a9e))
* refactor: simplify configuration by removing global.d.ts and using constants for layout properties ([d057d67](https://github.com/ManuelGil/vscode-json-flow/commit/d057d67))
* chore: update dependencies to latest versions ([0eb8634](https://github.com/ManuelGil/vscode-json-flow/commit/0eb8634))

## [1.13.0] - 2025-01-16

* feat: add error messages for cancelled operations in controllers ([ee5787a](https://github.com/ManuelGil/vscode-json-flow/commit/ee5787a))

## [1.12.0] - 2025-01-15

* chore: :bookmark: release 1.12.0 ([dbd5ed2](https://github.com/ManuelGil/vscode-json-flow/commit/dbd5ed2))
* chore: :bookmark: update release-it configuration and change changelog plugin ([18e2171](https://github.com/ManuelGil/vscode-json-flow/commit/18e2171))
* chore: 🔧 configure automated github releases with release-it ([a17b8f6](https://github.com/ManuelGil/vscode-json-flow/commit/a17b8f6))
* docs: add code generation section to README with supported languages and usage instructions ([d5dc9fe](https://github.com/ManuelGil/vscode-json-flow/commit/d5dc9fe))
* docs: enhance README with code generation instructions and localization updates ([f2af773](https://github.com/ManuelGil/vscode-json-flow/commit/f2af773))
* docs: update changelog format and add notable changes for recent features ([848f3f2](https://github.com/ManuelGil/vscode-json-flow/commit/848f3f2))
* docs: update changelog with notable changes and version history ([c94ee59](https://github.com/ManuelGil/vscode-json-flow/commit/c94ee59))
* docs: update localization files with new prompts for type or structure generation ([3abede5](https://github.com/ManuelGil/vscode-json-flow/commit/3abede5))
* feat: ✨ add transform controller and enhance localization for conversion features ([7b01a65](https://github.com/ManuelGil/vscode-json-flow/commit/7b01a65))
* feat: add release it changelog generation ([68b59d0](https://github.com/ManuelGil/vscode-json-flow/commit/68b59d0))

## [1.11.0] - 2025-01-09

* feat: ✨ update VSCode version requirement, add test configuration, and enhance project structure ([ba8dfc7](https://github.com/ManuelGil/vscode-json-flow/commit/ba8dfc7))

## [1.10.0] - 2024-12-20

* feat: ✨ add jsonFlow.enable configuration and enhance localization support ([fed5921](https://github.com/ManuelGil/vscode-json-flow/commit/fed5921))

## [1.9.0] - 2024-11-27

* feat: ✨ add webview configuration and enhance layout element properties ([7b30d3c](https://github.com/ManuelGil/vscode-json-flow/commit/7b30d3c))

## [1.8.0] - 2024-11-24

* feat: ✨ implement image saving functionality and enhance JSON controller ([3764e59](https://github.com/ManuelGil/vscode-json-flow/commit/3764e59))

## [1.7.0] - 2024-11-22

* feat: ✨ add new JSON Flow commands and context menus ([612aad1](https://github.com/ManuelGil/vscode-json-flow/commit/612aad1))

## [1.6.0] - 2024-11-18

* feat: ✨ update localization files and enhance file searching with fast-glob ([7139123](https://github.com/ManuelGil/vscode-json-flow/commit/7139123))
* chore: :lipstick: updte cover image ([22b0c0d](https://github.com/ManuelGil/vscode-json-flow/commit/22b0c0d))
* fix: 🐛 update exclusion patterns to replace hidden files with vendor directory in configuration ([11617d2](https://github.com/ManuelGil/vscode-json-flow/commit/11617d2))

## [1.5.0] - 2024-11-17

* chore: 🔧 update version to 1.5.0 and enhance README with Product Hunt link and additional images ([70265aa](https://github.com/ManuelGil/vscode-json-flow/commit/70265aa))
* feat: ✨ add layout direction configuration option and remove unused CSS ([c9ab641](https://github.com/ManuelGil/vscode-json-flow/commit/c9ab641))
* feat: ✨ layout persist orientation state across views ([3bff5c6](https://github.com/ManuelGil/vscode-json-flow/commit/3bff5c6))
* style: ✨ update CustomNode styling for improved layout and interaction ([a1c7ada](https://github.com/ManuelGil/vscode-json-flow/commit/a1c7ada))
* style: ✨ update package description for clarity and improve code formatting in App.tsx ([0e24ede](https://github.com/ManuelGil/vscode-json-flow/commit/0e24ede))
* refactor: ♻️ enhance type safety and improve layout node dimensions in tree helper and components ([43cc7ff](https://github.com/ManuelGil/vscode-json-flow/commit/43cc7ff))

## [1.4.0] - 2024-11-13

* feat: :sparkles: add configuration option to show values in JSON graph ([8167e84](https://github.com/ManuelGil/vscode-json-flow/commit/8167e84))
* feat: :sparkles: add tree interface and helper for JSON tree generation ([40c0c29](https://github.com/ManuelGil/vscode-json-flow/commit/40c0c29))
* refactor: ♻️ improve type safety and effect handling ([e3de34e](https://github.com/ManuelGil/vscode-json-flow/commit/e3de34e))
* refactor: ♻️ restructure tree generation logic and reintroduce type definitions ([52c67c2](https://github.com/ManuelGil/vscode-json-flow/commit/52c67c2))
* style: ✨ enhance button styling and layout in webview ([965fce6](https://github.com/ManuelGil/vscode-json-flow/commit/965fce6))
* add new layout ([80d8d4c](https://github.com/ManuelGil/vscode-json-flow/commit/80d8d4c))

## [1.3.1] - 2024-11-10

* feat: :sparkles: add loading component and improve preview initialization delay ([d2d24e5](https://github.com/ManuelGil/vscode-json-flow/commit/d2d24e5))
* feat: :sparkles: implement message handling for JSON updates in webview ([7827beb](https://github.com/ManuelGil/vscode-json-flow/commit/7827beb))
* style: :art: add body padding and customize react-flow component styles ([752c965](https://github.com/ManuelGil/vscode-json-flow/commit/752c965))
* style: :art: clean up code formatting and update package dependencies ([ad0bcee](https://github.com/ManuelGil/vscode-json-flow/commit/ad0bcee))

## [1.3.0] - 2024-11-08

* refactor: :recycle: clean up configuration files and improve code formatting ([7564bfd](https://github.com/ManuelGil/vscode-json-flow/commit/7564bfd))
* refactor: :recycle: remove unused helper functions and update package dependencies ([fab9138](https://github.com/ManuelGil/vscode-json-flow/commit/fab9138))

## [1.2.1] - 2024-11-08

* fix: :adhesive_bandage: fix localization for feedback options and update package descriptions ([f395dfc](https://github.com/ManuelGil/vscode-json-flow/commit/f395dfc))

## [1.2.0] - 2024-11-08

* feat: :sparkles: add localization support for German and Spanish languages ([634c871](https://github.com/ManuelGil/vscode-json-flow/commit/634c871))
* refactor: :recycle: update JSON handling to use jsonc format and remove unused parser ([8752d5c](https://github.com/ManuelGil/vscode-json-flow/commit/8752d5c))

## [1.1.0] - 2024-11-07

* feat: :sparkles: extend supported file types and enhance documentation for CSV and TSV formats ([c8ce799](https://github.com/ManuelGil/vscode-json-flow/commit/c8ce799))

## [1.0.1] - 2024-11-06

* fix: :adhesive_bandage: enhance JSON handling by adding file type detection ([71abe2f](https://github.com/ManuelGil/vscode-json-flow/commit/71abe2f))

## [1.0.0-beta] - 2024-11-06

* chore: :tada: initial commit ([945138b](https://github.com/ManuelGil/vscode-json-flow/commit/945138b))
* chore: update contributors list in README.md ([0193af9](https://github.com/ManuelGil/vscode-json-flow/commit/0193af9))
* chore: update extension description and keywords for improved clarity ([17ffafc](https://github.com/ManuelGil/vscode-json-flow/commit/17ffafc))
* chore: update project configuration files ([7316a10](https://github.com/ManuelGil/vscode-json-flow/commit/7316a10))
* feat: :sparkles: add convertToJson and copyContentAsJson methods ([2415393](https://github.com/ManuelGil/vscode-json-flow/commit/2415393))
* feat: :sparkles: add copyContent command to JSON Manager ([23bb8a8](https://github.com/ManuelGil/vscode-json-flow/commit/23bb8a8))
* feat: :sparkles: add getFileProperties command to JSON Manager ([17c884b](https://github.com/ManuelGil/vscode-json-flow/commit/17c884b))
* feat: :sparkles: add react app ([65e0b2b](https://github.com/ManuelGil/vscode-json-flow/commit/65e0b2b))
* feat: :sparkles: add support for JSON5 format in parsing logic and configuration ([26a70e0](https://github.com/ManuelGil/vscode-json-flow/commit/26a70e0))
* feat: :sparkles: add support for multiple file types in JSON Flow and implement parsing logic ([886e15d](https://github.com/ManuelGil/vscode-json-flow/commit/886e15d))
* feat: :sparkles: add webview ui toolkit ([8528830](https://github.com/ManuelGil/vscode-json-flow/commit/8528830))
* feat: :sparkles: implement JsonController for handling JSON previews and commands ([4d1534d](https://github.com/ManuelGil/vscode-json-flow/commit/4d1534d))
* feat: :sparkles: update files options to show a contextual menu ([963c477](https://github.com/ManuelGil/vscode-json-flow/commit/963c477))
* feat: :sparkles: update JSONProvider to read JSON content from file ([f9fff41](https://github.com/ManuelGil/vscode-json-flow/commit/f9fff41))
* feat: :technologist: improve react integration ([e6122c6](https://github.com/ManuelGil/vscode-json-flow/commit/e6122c6))
* feat: add controls ([8a226dc](https://github.com/ManuelGil/vscode-json-flow/commit/8a226dc))
* feat: add fixes ([181b39a](https://github.com/ManuelGil/vscode-json-flow/commit/181b39a))
* feat: add react flow ([8dc0b4c](https://github.com/ManuelGil/vscode-json-flow/commit/8dc0b4c))
* feat: add stylling ([51f25b7](https://github.com/ManuelGil/vscode-json-flow/commit/51f25b7))
* feat: fix recurive function ([53c5dba](https://github.com/ManuelGil/vscode-json-flow/commit/53c5dba))
* refactor: :fire: remove unused code in FilesController and JSONProvider ([976ba4c](https://github.com/ManuelGil/vscode-json-flow/commit/976ba4c))
* refactor: :recycle: update JSON Provider to show a Webview Panel ([7151531](https://github.com/ManuelGil/vscode-json-flow/commit/7151531))
* refactor: remove unused code and update JSONProvider to read JSON content from file ([f350cd0](https://github.com/ManuelGil/vscode-json-flow/commit/f350cd0))
* refactor: rename extension from "JSON Manager" to "JSON Flow" and update related documentation ([8f60e06](https://github.com/ManuelGil/vscode-json-flow/commit/8f60e06))
* build: :arrow_up: update dependencies and remove unused code ([9d25354](https://github.com/ManuelGil/vscode-json-flow/commit/9d25354))
* build: add webview path ([960fb18](https://github.com/ManuelGil/vscode-json-flow/commit/960fb18))
* fix: :rotating_light: fix compilation settings ([1ccbfa5](https://github.com/ManuelGil/vscode-json-flow/commit/1ccbfa5))

[unreleased]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.13.0...HEAD
[1.13.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.0.0-beta...v1.0.1
[1.0.0-beta]: https://github.com/ManuelGil/vscode-json-flow/releases/tag/v1.0.0-beta
