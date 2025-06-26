# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Bitmovin Player UI is a TypeScript-based framework for creating video player user interfaces. It's built around a component architecture where UI elements extend a base `Component` class. The framework supports multiple UI variants (desktop, mobile, TV, Cast receiver) that are dynamically switched based on context.

## Installation & Setup

### NPM Installation
```bash
npm install bitmovin-player-ui
```

### CDN Integration
```html
<!-- JavaScript -->
<script src="//cdn.bitmovin.com/player/web/8/bitmovinplayer-ui.js"></script>
<!-- CSS -->
<link rel="stylesheet" href="//cdn.bitmovin.com/player/web/8/bitmovinplayer-ui.css">
```

### Project Setup
```bash
npm install --global gulp-cli  # Install Gulp CLI globally
npm install                    # Install dependencies
```

## Common Development Commands

### Build Commands
- `gulp` - Build project into `dist` directory
- `gulp build-prod` - Build minified production files
- `gulp --tasks` - List all available Gulp tasks
- `npm run test` - Run Jest tests

### Development Commands  
- `gulp watch` - Watch files and rebuild automatically
- `gulp serve` - Start UI playground server with live reload (BrowserSync)
- `gulp lint` - Run TypeScript and SASS linting
- `gulp lint-ts` - Run TypeScript linting only  
- `gulp lint-sass` - Run SASS linting only

### Testing
- `npx jest` - Run all tests
- `npx jest [pattern]` - Run specific test files matching pattern

## Basic Usage

### Player Configuration
```javascript
var config = {
  key: 'YOUR_PLAYER_KEY',
  ui: false,  // Disable default UI to use custom UI
  playback: {
    muted: true,
    autoplay: true
  },
  remotecontrol: {
    type: 'googlecast'
  },
  advertising: {}
};
```

### Video Source Configuration
```javascript
var source = {
  dash: 'https://example.com/manifest.mpd',
  hls: 'https://example.com/playlist.m3u8',
  progressive: [
    {url: 'https://example.com/video.mp4', type: 'video/mp4'},
    {url: 'https://example.com/video.webm', type: 'video/webm'}
  ],
  poster: 'https://example.com/poster.jpg',
  thumbnailTrack: {
    url: 'https://example.com/thumbnails.vtt'
  },
  title: 'Video Title',
  description: 'Video description',
  markers: [
    {time: 10, title: 'Chapter 1'},
    {time: 60, title: 'Chapter 2', duration: 30}
  ]
};
```

### Player Initialization
```javascript
var player = new bitmovin.player.Player(document.getElementById('player'), config);
var uiManager = bitmovin.playerui.UIFactory.buildDefaultUI(player, uiConfig);
player.load(source);
```

### UI Configuration
```javascript
var uiConfig = {
  metadata: {
    title: 'Custom Title',
    description: 'Custom description',
    markers: [
      {time: 50, title: 'Chapter 1'},
      {time: 100, title: 'Chapter 2'}
    ]
  },
  subtitles: {
    fontColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    fontFamily: 'Arial',
    characterEdge: '1px 1px 2px black'
  }
};
```

## Architecture

### Core Components
- **UIManager**: Central management class that handles UI initialization, variant switching, and lifecycle
- **UIFactory**: Factory methods for creating predefined UI structures (`buildDefaultUI`, `buildDefaultSmallScreenUI`, etc.)
- **DemoFactory**: Factory methods for demo/testing UI structures (`buildDemoUI`, etc.)
- **Component**: Base class for all UI elements with lifecycle management and DOM handling
- **Container**: Components that can contain child components (extends Component)

### Key Files
- `src/ts/main.ts` - Main entry point with all exports and global component registration
- `src/ts/uimanager.ts` - Core UI management logic
- `src/ts/uifactory.ts` - Predefined UI structures
- `src/ts/components/` - All UI component implementations
- `src/scss/` - Styling using SASS with CSS prefix `{{PREFIX}}` (default: `bmpui`)

### UI Variants System
The framework uses a condition-based system to switch between different UIs:
- **Desktop UI**: Full-featured interface (`buildDefaultUI`)
- **Small Screen UI**: Mobile-optimized interface (`buildDefaultSmallScreenUI`)
- **Ads UI**: Simplified interface during ad playback
- **Cast Receiver UI**: Minimal interface for Chromecast
- **TV UI**: Remote control optimized interface with spatial navigation

### Component Architecture
- Components are configured via TypeScript interfaces (e.g., `ButtonConfig`)
- Each component handles its own DOM element creation and event management
- Components follow a configure → initialize → show/hide → release lifecycle
- CSS classes are prefixed with `{{PREFIX}}` and mapped via SASS variables

#### Component Lifecycle
1. **Configure**: Set up component configuration
2. **Initialize**: Create DOM elements and set up event handlers
3. **Show/Hide**: Control visibility and state
4. **Release**: Clean up resources and event listeners

#### Naming Conventions
- **Classes**: PascalCase (e.g., `PlaybackToggleButton`)
- **Files**: lowercase (e.g., `playbacktogglebutton.ts`, `_playbacktogglebutton.scss`)
- **Configs**: Component name + "Config" (e.g., `ButtonConfig`)
- **Methods**: Public methods for external use (e.g., `getText()`, `setText()`)
- **Private Methods**: Internal logic, not for external use

#### Component Inheritance Examples
```typescript
class CloseButton extends Button
class ToggleButton extends Button
class PlaybackToggleButton extends ToggleButton
class ButtonComponent extends Component
class ControlBarContainer extends Container
```

#### Component Dependencies
- Components can depend on generic framework components (e.g., `Button`)
- Components can depend on their specific subcomponents (e.g., `SettingsPanel` → `SettingsPanelItem`)
- Avoid dependencies on unrelated specific components

### Build System
- Uses Gulp with Browserify for bundling
- TypeScript compilation with declaration file generation
- SASS compilation with PostCSS processing (autoprefixer, SVG inlining)
- Supports customizable output names via CLI parameters

## Advanced Features

### Advertising Integration
```javascript
// Schedule ads
var adBreaks = [
  {
    tag: {
      url: 'https://example.com/vast-ad.xml',
      type: 'vast'
    },
    position: 'pre'  // pre-roll
  },
  {
    tag: {
      url: 'https://example.com/midroll-ad.xml', 
      type: 'vast'
    },
    position: '60'  // mid-roll at 60 seconds
  }
];

// Schedule ads
adBreaks.forEach(function(adBreak) {
  player.ads.schedule(adBreak);
});

// Dynamically schedule ads
player.ads.schedule({
  tag: {
    url: 'https://example.com/dynamic-ad.xml',
    type: 'vast'
  },
  position: String(player.getCurrentTime() + 5)
});
```

### Subtitle Management
```javascript
// Add subtitle track
player.subtitles.add({
  url: 'https://example.com/subtitles.vtt',
  id: 'custom-sub',
  lang: 'en',
  kind: 'subtitle',
  label: 'English'
});

// Remove subtitle track
player.subtitles.remove('custom-sub');
```

### Event Handling
```javascript
// Player events
player.on(bitmovin.player.PlayerEvent.Play, function() {
  console.log('Playback started');
});

player.on(bitmovin.player.PlayerEvent.TimeChanged, function(event) {
  console.log('Current time:', event.time);
});

// Native video events
var videoElement = player.getVideoElement();
videoElement.addEventListener('loadstart', function() {
  console.log('Video load started');
});
```

### Version Information
```javascript
// Check versions
console.log('Player version:', bitmovin.player.version);
console.log('UI version:', bitmovin.playerui.version);
console.log('Player instance version:', playerInstance.version);
```

## Testing

Tests use Jest with JSDOM environment. Key test patterns:
- Component tests in `spec/components/`
- Utility tests for helper functions  
- Mock helpers in `spec/helper/`
- Tests follow `.spec.ts` naming convention

## Code Style

- Uses TSLint with specific rules (see `tslint.json`)
- Single quotes for strings
- Trailing commas in multiline objects/arrays
- 2-space indentation
- Semicolons required

## React Native Integration

### Using Custom UI Components in React Native Apps

The Bitmovin Player React Native SDK includes a built-in **Web UI Bridge** that allows custom web UI components (built with this framework) to be integrated seamlessly with React Native applications.

#### Integration Approach

1. **Web UI Bridge Architecture**: The React Native SDK uses the Bitmovin Player Web UI framework under the hood with a bridge system for communication between React Native and web components.

2. **Custom Message Handler**: Use `customMessageHandler` for bidirectional communication:
   ```typescript
   // React Native to Web UI
   player.customMessageHandler.sendMessage('LOAD_CUSTOM_END_SCREEN', {
     endScreenConfig: yourCustomConfig
   });

   // Web UI to React Native
   player.customMessageHandler.on('END_SCREEN_ACTION', (data) => {
     console.log('End screen action:', data);
   });
   ```

3. **Custom UI Bundle Integration**: Include your built custom UI:
   ```typescript
   const player = usePlayer({
     licenseKey: 'YOUR_LICENSE_KEY',
     ui: {
       customUIPath: './path/to/your/custom-ui-build.js',
       // Or use CDN
       customUIUrl: 'https://your-cdn.com/custom-ui-with-endscreen.js'
     }
   });
   ```

4. **Style Configuration**: Configure custom components through styleConfig:
   ```typescript
   const player = usePlayer({
     licenseKey: 'YOUR_LICENSE_KEY',
     styleConfig: {
       userInterface: false, // Disable default UI to use custom
       // Custom component configurations
     }
   });
   ```

5. **Web Component Communication**: In your custom web components:
   ```javascript
   // Listen for React Native messages
   window.bitmovin.customMessageHandler.on('LOAD_CUSTOM_END_SCREEN', (data) => {
     this.initializeEndScreen(data.endScreenConfig);
   });

   // Send data back to React Native
   window.bitmovin.customMessageHandler.sendMessage('END_SCREEN_ACTION', {
     action: 'replay',
     metadata: {}
   });
   ```

This bridge system allows your custom web UI components (like end screens) to seamlessly integrate with React Native apps while maintaining native performance for video playback.

## Development Best Practices

1. **Always run linting** before submitting code: `gulp lint`
2. **Use UI playground** for testing: `gulp serve`
3. **Follow naming conventions** for components and files
4. **Implement proper lifecycle methods** in components
5. **Use TypeScript interfaces** for component configuration
6. **Test components** with Jest and mock helpers
7. **Check versions** when debugging issues
8. **Use factory methods** for creating UI structures rather than manual construction