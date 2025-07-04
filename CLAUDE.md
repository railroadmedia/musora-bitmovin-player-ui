# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Bitmovin Player UI Framework** - a TypeScript-based UI framework for the Bitmovin Player. It provides a flexible, modular layer on top of the player API that allows for easy customization of video player interfaces.

## Development Commands

### Building and Development
- `gulp` - Build project into `dist` directory
- `gulp watch` - Develop and rebuild changed files automatically
- `gulp serve` - Open test page in browser, build and reload changed files automatically
- `gulp build-prod` - Build project with minified files into `dist` directory

### Testing and Quality
- `npm test` or `npx jest` - Run Jest tests
- `gulp lint` - Lint TypeScript and SASS files
- `gulp lint-ts` - Lint TypeScript files only
- `gulp lint-sass` - Lint SASS files only

### Development Server
- `gulp serve` - Starts BrowserSync development server on port 9000 with live reloading

## Architecture Overview

### Core Structure
- **Components**: Modular UI components that extend the base `Component` class
- **UIManager**: Central manager that handles UI variants and switching between different UIs
- **UIFactory**: Factory classes that build pre-configured UI layouts (modern, small screen, cast receiver, TV)
- **Event System**: Custom event dispatcher system for component communication

### Key Directories
- `src/ts/components/` - All UI components (buttons, overlays, panels, etc.)
- `src/ts/spatialnavigation/` - TV/remote control navigation system
- `src/ts/localization/` - Internationalization support
- `src/scss/skin-modern/` - SCSS styling for the modern skin
- `src/html/index.html` - Main demo page showcasing different UI variants
- `spec/` - Jest test files

### Component Architecture
All components follow these patterns:
- Extend `Component<ConfigType>` base class
- Have a corresponding `ComponentConfig` interface
- Use PascalCase naming with parent component suffix (e.g., `PlaybackToggleButton` extends `ToggleButton`)
- Each component has its own `.ts` file and optional `.scss` file in lowercase

### UI Variants System
The UIManager supports multiple UI variants that switch based on context:
- **Modern UI**: Desktop/tablet layout
- **Small Screen UI**: Mobile layout  
- **Ads UI**: Layout during ad playback
- **Cast Receiver UI**: Layout for Chromecast
- **TV UI**: Layout optimized for TV/remote control navigation

### Build System
- **Gulp**: Main build system with Browserify for bundling
- **TypeScript**: Compiled to ES5 for broad browser compatibility
- **SASS**: CSS preprocessing with autoprefixer and minification
- **Jest**: Testing framework with jsdom environment

### CSS Architecture
The framework uses conditional CSS classes rather than separate stylesheets - the UIManager adds/removes classes like:
- `.bmpui-ui-smallscreen` - Mobile styles
- `.bmpui-ad-mode` - Ad-specific styles
- `.bmpui-tv-mode` - TV interface styles
- `.bmpui-cast-receiver` - Chromecast styles

## Code Style Guidelines

### TypeScript
- Follow ESLint rules (run `gulp lint-ts`)
- Functions must have explicit return types
- Class methods should be `private` by default
- Public methods require JSDoc documentation
- Use single blank lines between functions/classes

### Component Development
- Components must be independent (no explicit dependencies on other components except framework components)
- Config interfaces should only be used for external configuration, not internal state
- Export new components in `main.ts` for global namespace access
- Subcomponents can be defined in the same file as main component if they're tightly coupled

### File Naming
- Component files: `componentname.ts` (lowercase)
- SCSS files: `_componentname.scss` (lowercase with underscore prefix)
- Config interfaces: `ComponentNameConfig`

## Testing
- Test files in `spec/` directory mirror `src/` structure
- Use Jest with jsdom environment
- Mock helpers available in `spec/helper/`
- Run tests with `npm test`

## Special Notes
- CSS prefix is configurable via `{{PREFIX}}` placeholder (defaults to 'bmpui')
- Supports multiple output naming configurations via CLI parameters
- UI framework version is for Bitmovin Player v8
- Browser compatibility targets ES5 with modern browser features