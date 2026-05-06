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
   * Default: 5sec
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
   * Default: 300ms
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

const DEFAULT_SEEK_TIME = 5;

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

  // Lesson-navigation visibility/disabled state set by the native host
  private lessonNavVisible: boolean = true;
  private lessonNavPrevDisabled: boolean = false;
  private lessonNavNextDisabled: boolean = false;

  private areControlsVisible: boolean = false;

  private readonly LESSON_NAV_DISABLED_CLASS = 'lesson-nav-disabled';

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
      this.quickSeekBackwardButton = new QuickSeekButton({ seekSeconds: -DEFAULT_SEEK_TIME });
      this.quickSeekForwardButton = new QuickSeekButton({ seekSeconds: DEFAULT_SEEK_TIME });
    }

    this.seekForwardLabel = new Label<LabelConfig>({
      text: '',
      cssClass: 'seek-forward-label',
      hidden: true,
    });
    this.seekBackwardLabel = new Label<LabelConfig>({
      text: '',
      cssClass: 'seek-backward-label',
      hidden: true,
    });

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-touch-control-overlay',
        acceptsTouchWithUiHidden: true,
        seekTime: DEFAULT_SEEK_TIME,
        seekDoubleTapMargin: 15,
        seekDoubleTapTimeout: 300,
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
    let seekDisplayTimeout: ReturnType<typeof setTimeout> | null = null;
    let seekAccumulator = 0;
    let activeSeekClass = '';
    let seekLabelHiding = false;
    const seekTime = this.config.seekTime ?? DEFAULT_SEEK_TIME;

    const showSeekIndicator = (
      label: Label<LabelConfig>,
      otherLabel: Label<LabelConfig>,
      text: string,
      seekClass: string,
      otherSeekClass: string,
    ): void => {
      seekLabelHiding = false;
      otherLabel.getDomElement().removeClass(this.prefixCss('seek-animating'));
      otherLabel.hide();
      this.getDomElement().removeClass(this.prefixCss(otherSeekClass));
      this.getDomElement().addClass(this.prefixCss(seekClass));
      label.setText(text);
      label.show();
      const el = label.getDomElement();
      el.removeClass(this.prefixCss('seek-animating'));
      void (el.get(0) as HTMLElement).offsetWidth;
      el.addClass(this.prefixCss('seek-animating'));
      if (seekDisplayTimeout !== null) {
        clearTimeout(seekDisplayTimeout);
      }
      seekDisplayTimeout = setTimeout(() => {
        label.hide();
        this.getDomElement().removeClass(this.prefixCss(seekClass));
        seekDisplayTimeout = null;
        seekLabelHiding = true;
      }, 500);
    };

    this.doubleTapTimeout = new Timeout(this.config.seekDoubleTapTimeout, () => {
      this.couldBeDoubleTapping = false;
    });

    const onSeekLabelTransitionEnd = (e: TransitionEvent): void => {
      if (e.propertyName === 'opacity' && seekLabelHiding) {
        seekLabelHiding = false;
        seekAccumulator = 0;
        activeSeekClass = '';
      }
    };
    (this.seekForwardLabel.getDomElement().get(0) as HTMLElement).addEventListener(
      'transitionend',
      onSeekLabelTransitionEnd,
    );
    (this.seekBackwardLabel.getDomElement().get(0) as HTMLElement).addEventListener(
      'transitionend',
      onSeekLabelTransitionEnd,
    );

    let isBufferingOverlayVisible = false;

    const showPlaybackToggleButton = () => {
      this.playbackToggleButton.show();
      // Only show nav buttons if the native host hasn't hidden them
      if (this.lessonNavVisible) {
        this.quickSeekBackwardButton.show();
        this.quickSeekForwardButton.show();
      }
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
      if (this.areControlsVisible) {
        showPlaybackToggleButton();
      }
    });

    uimanager.onControlsHide.subscribe(() => {
      this.areControlsVisible = false;
      hidePlaybackToggleButton();
    });

    uimanager.onControlsShow.subscribe(() => {
      this.areControlsVisible = true;
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
      playerSeekTime = PlayerUtils.clampValueToRange(playerSeekTime - seekTime, 0, player.getDuration() ?? Infinity);
      player.seek(playerSeekTime);
      if (activeSeekClass !== this.SEEK_BACKWARD_CLASS || (seekDisplayTimeout === null && !seekLabelHiding)) {
        seekAccumulator = 0;
        activeSeekClass = this.SEEK_BACKWARD_CLASS;
      }
      seekAccumulator += seekTime;
      showSeekIndicator(
        this.seekBackwardLabel,
        this.seekForwardLabel,
        `- ${seekAccumulator}`,
        this.SEEK_BACKWARD_CLASS,
        this.SEEK_FORWARD_CLASS,
      );
    });

    this.touchControlEvents.onSeekForward.subscribe(() => {
      playerSeekTime = PlayerUtils.clampValueToRange(playerSeekTime + seekTime, 0, player.getDuration() ?? Infinity);
      player.seek(playerSeekTime);
      if (activeSeekClass !== this.SEEK_FORWARD_CLASS || (seekDisplayTimeout === null && !seekLabelHiding)) {
        seekAccumulator = 0;
        activeSeekClass = this.SEEK_FORWARD_CLASS;
      }
      seekAccumulator += seekTime;
      showSeekIndicator(
        this.seekForwardLabel,
        this.seekBackwardLabel,
        `+ ${seekAccumulator}`,
        this.SEEK_FORWARD_CLASS,
        this.SEEK_BACKWARD_CLASS,
      );
    });

    this.touchControlEvents.onSingleClick.subscribe(() => {
      uimanager.getUI().toggleUiShown();
    });

    this.touchControlEvents.onDoubleClick.subscribe((_, e) => {
      uimanager.getUI().hideUi();
      const event = e as Event;
      const eventTarget = event.target as HTMLElementWithComponent;
      if (eventTarget?.component && !(eventTarget.component instanceof TouchControlOverlay)) {
        return;
      }

      const overlayEl = this.getDomElement().get(0) as HTMLElement;
      const width = overlayEl.clientWidth;
      const rect = overlayEl.getBoundingClientRect();
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
      const target = (e.target as HTMLElementWithComponent).component;
      const isSeekLabel = target === this.seekForwardLabel || target === this.seekBackwardLabel;
      if (!target || target instanceof TouchControlOverlay || isSeekLabel) {
        clickEventDispatcher(e);
      }
    });

    let pendingUiToggle: ReturnType<typeof setTimeout> | null = null;

    const clickEventDispatcher = (e: Event): void => {
      const overlayEl = this.getDomElement().get(0) as HTMLElement;
      const rect = overlayEl.getBoundingClientRect();
      const eventTapX = (<MouseEvent>e).clientX - rect.left;
      const eventTapY = (<MouseEvent>e).clientY - rect.top;
      const width = overlayEl.clientWidth;
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

  /**
   * Called by the native host via the `setLessonNavigationState` CustomMessageHandler event.
   * Controls whether the prev/next lesson buttons are shown and whether they appear disabled.
   *
   * @param show          Whether to render the lesson-nav buttons at all.
   * @param prevDisabled  Disable (grey out) the previous button — used on the first lesson.
   * @param nextDisabled  Disable (grey out) the next button — used on the last lesson.
   * @param disabledColor CSS colour string applied when a button is disabled (e.g. "#666E7D").
   */
  public setLessonNavState(show: boolean, prevDisabled: boolean, nextDisabled: boolean, disabledColor: string): void {
    this.lessonNavVisible = show;

    if (show && this.areControlsVisible) {
      this.quickSeekBackwardButton.show();
      this.quickSeekForwardButton.show();
    } else {
      this.quickSeekBackwardButton.hide();
      this.quickSeekForwardButton.hide();
    }

    // Apply/remove disabled class and colour variable on each button
    this.applyNavButtonDisabledState(this.quickSeekBackwardButton, prevDisabled, disabledColor);
    this.applyNavButtonDisabledState(this.quickSeekForwardButton, nextDisabled, disabledColor);

    this.lessonNavPrevDisabled = prevDisabled;
    this.lessonNavNextDisabled = nextDisabled;
  }

  private applyNavButtonDisabledState(button: QuickSeekButton, disabled: boolean, color: string): void {
    const el = button.getDomElement();
    const cls = this.prefixCss(this.LESSON_NAV_DISABLED_CLASS);
    if (disabled) {
      el.addClass(cls);
      el.css({ '--musora-nav-disabled-color': color });
    } else {
      el.removeClass(cls);
      el.css({ '--musora-nav-disabled-color': '' });
    }
  }
}
