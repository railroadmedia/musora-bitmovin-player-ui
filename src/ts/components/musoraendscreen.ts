import {ContainerConfig, Container} from './container';
import {Component, ComponentConfig} from './component';
import {Button, ButtonConfig} from './button';
import {DOM} from '../dom';
import {UIInstanceManager} from '../uimanager';
import {StringUtils} from '../stringutils';
import {EventDispatcher, NoArgs} from '../eventdispatcher';
import { PlayerAPI } from 'bitmovin-player';

/**
 * Configuration interface for a next video in the Musora endscreen
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
  /**
   * Video category/level (e.g., "Beginner • Workout")
   */
  category?: string;
  /**
   * Instructor name
   */
  instructor?: string;
}

/**
 * Configuration interface for the {@link MusoraEndscreen}
 */
export interface MusoraEndscreenConfig extends ContainerConfig {
  /**
   * Configuration for the next video to be displayed
   */
  nextVideo?: NextVideoConfig;
  /**
   * Countdown duration in seconds before auto-play (default: 5)
   */
  countdownDuration?: number;
  /**
   * Whether to auto-play the next video when countdown reaches zero (default: true)
   */
  autoPlay?: boolean;
  /**
   * Text to display above the countdown (default: "Up next in")
   */
  countdownText?: string;
  /**
   * Text for the cancel button (default: "Cancel")
   */
  cancelText?: string;
  /**
   * Text for the play button (default: "PLAY NOW")
   */
  playText?: string;
}

export interface MusoraEndscreenAutoPlayEventArgs extends NoArgs {
  /**
   * The next video configuration that will be auto-played
   */
  nextVideo: NextVideoConfig;
}

export interface MusoraEndscreenCancelEventArgs extends NoArgs {
  /**
   * Event fired when user cancels the auto-play
   */
}

export interface MusoraEndscreenPlayEventArgs extends NoArgs {
  /**
   * The next video configuration to play immediately
   */
  nextVideo: NextVideoConfig;
}

/**
 * A custom Musora endscreen overlay that displays the next video with a countdown timer and CTA buttons.
 * Features a Figma-inspired design with countdown in top-left, video thumbnail and details in center,
 * and Cancel/Play Now buttons below.
 */
export class MusoraEndscreen extends Container<MusoraEndscreenConfig> {

  private countdownTimer: number | null = null;
  private currentCountdown: number = 0;
  private countdownLabel: MusoraCountdownLabel;
  private nextVideoCard: MusoraNextVideoCard | null = null;
  private cancelButton: Button;
  private playButton: Button;

  private musoraEndscreenEvents = {
    onAutoPlay: new EventDispatcher<MusoraEndscreen, MusoraEndscreenAutoPlayEventArgs>(),
    onCountdownUpdate: new EventDispatcher<MusoraEndscreen, {countdown: number}>(),
    onCancelled: new EventDispatcher<MusoraEndscreen, MusoraEndscreenCancelEventArgs>(),
    onPlayNow: new EventDispatcher<MusoraEndscreen, MusoraEndscreenPlayEventArgs>(),
  };

  constructor(config: MusoraEndscreenConfig = {}) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-musora-endscreen',
      hidden: true,
      countdownDuration: 5,
      autoPlay: true,
      countdownText: 'Up next in',
      cancelText: 'Cancel',
      playText: 'PLAY NOW',
      components: [],
    }, this.config);

    // Countdown label (top-left)
    this.countdownLabel = new MusoraCountdownLabel({
      countdownText: this.config.countdownText,
      countdown: this.config.countdownDuration,
    });

    // Cancel button
    this.cancelButton = new Button({
      cssClass: 'ui-musora-cancel-button',
      text: this.config.cancelText,
    });

    // Play button
    this.playButton = new Button({
      cssClass: 'ui-musora-play-button',
      text: this.config.playText,
    });

    this.addComponent(this.countdownLabel);
    this.addComponent(this.cancelButton);
    this.addComponent(this.playButton);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    let setupNextVideo = () => {
      // Remove existing next video card
      if (this.nextVideoCard) {
        this.removeComponent(this.nextVideoCard);
        this.nextVideoCard = null;
      }

      // Add new next video card if configured
      if (this.config.nextVideo) {
        this.nextVideoCard = new MusoraNextVideoCard({
          nextVideo: this.config.nextVideo,
        });
        this.addComponent(this.nextVideoCard);
        this.updateComponents();
      }
    };

    // Handle cancel button click
    this.cancelButton.onClick.subscribe(() => {
      this.stopCountdown();
      this.hide();
      this.onCancelledEvent();
    });

    // Handle play now button click
    this.playButton.onClick.subscribe(() => {
      if (this.config.nextVideo) {
        this.stopCountdown();
        // Don't hide the end screen automatically - let the play now handler decide
        this.onPlayNowEvent();
      }
    });

    // Handle clicks on next video card
    if (this.nextVideoCard) {
      this.nextVideoCard.getDomElement().on('click', () => {
        if (this.config.nextVideo && this.isShown()) {
          this.stopCountdown();
          this.hide();
          this.onPlayNowEvent();
        }
      });
    }

    // Handle clicks on endscreen background to show controls
    this.getDomElement().on('click', (event) => {
      // Only handle clicks on the background, not on interactive elements
      if (event.target === this.getDomElement().get(0)) {
        // Force show controls when background is clicked
        this.forceControlsVisible();
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
        // Aggressively ensure controls remain visible and functional
        this.forceControlsVisible();
      }
    });

    // Hide endscreen when playback starts (e.g., replay)
    player.on(player.exports.PlayerEvent.Play, () => {
      this.stopCountdown();
      this.hide();
      // Re-enable normal control auto-hide behavior when playing
      this.restoreNormalControlBehavior();
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
          // Don't hide the end screen automatically - let the auto-play handler decide
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
    
    if (this.nextVideoCard) {
      this.removeComponent(this.nextVideoCard);
    }
    
    this.nextVideoCard = new MusoraNextVideoCard({
      nextVideo: nextVideo,
    });
    this.addComponent(this.nextVideoCard);
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
      this.musoraEndscreenEvents.onAutoPlay.dispatch(this, {
        nextVideo: this.config.nextVideo,
      });
    }
  }

  protected onCountdownUpdateEvent(): void {
    this.musoraEndscreenEvents.onCountdownUpdate.dispatch(this, {
      countdown: this.currentCountdown,
    });
  }

  protected onCancelledEvent(): void {
    this.musoraEndscreenEvents.onCancelled.dispatch(this);
  }

  protected onPlayNowEvent(): void {
    if (this.config.nextVideo) {
      this.musoraEndscreenEvents.onPlayNow.dispatch(this, {
        nextVideo: this.config.nextVideo,
      });
    }
  }

  /**
   * Gets the event that is fired when auto-play should start
   */
  get onAutoPlay() {
    return this.musoraEndscreenEvents.onAutoPlay.getEvent();
  }

  /**
   * Gets the event that is fired when countdown updates
   */
  get onCountdownUpdate() {
    return this.musoraEndscreenEvents.onCountdownUpdate.getEvent();
  }

  /**
   * Gets the event that is fired when countdown is cancelled
   */
  get onCancelled() {
    return this.musoraEndscreenEvents.onCancelled.getEvent();
  }

  /**
   * Gets the event that is fired when play now is clicked
   */
  get onPlayNow() {
    return this.musoraEndscreenEvents.onPlayNow.getEvent();
  }

  /**
   * Force controls to be visible and stay visible
   */
  private forceControlsVisible(): void {
    setTimeout(() => {
      const uiContainer = this.getDomElement().closest('.bmpui-ui-uicontainer');
      if (uiContainer) {
        // Force controls to show and stay shown
        uiContainer.classList.add('bmpui-controls-shown');
        uiContainer.classList.remove('bmpui-controls-hidden');
        
        // Override any auto-hide timers
        const controlBar = uiContainer.querySelector('.bmpui-ui-controlbar');
        if (controlBar) {
          controlBar.classList.remove('bmpui-hidden');
        }
      }
    }, 50);
    
    // Keep forcing controls visible every second while end screen is shown
    const forceInterval = setInterval(() => {
      if (!this.isShown()) {
        clearInterval(forceInterval);
        return;
      }
      
      const uiContainer = this.getDomElement().closest('.bmpui-ui-uicontainer');
      if (uiContainer) {
        uiContainer.classList.add('bmpui-controls-shown');
        uiContainer.classList.remove('bmpui-controls-hidden');
      }
    }, 1000);
  }

  /**
   * Restore normal control auto-hide behavior
   */
  private restoreNormalControlBehavior(): void {
    const uiContainer = this.getDomElement().closest('.bmpui-ui-uicontainer');
    if (uiContainer) {
      // Remove forced visibility and let normal behavior resume
      uiContainer.classList.remove('bmpui-controls-shown');
    }
  }
}

/**
 * Configuration interface for the Musora countdown label
 */
interface MusoraCountdownLabelConfig extends ComponentConfig {
  countdownText: string;
  countdown: number;
}

/**
 * Internal component that displays the countdown text and timer in Musora style.
 */
class MusoraCountdownLabel extends Component<MusoraCountdownLabelConfig> {

  constructor(config: MusoraCountdownLabelConfig) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-musora-countdown-label',
      countdownText: 'Up next in',
      countdown: 5,
    }, this.config);
  }

  protected toDomElement(): DOM {
    let labelElement = new DOM(this.config.tag, {
      'id': this.config.id,
      'class': this.getCssClasses(),
    });

    let fullText = `${this.config.countdownText} ${this.config.countdown}`;
    labelElement.html(fullText);

    return labelElement;
  }

  /**
   * Updates the countdown display
   */
  setCountdown(countdown: number): void {
    this.config.countdown = countdown;
    if (this.hasDomElement()) {
      let fullText = `${this.config.countdownText} ${countdown}`;
      this.getDomElement().html(fullText);
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
 * Configuration interface for the Musora next video card
 */
interface MusoraNextVideoCardConfig extends ComponentConfig {
  nextVideo: NextVideoConfig;
}

/**
 * Internal component that displays the next video information in Musora card style.
 */
class MusoraNextVideoCard extends Component<MusoraNextVideoCardConfig> {

  constructor(config: MusoraNextVideoCardConfig) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-musora-next-video-card',
      nextVideo: null,
    }, this.config);
  }

  protected toDomElement(): DOM {
    let config = this.config.nextVideo;

    let cardElement = new DOM('div', {
      'id': this.config.id,
      'class': this.getCssClasses(),
    });

    // Thumbnail container with play overlay
    let thumbnailContainer = new DOM('div', {
      'class': this.prefixCss('thumbnail-container'),
    });

    if (config.thumbnail) {
      let thumbnailElement = new DOM('div', {
        'class': this.prefixCss('thumbnail'),
      }).css({ 'background-image': `url(${config.thumbnail})` });
      
      // Play overlay icon
      let playOverlay = new DOM('div', {
        'class': this.prefixCss('play-overlay'),
      });
      
      thumbnailElement.append(playOverlay);
      thumbnailContainer.append(thumbnailElement);
    }

    // Duration badge
    if (config.duration) {
      let durationFormatted = StringUtils.secondsToTime(config.duration);
      let badge = new DOM('div', {
        'class': this.prefixCss('duration-badge'),
      });
      
      let badgeText = new DOM('span', {
        'class': this.prefixCss('badge-text'),
      }).html(durationFormatted);
      
      badge.append(badgeText);
      thumbnailContainer.append(badge);
    }

    cardElement.append(thumbnailContainer);

    // Video info section
    let infoContainer = new DOM('div', {
      'class': this.prefixCss('info'),
    });

    let infoContent = new DOM('div', {
      'class': this.prefixCss('info-content'),
    });

    // Title
    let titleElement = new DOM('div', {
      'class': this.prefixCss('title'),
    }).html(config.title);
    infoContent.append(titleElement);

    // Category
    if (config.category) {
      let categoryElement = new DOM('div', {
        'class': this.prefixCss('category'),
      }).html(config.category);
      infoContent.append(categoryElement);
    }

    // Instructor
    if (config.instructor) {
      let instructorElement = new DOM('div', {
        'class': this.prefixCss('instructor'),
      }).html(config.instructor);
      infoContent.append(instructorElement);
    }

    infoContainer.append(infoContent);
    cardElement.append(infoContainer);

    return cardElement;
  }

  /**
   * Updates the next video configuration
   */
  setNextVideo(nextVideo: NextVideoConfig): void {
    this.config.nextVideo = nextVideo;
  }

  /**
   * Gets the next video configuration
   */
  getNextVideo(): NextVideoConfig {
    return this.config.nextVideo;
  }
}