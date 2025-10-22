import { ContainerConfig, Container } from './container';
import { Component, ComponentConfig } from './component';
import { DOM } from '../dom';
import { UIInstanceManager } from '../uimanager';
import { StringUtils } from '../stringutils';
import { HugeReplayButton } from './hugereplaybutton';
import { UIRecommendationConfig } from '../uiconfig';
import { PlayerAPI } from 'bitmovin-player';

/**
 * Overlays the player and displays recommended videos for Musora standard end screen.
 *
 * @category Containers
 */


declare const window: {
  bitmovin: {
    customMessageHandler: {
      on: (event: string, callback: (data?: string) => void) => void;
    }
  }
}

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
    const PlayerEvent = player.exports.PlayerEvent;

    let clearRecommendations = () => {
      for (let component of this.getComponents().slice()) {
        if (component instanceof MusoraStandardEndScreenItem) {
          this.removeComponent(component);
        }
      }
      this.updateComponents();
      this.getDomElement().removeClass(this.prefixCss('recommendations'));
    };

    let setupUpNextScreen = () => {
      clearRecommendations();

      // Always create exactly one tile regardless of recommendations
      this.addComponent(new MusoraUpNextEndScreenItem({
        itemConfig: null, // Not using recommendations data
        cssClasses: ['musora-up-next-end-screen-item'],
        player: player,
        uimanager: uimanager,
        parentEndScreen: this,
      }));

      this.updateComponents(); // create container DOM elements
      this.getDomElement().addClass(this.prefixCss('recommendations'));
    };

    let setupMethodSessionScreen = () => {
      clearRecommendations();

      this.addComponent(new MusoraMethodSessionEndScreenItem({
        itemConfig: null, // Not using recommendations data
        cssClasses: ['musora-method-session-end-screen-item'],
        player: player,
        uimanager: uimanager,
        parentEndScreen: this,
      }));

      this.updateComponents(); // create container DOM elements
      this.getDomElement().addClass(this.prefixCss('recommendations'));
    };

    // uimanager.getConfig().events.onUpdated.subscribe(setupRecommendations);
    // Remove recommendations and hide overlay when source is unloaded

    player.on(PlayerEvent.SourceLoaded, () => {
      // setupUpNextScreen();
      setupMethodSessionScreen();
      this.show();
    });

    if (window.bitmovin.customMessageHandler) {
      window.bitmovin.customMessageHandler.on('showUpNextEndScreen', (data?: string) => {
        setupUpNextScreen();
        this.show();
      });

      window.bitmovin.customMessageHandler.on('showMethodSessionEndScreen', (data?: string) => {
        setupMethodSessionScreen();
        this.show();
      });

      window.bitmovin.customMessageHandler.on('hideEndScreen', (data?: string) => {
        this.hide();
      });
    }
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
}

class MusoraUpNextEndScreenItem extends MusoraStandardEndScreenItem {
  constructor(config: MusoraStandardEndScreenItemConfig) {
    super(config);
  }

  onClose(): void {
    if (this.config.parentEndScreen) {
      this.config.parentEndScreen.hide();
    }
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
    }).html('Up Next in ');

    let timer = new DOM('span', {
      'class': this.prefixCss('timer'),
    }).html('5');

    upNextText.append(timer);

    let closeButton = new DOM('button', {
      'class': this.prefixCss('close-button'),
    }).html('×');

    closeButton.on('click', this.onClose.bind(this));

    topRow.append(upNextText);
    topRow.append(closeButton);
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
    }).html('Chorus & Outro');

    let subtitle = new DOM('div', {
      'class': this.prefixCss('subtitle'),
    }).html('Dreamfall');

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

    contentRow.append(textArea);
    itemElement.append(contentRow);
    itemElement.append(buttonRow);

    return itemElement;
  }
}

class MusoraMethodSessionEndScreenItem extends MusoraStandardEndScreenItem {
  constructor(config: MusoraStandardEndScreenItemConfig) {
    super(config);
  }

  onClose(): void {
    if (this.config.parentEndScreen) {
      this.config.parentEndScreen.hide();
    }
  }

  protected toDomElement(): DOM {
    let itemElement = new DOM('div', {
      'id': this.config.id,
      'class': this.getCssClasses(),
    }, this);

    let topRow = new DOM('div', {
      'class': this.prefixCss('top-row'),
    });

    let topTitle = new DOM('div', {
      'class': this.prefixCss('top-title'),
    }).html("Here's what to do today!");

    let closeButton = new DOM('button', {
      'class': this.prefixCss('close-button'),
    }).html('');

    closeButton.on('click', this.onClose.bind(this));

    topRow.append(topTitle);
    topRow.append(closeButton);
    itemElement.append(topRow);

    // Center row with suggested lessons
    let contentRow = new DOM('div', {
      'class': this.prefixCss('content-row'),
    });

    [
      {
        thumbnail: 'https://i.vimeocdn.com/video/2024105170-4d38d750f3deeb57b3e03d5f5df160e40032bd4d5c1b30d2ade46ff1e14f2cd8-d?mw=1100&mh=620',
        status: 'complete'
      }, {
        thumbnail: 'https://i.vimeocdn.com/video/2024105170-4d38d750f3deeb57b3e03d5f5df160e40032bd4d5c1b30d2ade46ff1e14f2cd8-d?mw=1100&mh=620',
        status: 'next'
      }, {
        thumbnail: 'https://i.vimeocdn.com/video/2024105170-4d38d750f3deeb57b3e03d5f5df160e40032bd4d5c1b30d2ade46ff1e14f2cd8-d?mw=1100&mh=620',
        status: 'upcoming'
      }
    ]
      .forEach(item => {
        let contentItem = new DOM('div', {
          'class': this.prefixCss('session-step'),
        });


        let thumbnail = new DOM('div', {
          'class': this.prefixCss('thumbnail'),
        }).css({
          'background-image': 'url(' + item.thumbnail + ')'
        });

        if (item.status === 'complete') {

          let cover = new DOM('div', {
            'class': this.prefixCss('completed'),
          });

          thumbnail.append(cover);
        }

        contentItem.append(thumbnail);

        if (item.status === 'complete') {

          let label = new DOM('div', {
            'class': `${this.prefixCss(`label`)} ${this.prefixCss('completed')}`,
          }).html('Completed');

          contentItem.append(label);

        } else if (item.status === 'next') {
          let label = new DOM('div', {
            'class': `${this.prefixCss(`label`)} ${this.prefixCss('timer')}`,
          }).html('Starting in ');

          let time = new DOM('span', {
            'class': this.prefixCss('time'),
          }).html('5');

          label.append(time);

          contentItem.append(label);
        } else if (item.status === 'upcoming') {
          let label = new DOM('div', {
            'class': `${this.prefixCss(`label`)}`,
          }).html('Upcoming');

          contentItem.append(label);
        }

        contentRow.append(contentItem);
      });

    itemElement.append(contentRow);

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

    itemElement.append(buttonRow);

    return itemElement;
  }
}
