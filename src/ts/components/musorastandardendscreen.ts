import {ContainerConfig, Container} from './container';
import {Component, ComponentConfig} from './component';
import {DOM} from '../dom';
import {UIInstanceManager} from '../uimanager';
import {StringUtils} from '../stringutils';
import {HugeReplayButton} from './hugereplaybutton';
import { UIRecommendationConfig } from '../uiconfig';
import { PlayerAPI } from 'bitmovin-player';

/**
 * Overlays the player and displays recommended videos for Musora standard end screen.
 *
 * @category Containers
 */
export class MusoraStandardEndScreen extends Container<ContainerConfig> {

  private replayButton: HugeReplayButton;

  constructor(config: ContainerConfig = {}) {
    super(config);

    this.replayButton = new HugeReplayButton();

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-musora-standard-end-screen',
      hidden: true,
      components: [this.replayButton],
    }, this.config);
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    let clearRecommendations = () => {
      for (let component of this.getComponents().slice()) {
        if (component instanceof MusoraStandardEndScreenItem) {
          this.removeComponent(component);
        }
      }
      this.updateComponents();
      this.getDomElement().removeClass(this.prefixCss('recommendations'));
    };

    let setupRecommendations = () => {
      clearRecommendations();

      // Always create exactly one tile regardless of recommendations
      this.addComponent(new MusoraStandardEndScreenItem({
        itemConfig: null, // Not using recommendations data
        cssClasses: ['musora-end-screen-item-1'],
        player: player,
        uimanager: uimanager,
        parentEndScreen: this,
      }));
      
      this.updateComponents(); // create container DOM elements
      this.getDomElement().addClass(this.prefixCss('recommendations'));
    };

    uimanager.getConfig().events.onUpdated.subscribe(setupRecommendations);
    // Remove recommendations and hide overlay when source is unloaded
    player.on(player.exports.PlayerEvent.SourceUnloaded, () => {
      clearRecommendations();
      this.hide();
    });
    // Display recommendations when playback has finished
    player.on(player.exports.PlayerEvent.PlaybackFinished, () => {
      this.show();
    });
    // Hide recommendations when playback starts, e.g. a restart
    player.on(player.exports.PlayerEvent.Play, () => {
      this.hide();
    });

    // Hide end screen when user seeks (uses seek bar)
    player.on(player.exports.PlayerEvent.Seek, () => {
      this.hide();
    });

    // Init on startup
    setupRecommendations();
  }
}

/**
 * Configuration interface for the {@link MusoraStandardEndScreenItem}
 */
interface MusoraStandardEndScreenItemConfig extends ComponentConfig {
  itemConfig: UIRecommendationConfig;
  player?: PlayerAPI;
  uimanager?: UIInstanceManager;
  parentEndScreen?: MusoraStandardEndScreen;
}

/**
 * An item of the {@link MusoraStandardEndScreen}. Used only internally in {@link MusoraStandardEndScreen}.
 */
class MusoraStandardEndScreenItem extends Component<MusoraStandardEndScreenItemConfig> {

  constructor(config: MusoraStandardEndScreenItemConfig) {
    super(config);

    this.config = this.mergeConfig(config, {
      cssClass: 'ui-musora-standard-end-screen-item',
      itemConfig: null, // this must be passed in from outside
    }, this.config);
  }

  protected toDomElement(): DOM {
    let itemElement = new DOM('div', {
      'id': this.config.id,
      'class': this.getCssClasses(),
    }, this);

    // Row 1: "Up Next in 5" text and replay button
    let topRow = new DOM('div', {
      'class': this.prefixCss('top-row'),
    });
    
    let upNextText = new DOM('div', {
      'class': this.prefixCss('up-next-text'),
    }).html('Up Next in 5');
    
    // Simple replay button element
    let replayButton = new DOM('button', {
      'class': this.prefixCss('ui-musora-replay-button'),
    }).html('⟲');
    
    // Add click event to restart video and hide end screen
    replayButton.on('click', () => {
      if (this.config.player) {
        this.config.player.seek(0);
        this.config.player.play();
      }
      if (this.config.parentEndScreen) {
        this.config.parentEndScreen.hide();
      }
    });
    
    topRow.append(upNextText);
    topRow.append(replayButton);
    itemElement.append(topRow);

    // Row 2: Thumbnail and text content side by side
    let contentRow = new DOM('div', {
      'class': this.prefixCss('content-row'),
    });

    // Thumbnail
    let thumbnail = new DOM('div', {
      'class': this.prefixCss('thumbnail'),
    }).css({
      'background-image': 'url(https://i.vimeocdn.com/video/2024105170-4d38d750f3deeb57b3e03d5f5df160e40032bd4d5c1b30d2ade46ff1e14f2cd8-d?mw=1100&mh=620)'
    });
    contentRow.append(thumbnail);

    // Text area with title, subtitle, and buttons
    let textArea = new DOM('div', {
      'class': this.prefixCss('text-area'),
    });
    
    // Content text container
    let contentText = new DOM('div', {
      'class': this.prefixCss('content-text'),
    });
    
    let title = new DOM('div', {
      'class': this.prefixCss('title'),
    }).html('Sample Video Title');
    
    let subtitle = new DOM('div', {
      'class': this.prefixCss('subtitle'),
    }).html('This is a sample subtitle description for the upcoming video');
    
    contentText.append(title);
    contentText.append(subtitle);
    textArea.append(contentText);

    // Button row inside text area
    let buttonRow = new DOM('div', {
      'class': this.prefixCss('button-row'),
    });

    let cancelButton = new DOM('button', {
      'class': this.prefixCss('cancel-button'),
    }).html('Cancel');

    let playNowButton = new DOM('button', {
      'class': this.prefixCss('play-now-button'),
    }).html('Play Now');

    buttonRow.append(cancelButton);
    buttonRow.append(playNowButton);
    textArea.append(buttonRow);
    
    contentRow.append(textArea);
    itemElement.append(contentRow);

    return itemElement;
  }
}