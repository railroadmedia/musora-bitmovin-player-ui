import { Container, ContainerConfig } from '../Container';
import { SmallCenteredPlaybackToggleButton } from '../buttons/SmallCenteredPlaybackToggleButton';
import { QuickSeekButton } from '../buttons/QuickSeekButton';
import { PlayerAPI } from 'bitmovin-player';
import { UIInstanceManager } from '../../UIManager';
import { EventDispatcher, NoArgs, Event as EDEvent } from '../../EventDispatcher';
import { Timeout } from '../../utils/Timeout';
import { PlayerUtils } from '../../utils/PlayerUtils';
import { HTMLElementWithComponent } from '../../DOM';
import { Label, LabelConfig } from '../labels/Label';
// NOTE: uncomment to re-enable double tap visuals
// import { i18n } from '../../localization/i18n';

/**
 * Messages for lesson prev/next on the side buttons only. Double-tap on the overlay edges still quick-seeks.
 */
export interface LessonNavigationMessages {
  previousMessage: string;
  nextMessage: string;
}

export interface TouchControlOverlayConfig extends ContainerConfig {
  /**
   * Specify whether the player should be set to enter fullscreen by clicking on the playback toggle button
   * when initiating the initial playback.
   * Default: false.
   */
  enterFullscreenOnInitialPlayback?: boolean;

  /**
   * Specifies whether the first touch event received by the {@link UIContainer} should be prevented or not.
   *
   * Default: true
   */
  acceptsTouchWithUiHidden?: boolean;

  /**
   * Specifies how many seconds are seeked incase user seeks through double-tapping
   * Default: 10sec
   */
  seekTime?: number;

  /**
   * The second tap of a double tap has to be in a specific range of the first tap
   * This specifies how many pixels off the second tap is allowed to be from the first tap
   * in order to trigger the seek events
   *
   * Default: 15px
   */
  seekDoubleTapMargin?: number;

  /**
   * Time in milliseconds within which two consecutive taps are considered a double tap.
   * Default: 200ms
   */
  seekDoubleTapTimeout?: number;

  /**
   * When set, left/right overlay buttons use lesson prev/next icons and send CustomMessageHandler messages.
   * Double-tap on the left/right thirds still seeks by {@link TouchControlOverlayConfig.seekTime} (default 10s).
   */
  lessonNavigation?: LessonNavigationMessages;
}

interface ClickPosition {
  x: number;
  y: number;
}

/**
 * Overlays the player and detects touch input
 */
export class TouchControlOverlay extends Container<TouchControlOverlayConfig> {
  private readonly SEEK_FORWARD_CLASS = 'seek-forward';
  private readonly SEEK_BACKWARD_CLASS = 'seek-backward';

  private touchControlEvents = {
    onSingleClick: new EventDispatcher<TouchControlOverlay, NoArgs>(),
    onDoubleClick: new EventDispatcher<TouchControlOverlay, NoArgs>(),
    onSeekBackward: new EventDispatcher<TouchControlOverlay, NoArgs>(),
    onSeekForward: new EventDispatcher<TouchControlOverlay, NoArgs>(),
  };

  private playbackToggleButton: SmallCenteredPlaybackToggleButton;
  private quickSeekBackwardButton: QuickSeekButton;
  private quickSeekForwardButton: QuickSeekButton;
  private seekForwardLabel: Label<LabelConfig>;
  private seekBackwardLabel: Label<LabelConfig>;

  // true if the last tap on the overlay was less than 500msec ago
  private couldBeDoubleTapping: Boolean;
  private doubleTapTimeout: Timeout;

  private latestTapPosition: ClickPosition;

  constructor(config: TouchControlOverlayConfig = {}) {
    super(config);

    this.playbackToggleButton = new SmallCenteredPlaybackToggleButton({
      enterFullscreenOnInitialPlayback: Boolean(config.enterFullscreenOnInitialPlayback),
    });

    const lessonNav = config.lessonNavigation;
    if (lessonNav) {
      this.quickSeekBackwardButton = new QuickSeekButton({
        customMessage: lessonNav.previousMessage,
        lessonNavigationRole: 'previous',
      });
      this.quickSeekForwardButton = new QuickSeekButton({
        customMessage: lessonNav.nextMessage,
        lessonNavigationRole: 'next',
      });
    } else {
      this.quickSeekBackwardButton = new QuickSeekButton({ seekSeconds: -10 });
      this.quickSeekForwardButton = new QuickSeekButton({ seekSeconds: 10 });
    }

    this.seekForwardLabel = new Label({
      text: '',
      for: this.getConfig().id,
      cssClass: 'seek-forward-label',
      hidden: true,
    });
    this.seekBackwardLabel = new Label({
      text: '',
      for: this.getConfig().id,
      cssClass: 'seek-backward-label',
      hidden: true,
    });

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-touch-control-overlay',
        acceptsTouchWithUiHidden: true,
        seekTime: 10,
        seekDoubleTapMargin: 15,
        seekDoubleTapTimeout: 200,
        components: [
          this.seekBackwardLabel,
          this.quickSeekBackwardButton,
          this.playbackToggleButton,
          this.quickSeekForwardButton,
          this.seekForwardLabel,
        ],
      },
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    let playerSeekTime = 0;
    // NOTE: uncomment to re-enable double tap visuals
    // let startSeekTime = 0;

    this.doubleTapTimeout = new Timeout(this.config.seekDoubleTapTimeout, () => {
      this.couldBeDoubleTapping = false;
      // NOTE: uncomment to re-enable double tap visuals
      // startSeekTime = 0;
      setTimeout(() => this.hideSeekAnimationElements(), 150);
    });

    let isBufferingOverlayVisible = false;
    let areControlsVisible = false;

    const showPlaybackToggleButton = () => {
      this.playbackToggleButton.show();
      this.quickSeekBackwardButton.show();
      this.quickSeekForwardButton.show();
    };

    const hidePlaybackToggleButton = () => {
      this.playbackToggleButton.hide();
      this.quickSeekBackwardButton.hide();
      this.quickSeekForwardButton.hide();
    };

    uimanager.onBufferingShow.subscribe(() => {
      isBufferingOverlayVisible = true;
      hidePlaybackToggleButton();
    });

    uimanager.onBufferingHide.subscribe(() => {
      isBufferingOverlayVisible = false;
      if (areControlsVisible) {
        showPlaybackToggleButton();
      }
    });

    uimanager.onControlsHide.subscribe(() => {
      areControlsVisible = false;
      hidePlaybackToggleButton();
    });

    uimanager.onControlsShow.subscribe(() => {
      areControlsVisible = true;
      if (!isBufferingOverlayVisible) {
        showPlaybackToggleButton();
      }
    });

    player.on(player.exports.PlayerEvent.PlaybackFinished, () => {
      player.seek(0);
      setTimeout(() => {
        player.play('ui');
      }, 100);
      setTimeout(() => {
        player.pause('ui');
      }, 200);
    });

    this.touchControlEvents.onSeekBackward.subscribe(() => {
      // Double-tap edges always quick-seek by seekTime (e.g. 10s). Lesson prev/next is only on the side buttons.
      playerSeekTime = PlayerUtils.clampValueToRange(
        playerSeekTime - this.config.seekTime,
        0,
        player.getDuration() ?? Infinity,
      );
      player.seek(playerSeekTime);

      // NOTE: uncomment to re-enable double tap visuals
      // this.seekBackwardLabel.setText(
      //   Math.abs(Math.round(playerSeekTime - startSeekTime)) +
      //     ' ' +
      //     i18n.performLocalization(i18n.getLocalizer('settings.time.seconds')),
      // );
      // this.seekBackwardLabel.show();
      // this.getDomElement().addClass(this.prefixCss(this.SEEK_BACKWARD_CLASS));
      // this.seekForwardLabel.hide();
      // this.getDomElement().removeClass(this.prefixCss(this.SEEK_FORWARD_CLASS));
    });

    this.touchControlEvents.onSeekForward.subscribe(() => {
      // Double-tap edges always quick-seek by seekTime (e.g. 10s). Lesson prev/next is only on the side buttons.
      playerSeekTime = PlayerUtils.clampValueToRange(
        playerSeekTime + this.config.seekTime,
        0,
        player.getDuration() ?? Infinity,
      );
      player.seek(playerSeekTime);

      // NOTE: uncomment to re-enable double tap visuals
      // this.seekForwardLabel.setText(
      //   Math.abs(Math.round(playerSeekTime - startSeekTime)) +
      //     ' ' +
      //     i18n.performLocalization(i18n.getLocalizer('settings.time.seconds')),
      // );
      // this.seekForwardLabel.show();
      // this.getDomElement().addClass(this.prefixCss(this.SEEK_FORWARD_CLASS));
      // this.seekBackwardLabel.hide();
      // this.getDomElement().removeClass(this.prefixCss(this.SEEK_BACKWARD_CLASS));
    });

    this.touchControlEvents.onSingleClick.subscribe(() => {
      uimanager.getUI().toggleUiShown();
    });

    this.touchControlEvents.onDoubleClick.subscribe((_, e) => {
      uimanager.getUI().hideUi();
      const event = e as Event;
      const eventTarget = event.target as HTMLElementWithComponent;
      if (!eventTarget || !(eventTarget.component instanceof TouchControlOverlay)) {
        return;
      }

      const width = eventTarget.clientWidth;
      const rect = eventTarget.getBoundingClientRect();
      const eventTapX = (<MouseEvent>e).clientX - rect.left;
      const eventTapY = (<MouseEvent>e).clientY - rect.top;

      const backwardRect = this.quickSeekBackwardButton.getDomElement().get(0).getBoundingClientRect();
      const forwardRect = this.quickSeekForwardButton.getDomElement().get(0).getBoundingClientRect();

      const doubleTapMargin = this.config.seekDoubleTapMargin;
      if (
        Math.abs(this.latestTapPosition.x - eventTapX) <= doubleTapMargin &&
        Math.abs(this.latestTapPosition.y - eventTapY) <= doubleTapMargin
      ) {
        if (backwardRect.width > 0 && forwardRect.width > 0) {
          if (eventTapX < backwardRect.left - rect.left) {
            this.touchControlEvents.onSeekBackward.dispatch(this);
          } else if (eventTapX > forwardRect.right - rect.left) {
            this.touchControlEvents.onSeekForward.dispatch(this);
          }
        } else {
          if (eventTapX < width * 0.4) {
            this.touchControlEvents.onSeekBackward.dispatch(this);
          } else if (eventTapX > width * 0.6) {
            this.touchControlEvents.onSeekForward.dispatch(this);
          }
        }
      }
      this.latestTapPosition = { x: eventTapX, y: eventTapY };
    });

    this.getDomElement().on('click', e => {
      if ((e.target as HTMLElementWithComponent).component instanceof TouchControlOverlay) {
        clickEventDispatcher(e);
      }
    });

    let pendingUiToggle: ReturnType<typeof setTimeout> | null = null;

    const clickEventDispatcher = (e: Event): void => {
      const eventTarget = (e as Event).target as HTMLElementWithComponent;
      const rect = eventTarget.getBoundingClientRect();
      const eventTapX = (<MouseEvent>e).clientX - rect.left;
      const eventTapY = (<MouseEvent>e).clientY - rect.top;
      const width = eventTarget.clientWidth;
      const backwardRect = this.quickSeekBackwardButton.getDomElement().get(0).getBoundingClientRect();
      const forwardRect = this.quickSeekForwardButton.getDomElement().get(0).getBoundingClientRect();
      const isInSeekZone =
        backwardRect.width > 0 && forwardRect.width > 0
          ? eventTapX < backwardRect.left - rect.left || eventTapX > forwardRect.right - rect.left
          : eventTapX < width * 0.4 || eventTapX > width * 0.6;

      if (this.couldBeDoubleTapping) {
        if (pendingUiToggle !== null) {
          clearTimeout(pendingUiToggle);
          pendingUiToggle = null;
        }
        this.onDoubleClickEvent(e);
      } else {
        // Always record seek time and position on first tap — needed for double-tap seek
        playerSeekTime = player.getCurrentTime();
        this.latestTapPosition = { x: eventTapX, y: eventTapY };

        if (isInSeekZone) {
          // Delay the UI toggle: if a second tap follows, we cancel it to avoid a flash
          pendingUiToggle = setTimeout(() => {
            pendingUiToggle = null;
            this.onSingleClickEvent(e);
          }, this.config.seekDoubleTapTimeout);
        } else {
          this.onSingleClickEvent(e);
        }
      }
      this.couldBeDoubleTapping = true;
      this.doubleTapTimeout.start();
    };
  }

  private hideSeekAnimationElements(): void {
    this.getDomElement().removeClass(this.prefixCss(this.SEEK_FORWARD_CLASS));
    this.getDomElement().removeClass(this.prefixCss(this.SEEK_BACKWARD_CLASS));
    this.seekForwardLabel.hide();
    this.seekBackwardLabel.hide();
  }

  protected onDoubleClickEvent(e: Event) {
    this.touchControlEvents.onDoubleClick.dispatch(this, e);
  }

  protected onSingleClickEvent(e: Event) {
    this.touchControlEvents.onSingleClick.dispatch(this, e);
  }

  get onClick(): EDEvent<TouchControlOverlay, NoArgs> {
    return this.touchControlEvents.onSingleClick.getEvent();
  }
}
