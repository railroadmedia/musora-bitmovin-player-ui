import {ContainerConfig, Container} from './container';
import {Component, ComponentConfig} from './component';
import {DOM} from '../dom';
import {UIInstanceManager} from '../uimanager';
import {StringUtils} from '../stringutils';
import {EventDispatcher, NoArgs} from '../eventdispatcher';
import { PlayerAPI } from 'bitmovin-player';

/**
 * Configuration interface for a next video in the countdown endscreen
 */
export interface NextVideoConfig {
  /**
   * Title of the next video
   */
  title: string;
  /**
   * URL to navigate to when the video is selected or auto-plays
   */
  url: string;
  /**
   * Thumbnail image URL for the next video
   */
  thumbnail?: string;
  /**
   * Duration of the next video in seconds (optional, for display purposes)
   */
  duration?: number;
}

/**
 * Configuration interface for the {@link CountdownEndscreen}
 */
export interface CountdownEndscreenConfig extends ContainerConfig {
  /**
   * Configuration for the next video to be displayed
   */
  nextVideo?: NextVideoConfig;
  /**
   * Countdown duration in seconds before auto-play (default: 10)
   */
  countdownDuration?: number;
  /**
   * Whether to auto-play the next video when countdown reaches zero (default: true)
   */
  autoPlay?: boolean;
  /**
   * Text to display above the countdown (default: "Next video in")
   */
  countdownText?: string;
}

export interface CountdownEndscreenAutoPlayEventArgs extends NoArgs {
  /**
   * The next video configuration that will be auto-played
   */
  nextVideo: NextVideoConfig;
}

/**
 * An endscreen overlay that displays the next video with a countdown timer for auto-play functionality.
 * Shows after video playback finishes, displaying the next video's title, thumbnail, and a countdown timer.
 * When the countdown reaches zero, fires an auto-play event that can be handled to navigate to the next video.
 */
export class CountdownEndscreen extends Container<CountdownEndscreenConfig> {

  private countdownTimer: number | null = null;
  private currentCountdown: number = 0;
  private countdownLabel: CountdownLabel;
  private nextVideoItem: NextVideoItem | null = null;

  private countdownEndscreenEvents = {
    onAutoPlay: new EventDispatcher<CountdownEndscreen, CountdownEndscreenAutoPlayEventArgs>(),
    onCountdownUpdate: new EventDispatcher<CountdownEndscreen, {countdown: number}>(),
    onCancelled: new EventDispatcher<CountdownEndscreen, NoArgs>(),
  };

  constructor(config: CountdownEndscreenConfig = {}) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-countdown-endscreen',
      hidden: true,
      countdownDuration: 10,
      autoPlay: true,
      countdownText: 'Next video in',
      components: [],
    }, this.config);

    this.countdownLabel = new CountdownLabel({
      countdownText: this.config.countdownText,
      countdown: this.config.countdownDuration,
    });

    this.addComponent(this.countdownLabel);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    let setupNextVideo = () => {
      // Remove existing next video item
      if (this.nextVideoItem) {
        this.removeComponent(this.nextVideoItem);
        this.nextVideoItem = null;
      }

      // Add new next video item if configured
      if (this.config.nextVideo) {
        this.nextVideoItem = new NextVideoItem({
          nextVideo: this.config.nextVideo,
        });
        this.addComponent(this.nextVideoItem);
        this.updateComponents();
      }
    };

    // Handle clicks on next video item or countdown area
    this.getDomElement().on('click', (event) => {
      if (this.config.nextVideo && this.isShown()) {
        this.stopCountdown();
        this.onAutoPlayEvent();
      }
    });

    // Handle UI config updates
    uimanager.getConfig().events.onUpdated.subscribe(() => {
      setupNextVideo();
    });

    // Hide endscreen and stop countdown when source is unloaded
    player.on(player.exports.PlayerEvent.SourceUnloaded, () => {
      this.stopCountdown();
      this.hide();
    });

    // Show endscreen when playback finishes
    player.on(player.exports.PlayerEvent.PlaybackFinished, () => {
      if (this.config.nextVideo) {
        this.show();
        this.startCountdown();
      }
    });

    // Hide endscreen when playback starts (e.g., replay)
    player.on(player.exports.PlayerEvent.Play, () => {
      this.stopCountdown();
      this.hide();
    });

    // Setup initial next video
    setupNextVideo();
  }

  /**
   * Starts the countdown timer
   */
  private startCountdown(): void {
    this.currentCountdown = this.config.countdownDuration;
    this.updateCountdownDisplay();

    this.countdownTimer = window.setInterval(() => {
      this.currentCountdown--;
      this.updateCountdownDisplay();
      this.onCountdownUpdateEvent();

      if (this.currentCountdown <= 0) {
        this.stopCountdown();
        if (this.config.autoPlay && this.config.nextVideo) {
          this.onAutoPlayEvent();
        }
      }
    }, 1000);
  }

  /**
   * Stops the countdown timer
   */
  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
      this.onCancelledEvent();
    }
  }

  /**
   * Updates the countdown display
   */
  private updateCountdownDisplay(): void {
    this.countdownLabel.setCountdown(this.currentCountdown);
  }

  /**
   * Sets the next video configuration
   */
  setNextVideo(nextVideo: NextVideoConfig): void {
    this.config.nextVideo = nextVideo;
    
    if (this.nextVideoItem) {
      this.removeComponent(this.nextVideoItem);
    }
    
    this.nextVideoItem = new NextVideoItem({
      nextVideo: nextVideo,
    });
    this.addComponent(this.nextVideoItem);
    this.updateComponents();
  }

  /**
   * Gets the current countdown value
   */
  getCurrentCountdown(): number {
    return this.currentCountdown;
  }

  /**
   * Checks if countdown is currently running
   */
  isCountdownActive(): boolean {
    return this.countdownTimer !== null;
  }

  release(): void {
    this.stopCountdown();
    super.release();
  }

  protected onAutoPlayEvent(): void {
    if (this.config.nextVideo) {
      this.countdownEndscreenEvents.onAutoPlay.dispatch(this, {
        nextVideo: this.config.nextVideo,
      });
    }
  }

  protected onCountdownUpdateEvent(): void {
    this.countdownEndscreenEvents.onCountdownUpdate.dispatch(this, {
      countdown: this.currentCountdown,
    });
  }

  protected onCancelledEvent(): void {
    this.countdownEndscreenEvents.onCancelled.dispatch(this);
  }

  /**
   * Gets the event that is fired when auto-play should start
   */
  get onAutoPlay() {
    return this.countdownEndscreenEvents.onAutoPlay.getEvent();
  }

  /**
   * Gets the event that is fired when countdown updates
   */
  get onCountdownUpdate() {
    return this.countdownEndscreenEvents.onCountdownUpdate.getEvent();
  }

  /**
   * Gets the event that is fired when countdown is cancelled
   */
  get onCancelled() {
    return this.countdownEndscreenEvents.onCancelled.getEvent();
  }
}

/**
 * Configuration interface for the countdown label
 */
interface CountdownLabelConfig extends ComponentConfig {
  countdownText: string;
  countdown: number;
}

/**
 * Internal component that displays the countdown text and timer.
 */
class CountdownLabel extends Component<CountdownLabelConfig> {

  constructor(config: CountdownLabelConfig) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-countdown-label',
      countdownText: 'Next video in',
      countdown: 10,
    }, this.config);
  }

  protected toDomElement(): DOM {
    let labelElement = new DOM(this.config.tag, {
      'id': this.config.id,
      'class': this.getCssClasses(),
    });

    let textElement = new DOM('span', {
      'class': this.prefixCss('countdown-text'),
    }).html(this.config.countdownText);

    let timerElement = new DOM('span', {
      'class': this.prefixCss('countdown-timer'),
    }).html(String(this.config.countdown));

    labelElement.append(textElement);
    labelElement.append(new DOM('span', {}).html(' '));
    labelElement.append(timerElement);

    return labelElement;
  }

  /**
   * Updates the countdown display
   */
  setCountdown(countdown: number): void {
    this.config.countdown = countdown;
    if (this.hasDomElement()) {
      this.getDomElement().find('.' + this.prefixCss('countdown-timer')).html(String(countdown));
    }
  }

  /**
   * Gets the current countdown value
   */
  getCountdown(): number {
    return this.config.countdown;
  }
}

/**
 * Configuration interface for the next video item
 */
interface NextVideoItemConfig extends ComponentConfig {
  nextVideo: NextVideoConfig;
}

/**
 * Internal component that displays the next video information.
 */
class NextVideoItem extends Component<NextVideoItemConfig> {

  constructor(config: NextVideoItemConfig) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-next-video-item',
      nextVideo: null,
    }, this.config);
  }

  protected toDomElement(): DOM {
    let config = this.config.nextVideo;

    let itemElement = new DOM('div', {
      'id': this.config.id,
      'class': this.getCssClasses(),
    });

    // Thumbnail container
    if (config.thumbnail) {
      let thumbnailElement = new DOM('div', {
        'class': this.prefixCss('thumbnail'),
      }).css({ 'background-image': `url(${config.thumbnail})` });
      itemElement.append(thumbnailElement);
    }

    // Content container
    let contentElement = new DOM('div', {
      'class': this.prefixCss('content'),
    });

    // Title
    let titleElement = new DOM('div', {
      'class': this.prefixCss('title'),
    }).html(config.title);
    contentElement.append(titleElement);

    // Duration (if provided)
    if (config.duration) {
      let durationElement = new DOM('div', {
        'class': this.prefixCss('duration'),
      }).html(StringUtils.secondsToTime(config.duration));
      contentElement.append(durationElement);
    }

    itemElement.append(contentElement);

    return itemElement;
  }

  /**
   * Updates the next video configuration
   */
  setNextVideo(nextVideo: NextVideoConfig): void {
    this.config.nextVideo = nextVideo;
    // Note: Component re-rendering would need to be handled by recreating the component
    // or updating specific DOM elements manually
  }

  /**
   * Gets the next video configuration
   */
  getNextVideo(): NextVideoConfig {
    return this.config.nextVideo;
  }
}