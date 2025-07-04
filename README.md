# Bitmovin Player UI [![npm version](https://badge.fury.io/js/bitmovin-player-ui.svg)](https://badge.fury.io/js/bitmovin-player-ui) [![Build Status](https://app.travis-ci.com/bitmovin/bitmovin-player-ui.svg?branch=develop)](https://app.travis-ci.com/bitmovin/bitmovin-player-ui)

This repository contains the Bitmovin Player UI framework.
It is designed as a flexible and modularized layer on the player API, enabling customers and users of the player to easily customize the UI to their needs in design, structure, and functionality. It makes it extremely easy and straightforward to add additional control components and we encourage our users to proactively contribute to our codebase.

Read more about the Framework, its usage and customization possibilities in our [developer documentation](https://developer.bitmovin.com/playback/docs/bitmovin-player-ui) and the [API documentation](https://cdn.bitmovin.com/player/ui/3/docs/index.html).

## Installation

The UI framework is also available through the following distribution channels:

### CDN

The UI framework and default skin bundled with the latest player release are always available via CDN. This is the recommended way if you just want to work with the predefined UI components. All components will be available in the `bitmovin.playerui` namespace.

 * JavaScript library: `//cdn.bitmovin.com/player/web/8/bitmovinplayer-ui.js` 
 * CSS default skin: `//cdn.bitmovin.com/player/web/8/bitmovinplayer-ui.css`

### NPM

The UI framework is also available in the NPM repository and comes with all source and distributable files, JavaScript modules and TypeScript type definitions.

 * `npm install bitmovin-player-ui`


## Getting Started with Development

 0. Clone Git repository
 1. Install node.js
 2. Install Gulp: `npm install --global gulp-cli`
 3. Install required npm packages: `npm install`
 4. Run Gulp tasks (`gulp --tasks`)
  * `gulp` to build project into `dist` directory
  * `gulp watch` to develop and rebuild changed files automatically
  * `gulp serve` to open test page in browser, build and reload changed files automatically
  * `gulp lint` to lint TypeScript and SASS files
  * `gulp build-prod` to build project with minified files into `dist` directory
  
To take a look at the project, run `gulp serve`. For changes, check our [CHANGELOG](CHANGELOG.md). This UI framework version is for player v8. The UI framework for player v7 can be found in the `support/v2.x` branch.

### CSS Architecture
The framework uses conditional CSS classes rather than separate stylesheets - the UIManager adds/removes classes like:
- `.bmpui-ui-smallscreen` - Mobile styles
- `.bmpui-ad-mode` - Ad-specific styles
- `.bmpui-tv-mode` - TV interface styles
- `.bmpui-cast-receiver` - Chromecast styles

## UI Playground

The UI playground can be launched with `gulp serve` and opens a page in a local browser window. On this page, you can switch between different sources and UI styles, trigger API actions and observe events.

This page uses BrowserSync to sync the state across multiple tabs and browsers and recompiles and reloads automatically files automatically when any `.scss` or `.ts` files are modified. It makes a helpful tool for developing and testing the UI.

## Contributing

Pull requests are welcome! Please check the [contribution guidelines](CONTRIBUTING.md).

# Building Customisations With React Native Support In Mind
This section provides a complete guide for building custom JavaScript UI that integrates with the Bitmovin Player React Native library.

### JavaScript UI Factory Pattern

#### Required Factory Function
Your custom UI JavaScript must expose a factory function on the `window` object:

```javascript
// Essential: Your UI factory function signature
window.yourNamespace = {
  CustomUIFactory: {
    buildCustomUI: function(player, uiConfig) {
      // player: Full Bitmovin Player instance
      // uiConfig: Configuration from React Native
      return new YourCustomUIManager(player, uiConfig);
    }
  }
};
```

#### UIManager Class Requirements
```javascript
class YourCustomUIManager {
  constructor(player, uiConfig) {
    this.player = player;
    this.config = uiConfig;
    this.components = [];
  }

  // Required lifecycle methods
  configure(player, uiConfig) { /* Initialize UI */ }
  getConfig() { return this.config; }
  getUI() { return this.domElement; }
  setPlayer(player) { this.player = player; }
  release() { /* Cleanup resources */ }
}
```

### React Native Configuration

#### Basic Setup
```typescript
const player = usePlayer({
  styleConfig: {
    playerUiJs: 'https://yourdomain.com/custom-ui.js',
    playerUiCss: 'https://yourdomain.com/custom-ui.css',
    supplementalPlayerUiCss: 'https://yourdomain.com/additional-styles.css',
    userInterfaceType: UserInterfaceType.Bitmovin,
    isUiEnabled: true,
  },
});

const playerViewConfig = {
  uiConfig: {
    variant: new CustomUi('yourNamespace.CustomUIFactory.buildCustomUI'),
    playbackSpeedSelectionEnabled: true,
    focusUiOnInitialization: true, // Android TV only
  },
};
```

### Bidirectional Communication Bridge

#### CustomMessageHandler Setup
```typescript
// React Native side
const customMessageHandler = new CustomMessageHandler({
  onReceivedSynchronousMessage: (message: string, data: string | undefined) => {
    // Handle messages FROM your JavaScript UI
    switch (message) {
      case 'closePlayer':
        navigation.goBack();
        break;
      case 'customAction':
        handleCustomAction(JSON.parse(data || '{}'));
        break;
    }
    return "response"; // Optional return value
  },
  onReceivedAsynchronousMessage: (message: string, data: string | undefined) => {
    // Handle async messages FROM your JavaScript UI
    console.log('Async message:', message, data);
  },
});

// Send messages TO your JavaScript UI
customMessageHandler.sendMessage('updateUIState', JSON.stringify({ visible: true }));
```

#### JavaScript UI Communication
```javascript
// In your custom UI JavaScript
class YourCustomUIManager {
  constructor(player, uiConfig) {
    this.player = player;
    this.messageHandler = player.getCustomMessageHandler();
  }

  onButtonClick() {
    // Send synchronous message to React Native
    const response = this.messageHandler.sendSynchronousMessage('closePlayer', null);
    
    // Send async message to React Native
    this.messageHandler.sendAsynchronousMessage('userAction', JSON.stringify({
      action: 'buttonClicked',
      timestamp: Date.now()
    }));
  }
}
```

### Full Player Instance API Available to Your UI

#### Core Playback Methods
```javascript
// Your UI has access to the full player instance
player.play();
player.pause();
player.seek(timeInSeconds);
player.mute();
player.unmute();
player.setVolume(0-100);

// Async getters (return Promises)
const currentTime = await player.getCurrentTime();
const duration = await player.getDuration();
const isPlaying = await player.isPlaying();
const isPaused = await player.isPaused();
const isMuted = await player.isMuted();
const volume = await player.getVolume();
```

#### Track Management
```javascript
// Audio/subtitle track management
const audioTracks = await player.getAvailableAudioTracks();
const currentAudio = await player.getAudioTrack();
player.setAudioTrack(audioTrack);

const subtitleTracks = await player.getAvailableSubtitleTracks();
const currentSubtitle = await player.getSubtitleTrack();
player.setSubtitleTrack(subtitleTrack);
```

#### Advanced Features
```javascript
// Live streaming
const isLive = await player.isLive();
player.timeShift(offsetInSeconds);

// Quality management
const qualities = await player.getAvailableVideoQualities();
player.setVideoQuality(quality);

// Thumbnails
const thumbnail = await player.getThumbnail(timeInSeconds);
```

### Event Handling Integration

#### PlayerView Events Your UI Can Listen To
```typescript
<PlayerView
  player={player}
  customMessageHandler={customMessageHandler}
  onReady={(event) => { /* Player ready */ }}
  onPlay={(event) => { /* Playback started */ }}
  onPaused={(event) => { /* Playback paused */ }}
  onTimeChanged={(event) => { /* Time updated */ }}
  onAudioChanged={(event) => { /* Audio track changed */ }}
  onSubtitleChanged={(event) => { /* Subtitle track changed */ }}
  onFullscreenEnter={(event) => { /* Entered fullscreen */ }}
  onFullscreenExit={(event) => { /* Exited fullscreen */ }}
  onPlayerError={(event) => { /* Error occurred */ }}
  onVideoPlaybackQualityChanged={(event) => { /* Quality changed */ }}
/>
```

#### JavaScript UI Event Binding
```javascript
// In your UI, bind to player events
this.player.on('play', () => {
  this.updatePlayButton(false); // Hide play, show pause
});

this.player.on('pause', () => {
  this.updatePlayButton(true); // Show play, hide pause
});

this.player.on('timeChanged', (event) => {
  this.updateSeekbar(event.time);
});
```

### Required Component Structure

#### Base Component Pattern
```javascript
class UIComponent {
  constructor(config) {
    this.config = config;
    this.enabled = true;
    this.visible = true;
    this.element = null;
  }

  // Required methods
  configure(player, uiConfig) { /* Setup */ }
  toDomElement() { return this.element; }
  show() { this.visible = true; }
  hide() { this.visible = false; }
  setEnabled(enabled) { this.enabled = enabled; }
  isEnabled() { return this.enabled; }
  isHidden() { return !this.visible; }
  release() { /* Cleanup */ }
}
```

### Styling and Configuration Options

#### StyleConfig Interface
```typescript
interface StyleConfig {
  isUiEnabled?: boolean;                    // Enable/disable UI
  userInterfaceType?: UserInterfaceType;    // Bitmovin | System | Subtitle
  playerUiCss?: string;                     // Replace default CSS
  playerUiJs?: string;                      // Replace default JS
  supplementalPlayerUiCss?: string;         // Additional CSS
  scalingMode?: ScalingMode;                // Fit | Stretch | Zoom
}
```

#### UI Variants
```typescript
// Built-in variants
new SmallScreenUi()  // Mobile optimized
new TvUi()           // TV/Android TV optimized
new CustomUi('your.custom.factory.function')  // Your custom UI
```

### Platform-Specific Considerations

#### Android Bridge
```kotlin
// Native Android bridge uses @JavascriptInterface
class CustomMessageHandlerBridge {
    @JavascriptInterface
    fun sendSynchronous(name: String, data: String?): String?
    
    @JavascriptInterface
    fun sendAsynchronous(name: String, data: String?)
}
```

#### iOS Integration
- Uses WKWebView for JavaScript UI
- Swift bridge for message passing
- Supports native fullscreen handling

### Essential Implementation Checklist

For your custom UI to work with this React Native player, you must:

✅ **Create a global factory function** accessible on `window`
✅ **Return a UIManager instance** from your factory function  
✅ **Implement required lifecycle methods** (configure, release, etc.)
✅ **Handle bidirectional messaging** via CustomMessageHandler
✅ **Bind to player events** for UI state updates
✅ **Support component lifecycle** (show, hide, enable/disable)
✅ **Provide CSS styling** for responsive design
✅ **Handle fullscreen state** via FullscreenHandler
✅ **Support accessibility** features (ARIA, keyboard navigation)
✅ **Clean up resources** in release() method

This complete interface allows you to build a fully custom player UI while maintaining seamless integration with React Native and native platform features.