# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Musora fork of the Bitmovin Player UI Framework** — a TypeScript-based UI framework for the Bitmovin Player. It adds Musora-specific components (custom end screens, back button, React Native bridge) on top of the upstream Bitmovin UI.

**Repository:** `git@github.com:railroadmedia/musora-bitmovin-player-ui.git`
**Version:** 4.6.1

## Development Commands

### Building and Development

- `npm run build` — Build project into `dist/` (non-minified)
- `npm run build:prod` — Lint, build minified output, and generate docs
- `npm start` — Start webpack-dev-server on port 9000 with live reloading
- `npm run clean` — Remove `dist/` and `docs/`
- `npm run docs` — Generate TypeDoc API docs

### Testing and Quality

- `npm test` or `npx jest` — Run Jest tests
- `npm run lint` — Lint TypeScript and SASS files
- `npm run lint-ts` — Lint TypeScript files only (`eslint 'src/ts/**/*.ts'`)
- `npm run lint-sass` — Lint SASS files only
- `npm run format` — Format all files with Prettier

## Architecture Overview

### Core Structure

- **Components**: Modular UI components that extend the base `Component` class
- **UIManager** (`src/ts/UIManager.ts`) — Central manager handling UI variants and context-aware switching
- **UIFactory** (`src/ts/UIFactory.ts`) — Factory methods that build pre-configured UI layouts
- **Event System** (`src/ts/EventDispatcher.ts`) — Custom event dispatcher for component communication
- **DOM Wrapper** (`src/ts/DOM.ts`) — Internal DOM utility abstraction

### Key Directories

- `src/ts/` — TypeScript source; `main.ts` is the public API entry point
- `src/ts/components/` — All UI components organized by type
  - `buttons/` — 19+ button types
  - `settings/` — Settings panel and select boxes
  - `overlays/` — Buffering, subtitle, error, recommendation overlays
  - `ads/` — Ad control bar, skip button, counter label
  - `lists/` — List/select box components
  - `seekbar/` — SeekBar, SeekBarLabel, VolumeSlider
  - `labels/` — Label, PlaybackTimeLabel, MetadataLabel
  - Root-level: Container, UIContainer, ControlBar, TitleBar, Watermark, CastUIContainer, **MusoraStandardEndScreen**
- `src/ts/spatialnavigation/` — TV/remote control navigation system
- `src/ts/utils/` — 24+ utility modules (PlayerUtils, BrowserUtils, StorageUtils, ShadowDomManager, etc.)
- `src/ts/localization/` — i18n support (EN, DE, ES, NL)
- `src/scss/` — SCSS source; `bitmovinplayer-ui.scss` is the entry point
- `spec/` — Jest test files mirroring `src/` structure
- `dist/` — Build output (committed or generated)

### Component Architecture

All components follow these patterns:

- Extend `Component<ConfigType>` base class
- Have a corresponding `ComponentConfig` interface
- Class names: PascalCase (e.g., `PlaybackToggleButton`)
- File names: lowercase with hyphens (e.g., `playback-toggle-button.ts`)
- SCSS files: `_componentname.scss` with underscore prefix
- Export new components in `main.ts` for global namespace access
- Subcomponents can be defined in the same file as the main component if tightly coupled

### UI Variants System

`UIFactory.buildUI()` currently returns the single Musora small screen layout. Additional variants exist but are commented out:

- **`musoraSmallScreenUILayout()`** — Primary layout used in production (mobile/React Native)
- **`buildMusoraUI()`** — Musora variant with CustomMessageHandler integration for chapter markers
- **`buildCastReceiverUI()`** — Cast receiver layout
- **`buildTvUI()`** — TV/remote control optimized layout (spatial navigation)
- **`buildSubtitleUI()`** — Subtitle-only overlay (no controls)

UIManager tracks 9 context properties: `isAd`, `adRequiresUi`, `isFullscreen`, `isMobile`, `isTv`, `isPlaying`, `isSourceLoaded`, `width`, `documentWidth`.

### Build System

- **Webpack 5** — Main bundler (`webpack.config.js`); custom plugin generates multi-variant output
- **TypeScript** — Compiled to ES5 for broad browser compatibility; `tsc` also generates individual framework files into `dist/js/framework/`
- **SASS** — CSS preprocessing
- **Jest 29** — Testing with jsdom environment
- **ESLint 9** — Flat config format (`eslint.config.mjs`), with TypeScript and Prettier integration
- **TypeDoc** — API documentation generation

Build is configurable via environment variables:

- `OUTPUT_NAMESPACE` — JS global namespace
- `OUTPUT_FILENAME` — Output filename stem
- `OUTPUT_CSS_PREFIX` — CSS class prefix (default: `bmpui`)

Source placeholders replaced at build time: `{{VERSION}}`, `{{PREFIX}}`, `{{FILENAME}}`.

### CSS Architecture

The framework uses conditional CSS classes — UIManager adds/removes them based on context:

- `.bmpui-ui-smallscreen` — Mobile styles
- `.bmpui-ad-mode` — Ad-specific styles
- `.bmpui-tv-mode` — TV interface styles
- `.bmpui-cast-receiver` — Chromecast styles
- `.ui-skin-musora` — Musora-specific skin
- `.ui-skin-smallscreen` — Small screen skin variant

## Musora-Specific Components

### MusoraStandardEndScreen

`src/ts/components/MusoraStandardEndScreen.ts` — Custom end screen supporting three data types:

- **UpNextData** — "Up Next" recommendation screen
- **MethodSessionData** — Method/lesson session end screen
- **CourseCollectionData** — Course collection boundary screen (navigates to next course)

Features: Base64 UTF-8 decoding, `window.bitmovin.customMessageHandler` integration, HugeReplayButton, recommendation tiles.

Styled by `src/scss/skin-modern/components/_musorastandardendscreen.scss`.

### BackButton

`src/ts/components/buttons/BackButton.ts` — Top-left back navigation arrow for React Native contexts.

- Sends `onBackPress` message to native via `customMessageHandler`
- Visibility controlled via `SET_BACK_BUTTON_VISIBLE_MESSAGE`
- Included in `musoraSmallScreenUILayout`

### CustomMessageHandler Bridge

Components communicate with the React Native host via `window.bitmovin.customMessageHandler`. Message constants are defined per-component (e.g., `BACK_BUTTON_MESSAGE`, `SET_BACK_BUTTON_VISIBLE_MESSAGE`, chapter marker messages).

## Code Style Guidelines

### TypeScript

- Follow ESLint rules (`npm run lint-ts`)
- Functions must have explicit return types
- Class methods should be `private` by default
- Public methods require JSDoc documentation
- `noImplicitAny: true` — all types must be explicit

### Component Development

- Components must be independent (no explicit dependencies on other components except framework base classes)
- Config interfaces for external configuration only, not internal state
- Export new components in `main.ts`

## Testing

- Test files in `spec/` mirror `src/` structure
- Jest 29 with jsdom environment; setup file: `setup-jest.ts`
- Coverage output: `coverage/`
- Run with `npm test`

## Special Notes

- CSS prefix is configurable via `{{PREFIX}}` placeholder (defaults to `bmpui`)
- Browser targets: > 1%, last 2 versions, Firefox ESR (ES5 output)
- Upstream is Bitmovin Player UI v4 for Bitmovin Player v8
