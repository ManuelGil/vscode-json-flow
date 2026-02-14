# Change Log

All notable changes to the "JSON Flow" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.4.0] - 2026-02-14

* feat: reset search state on dataset changes and improve hidden match feedback
* chore: remove unused @faker-js/faker dependency and config state synchronization
* feat: add search match highlighting and hidden match counter with collapse-aware navigation

## [2.3.2] - 2026-02-12

* feat: implement debounce for worker invocations during Live Sync updates
* chore: simplify pnpm configuration and remove NODE_ENV from environment

## [2.3.1] - 2026-02-12

* fix: update @types/vscode dependency to version ^1.90.0
* chore(deps): bump lucide-react from 0.525.0 to 0.563.0
* chore: make Husky hooks executable and refine pnpm configuration for lifecycle script handling

## [2.3.0] - 2026-02-11

* feat(logging): Implement enhanced logging utility for better error tracking and performance metrics ([2efe71f](https://github.com/ManuelGil/vscode-json-flow/commit/2efe71f))
* feat: :sparkles: implement live sync pause functionality with UI indication and message enhancements ([65a075a](https://github.com/ManuelGil/vscode-json-flow/commit/65a075a))
* feat: :sparkles: add live sync selection throttle configuration and improve constructor formatting ([069db46](https://github.com/ManuelGil/vscode-json-flow/commit/069db46))
* feat: :sparkles: enhance normalization and selection mapping for various file formats ([fe22778](https://github.com/ManuelGil/vscode-json-flow/commit/fe22778))
* feat: update JSON Flow configuration and improve live sync functionality ([f9c2be7](https://github.com/ManuelGil/vscode-json-flow/commit/f9c2be7))
* refactor: optimize webview updates and node collapse state management with linear layout fallback for large graphs ([5e99424](https://github.com/ManuelGil/vscode-json-flow/commit/5e99424))
* refactor: migrate selection helpers and node identity to RFC 6901 JSON Pointers ([7f6af40](https://github.com/ManuelGil/vscode-json-flow/commit/7f6af40))
* docs: :memo: add localization updates and new configuration options for Live Sync ([7ef7245](https://github.com/ManuelGil/vscode-json-flow/commit/7ef7245))

## [2.2.1] - 2025-08-12

* chore: :bookmark: update localization strings and improve documentation in README and ROADMAP ([bcd10a6](https://github.com/ManuelGil/vscode-json-flow/commit/bcd10a6))

## [2.2.0] - 2025-08-11

* feat: :sparkles: add localization support for JSON Flow with new UI labels and live sync options ([0377191](https://github.com/ManuelGil/vscode-json-flow/commit/0377191))
* feat: :sparkles: enhance JSON Flow extension with .env file support and improved CSV/TSV parsing ([6104de2](https://github.com/ManuelGil/vscode-json-flow/commit/6104de2))
* feat: :sparkles: enhance layout worker with compact processing and adaptive batching ([b24aea5](https://github.com/ManuelGil/vscode-json-flow/commit/b24aea5))
* refactor: :recycle: refactor theme styles and improve type safety in webview ([d91e865](https://github.com/ManuelGil/vscode-json-flow/commit/d91e865))

## [2.1.0] - 2025-08-07

* feat: add command to fetch JSON data from a URL and update README ([4998cbe](https://github.com/ManuelGil/vscode-json-flow/commit/4998cbe))
* docs: :globe_with_meridians: update localization files for JSON Flow extension ([680dace](https://github.com/ManuelGil/vscode-json-flow/commit/680dace))

## [2.0.1] - 2025-08-01

* docs: :memo: update README to include demo GIF and remove outdated Product Hunt badge ([35d4007](https://github.com/ManuelGil/vscode-json-flow/commit/35d4007))

## [2.0.0] - 2025-07-20

* fix: adjust default dimensions for FlowMinimap component for better layout ([b155008](https://github.com/ManuelGil/vscode-json-flow/commit/b155008))
* docs: update comments and documentation for clarity and consistency across components and controllers ([4d4926f](https://github.com/ManuelGil/vscode-json-flow/commit/4d4926f))
* feat: add GoToSearch component for node search functionality in CustomControls ([130c602](https://github.com/ManuelGil/vscode-json-flow/commit/130c602))
* fix: update .gitignore settings description to reflect true default value in localization files ([c41ec4e](https://github.com/ManuelGil/vscode-json-flow/commit/c41ec4e))
* fix: update panel position in CustomControls component for better layout ([bbfbf62](https://github.com/ManuelGil/vscode-json-flow/commit/bbfbf62))
* feat: enhance configuration options for file search and management ([6529c5c](https://github.com/ManuelGil/vscode-json-flow/commit/6529c5c))
* feat: introduce flow settings management and VSCode synchronization ([78a6cb7](https://github.com/ManuelGil/vscode-json-flow/commit/78a6cb7))
* refactor: :recycle: refactor and enhance components for improved structure and functionality ([6864c07](https://github.com/ManuelGil/vscode-json-flow/commit/6864c07))
* feat: :sparkles: implement atomic design components for UI ([d5af1ca](https://github.com/ManuelGil/vscode-json-flow/commit/d5af1ca))
* feat: :sparkles: refactor and enhance documentation across various modules ([b9fb913](https://github.com/ManuelGil/vscode-json-flow/commit/b9fb913))
* feat: :sparkles: enhance localization and feedback features ([f0a578b](https://github.com/ManuelGil/vscode-json-flow/commit/f0a578b))
* feat: ✨ update package description for clarity and improve icon visibility in views ([6042598](https://github.com/ManuelGil/vscode-json-flow/commit/6042598))
* feat: 🎉 add 'About Us' feature with website link and command registration ([e3c6729](https://github.com/ManuelGil/vscode-json-flow/commit/e3c6729))
* chore: :fire: remove unused variables ([dbf070d](https://github.com/ManuelGil/vscode-json-flow/commit/dbf070d))
* feat: 🔄 include file path in update action and tree state management for improved data handling ([d497e31](https://github.com/ManuelGil/vscode-json-flow/commit/d497e31))
* feat: 🔄 enhance tree state management by including file name and path in update action ([59dfff0](https://github.com/ManuelGil/vscode-json-flow/commit/59dfff0))
* feat: 🔄 include file name and path in update command for enhanced data handling ([fc1d6c7](https://github.com/ManuelGil/vscode-json-flow/commit/fc1d6c7))
* refactor: �□ update message structure in JSON handling for consistency ([00207de](https://github.com/ManuelGil/vscode-json-flow/commit/00207de))
* docs: 📝 update formatting in documentation files for consistency ([38a6d79](https://github.com/ManuelGil/vscode-json-flow/commit/38a6d79))
* docs: 📝 add ABOUT and DESIGN_DECISIONS documentation files ([3a8e5bc](https://github.com/ManuelGil/vscode-json-flow/commit/3a8e5bc))
* refactor: 💄 clean up configuration and remove unused properties ([8235223](https://github.com/ManuelGil/vscode-json-flow/commit/8235223))
* refactor: update file patterns handling and rename layoutDirection to layoutOrientation ([9cf5c17](https://github.com/ManuelGil/vscode-json-flow/commit/9cf5c17))
* feat: update package.json keywords and categories, adjust webview resource paths ([2d318a6](https://github.com/ManuelGil/vscode-json-flow/commit/2d318a6))
* refactor: remove webview configuration from JsonController and update related components ([6377f5b](https://github.com/ManuelGil/vscode-json-flow/commit/6377f5b))
* feat: implement tree generation from JSON data structure ([f286fd1](https://github.com/ManuelGil/vscode-json-flow/commit/f286fd1))
* feat: enhance tree generation logic and improve background rendering options ([0109a9e](https://github.com/ManuelGil/vscode-json-flow/commit/0109a9e))
* refactor: simplify configuration by removing global.d.ts and using constants for layout properties ([d057d67](https://github.com/ManuelGil/vscode-json-flow/commit/d057d67))
* chore: update dependencies to latest versions ([0eb8634](https://github.com/ManuelGil/vscode-json-flow/commit/0eb8634))

## [1.13.0] - 2025-01-16

* feat: add error messages for canceled operations in controllers ([ee5787a](https://github.com/ManuelGil/vscode-json-flow/commit/ee5787a))

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

[Unreleased]: https://github.com/ManuelGil/vscode-json-flow/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v2.3.2...v2.4.0
[2.3.2]: https://github.com/ManuelGil/vscode-json-flow/compare/v2.3.1...v2.3.2
[2.3.1]: https://github.com/ManuelGil/vscode-json-flow/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v2.2.1...v2.3.0
[2.2.1]: https://github.com/ManuelGil/vscode-json-flow/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/ManuelGil/vscode-json-flow/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/ManuelGil/vscode-json-flow/compare/v1.13.0...v2.0.0
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
