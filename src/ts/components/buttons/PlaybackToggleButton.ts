import { ToggleButton, ToggleButtonConfig } from './ToggleButton';
import { UIInstanceManager } from '../../UIManager';
import { PlayerUtils } from '../../utils/PlayerUtils';
import { PlayerAPI, WarningEvent } from 'bitmovin-player';
import { i18n } from '../../localization/i18n';

/**
 * @category Configs
 */
export interface PlaybackToggleButtonConfig extends ToggleButtonConfig {
  /**
   * Specify whether the player should be set to enter fullscreen by clicking on the playback toggle button
   * when initiating the initial playback.
   * Default is false.
   */
  enterFullscreenOnInitialPlayback?: boolean;

  /**
   * Toggles playback when Space is pressed after focusing or clicking the playback toggle.
   * Default is false.
   */
  spacebarPlaybackShortcut?: boolean;
}

const SET_SPACEBAR_PLAYBACK_SHORTCUT_ACTIVE_MESSAGE = 'setSpacebarPlaybackShortcutActive';

declare const window: {
  bitmovin?: {
    customMessageHandler?: {
      on: (event: string, callback: (data?: string) => void) => void;
    };
  };
};

/**
 * A button that toggles between playback and pause.
 *
 * @category Buttons
 */
export class PlaybackToggleButton extends ToggleButton<PlaybackToggleButtonConfig> {
  private static readonly CLASS_STOPTOGGLE = 'stoptoggle';
  protected isPlayInitiated: boolean;

  constructor(config: PlaybackToggleButtonConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-playbacktogglebutton',
        text: i18n.getLocalizer('play'),
        onAriaLabel: i18n.getLocalizer('pause'),
        offAriaLabel: i18n.getLocalizer('play'),
      },
      this.config,
    );

    this.isPlayInitiated = false;
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager, handleClickEvent: boolean = true): void {
    super.configure(player, uimanager);

    if (this.config.spacebarPlaybackShortcut) {
      this.addSpacebarKeyboardActivation(uimanager);
    }

    // Set enterFullscreenOnInitialPlayback if set in the uimanager config
    if (typeof uimanager.getConfig().enterFullscreenOnInitialPlayback === 'boolean') {
      this.config.enterFullscreenOnInitialPlayback = uimanager.getConfig().enterFullscreenOnInitialPlayback;
    }

    let isSeeking = false;
    let firstPlay = true;

    // Handler to update button state based on player state
    const playbackStateHandler = () => {
      // If the UI is currently seeking, playback is temporarily stopped but the buttons should
      // not reflect that and stay as-is (e.g indicate playback while seeking).
      if (isSeeking) {
        return;
      }

      if (player.isPlaying() || this.isPlayInitiated) {
        this.on();
      } else {
        this.off();
      }
    };

    // Call handler upon these events
    player.on(player.exports.PlayerEvent.Play, e => {
      this.isPlayInitiated = true;
      firstPlay = false;
      playbackStateHandler();
    });

    player.on(player.exports.PlayerEvent.Paused, e => {
      this.isPlayInitiated = false;
      playbackStateHandler();
    });

    player.on(player.exports.PlayerEvent.Playing, e => {
      this.isPlayInitiated = false;
      playbackStateHandler();
    });
    // after unloading + loading a new source, the player might be in a different playing state (from playing into stopped)
    player.on(player.exports.PlayerEvent.SourceLoaded, playbackStateHandler);
    uimanager.getConfig().events.onUpdated.subscribe(playbackStateHandler);
    player.on(player.exports.PlayerEvent.SourceUnloaded, playbackStateHandler);
    // when playback finishes, player turns to paused mode
    player.on(player.exports.PlayerEvent.PlaybackFinished, playbackStateHandler);
    player.on(player.exports.PlayerEvent.CastStarted, playbackStateHandler);

    // When a playback attempt is rejected with warning 5008, we switch the button state back to off
    // This is required for blocked autoplay, because there is no Paused event in such case
    player.on(player.exports.PlayerEvent.Warning, (event: WarningEvent) => {
      if (event.code === player.exports.WarningCode.PLAYBACK_COULD_NOT_BE_STARTED) {
        this.isPlayInitiated = false;
        firstPlay = true;
        this.off();
      }
    });

    const updateLiveState = () => {
      const showStopToggle = player.isLive() && !PlayerUtils.isTimeShiftAvailable(player);

      if (showStopToggle) {
        this.getDomElement().addClass(this.prefixCss(PlaybackToggleButton.CLASS_STOPTOGGLE));
      } else {
        this.getDomElement().removeClass(this.prefixCss(PlaybackToggleButton.CLASS_STOPTOGGLE));
      }
    };

    // Detect absence of timeshifting on live streams and add tagging class to convert button icons to play/stop
    const timeShiftDetector = new PlayerUtils.TimeShiftAvailabilityDetector(player);
    const liveStreamDetector = new PlayerUtils.LiveStreamDetector(player, uimanager);

    timeShiftDetector.onTimeShiftAvailabilityChanged.subscribe(() => updateLiveState());
    liveStreamDetector.onLiveChanged.subscribe(() => updateLiveState());

    timeShiftDetector.detect(); // Initial detection
    liveStreamDetector.detect();

    if (handleClickEvent) {
      // Control player by button events
      // When a button event triggers a player API call, events are fired which in turn call the event handler
      // above that updated the button state.
      this.onClick.subscribe(() => {
        if (player.isPlaying() || this.isPlayInitiated) {
          player.pause('ui');
        } else {
          player.play('ui');

          if (firstPlay && this.config.enterFullscreenOnInitialPlayback) {
            player.setViewMode(player.exports.ViewMode.Fullscreen);
          }
        }
      });
    }

    // Track UI seeking status
    uimanager.onSeek.subscribe(() => {
      isSeeking = true;
    });
    uimanager.onSeeked.subscribe(() => {
      isSeeking = false;
    });

    // Startup init
    playbackStateHandler();
  }

  private addSpacebarKeyboardActivation(uimanager: UIInstanceManager): void {
    const buttonElement = this.getDomElement().get(0);
    let handledSpacebar = false;
    let spacebarShortcutActive = false;

    const isPlaybackToggleTarget = (target: EventTarget | null) =>
      target instanceof Node && buttonElement.contains(target);

    const updateSpacebarShortcutState = (event: Event) => {
      spacebarShortcutActive = isPlaybackToggleTarget(event.target);
    };

    window.bitmovin?.customMessageHandler?.on(SET_SPACEBAR_PLAYBACK_SHORTCUT_ACTIVE_MESSAGE, (data?: string) => {
      spacebarShortcutActive = data === 'true';

      if (!spacebarShortcutActive) {
        handledSpacebar = false;
      }
    });

    const handleSpacebar = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !spacebarShortcutActive ||
        !PlaybackToggleButton.isSpacebarEvent(event)
      ) {
        return;
      }

      event.preventDefault();

      if (!handledSpacebar) {
        handledSpacebar = true;
        this.onClickEvent();
        setTimeout(() => {
          handledSpacebar = false;
        }, 250);
      }
    };

    const resetSpacebar = (event: KeyboardEvent) => {
      if (PlaybackToggleButton.isSpacebarEvent(event)) {
        handledSpacebar = false;
      }
    };
    const keyboardEvents: Array<'keydown' | 'keypress'> = ['keydown', 'keypress'];
    const activationEvents: Array<'click' | 'focusin' | 'touchstart'> = ['click', 'focusin', 'touchstart'];

    keyboardEvents.forEach(event => document.addEventListener(event, handleSpacebar, true));
    document.addEventListener('keyup', resetSpacebar, true);
    activationEvents.forEach(event => document.addEventListener(event, updateSpacebarShortcutState, true));

    uimanager.onRelease.subscribe(() => {
      keyboardEvents.forEach(event => document.removeEventListener(event, handleSpacebar, true));
      document.removeEventListener('keyup', resetSpacebar, true);
      activationEvents.forEach(event => document.removeEventListener(event, updateSpacebarShortcutState, true));
    });
  }

  private static isSpacebarEvent(event: KeyboardEvent): boolean {
    const legacyEvent = event as KeyboardEvent & { charCode?: number; keyIdentifier?: string; which?: number };

    return (
      event.key === ' ' ||
      event.key === 'Spacebar' ||
      event.code === 'Space' ||
      event.keyCode === 32 ||
      legacyEvent.which === 32 ||
      legacyEvent.charCode === 32 ||
      legacyEvent.keyIdentifier === 'U+0020'
    );
  }
}
