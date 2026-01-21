import { ContainerConfig, Container } from './Container';
import { Component, ComponentConfig } from './Component';
import { DOM } from '../DOM';
import { UIInstanceManager } from '../UIManager';
import { HugeReplayButton } from './buttons/HugeReplayButton';
import { RecommendationConfig } from '../UIConfig';
import { PlayerAPI } from 'bitmovin-player';

/**
 * Overlays the player and displays recommended videos for Musora standard end screen.
 *
 * @category Containers
 */

declare const window: {
  bitmovin?: {
    customMessageHandler?: {
      on: (event: string, callback: (data?: string) => void) => void;
      sendSynchronous: (message: string, payload?: string) => string;
      sendAsynchronous: (message: string, payload?: string) => void;
    };
  };
};

export class MusoraStandardEndScreen extends Container<ContainerConfig> {
  private replayButton: HugeReplayButton;

  constructor(config: ContainerConfig = {}) {
    super(config);

    this.replayButton = new HugeReplayButton();

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-musora-standard-end-screen',
        hidden: true,
        components: [this.replayButton],
      },
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);
    const PlayerEvent = player.exports.PlayerEvent;

    const clearRecommendations = () => {
      for (const component of this.getComponents().slice()) {
        if (component instanceof MusoraStandardEndScreenItem) {
          this.removeComponent(component);
        }
      }
      this.updateComponents();
      this.getDomElement().removeClass(this.prefixCss('recommendations'));
    };

    const setupUpNextScreen = (data: UpNextData) => {
      clearRecommendations();

      // Always create exactly one tile regardless of recommendations
      this.addComponent(
        new MusoraUpNextEndScreenItem(
          {
            itemConfig: null, // Not using recommendations data
            cssClasses: ['musora-up-next-end-screen-item'],
            player: player,
            uimanager: uimanager,
            parentEndScreen: this,
          },
          data,
        ),
      );

      this.updateComponents(); // create container DOM elements
      this.getDomElement().addClass(this.prefixCss('recommendations'));
    };

    const setupMethodSessionScreen = (data: MethodSessionData) => {
      clearRecommendations();

      this.addComponent(
        new MusoraMethodSessionEndScreenItem(
          {
            itemConfig: null, // Not using recommendations data
            cssClasses: ['musora-method-session-end-screen-item'],
            player: player,
            uimanager: uimanager,
            parentEndScreen: this,
          },
          data,
        ),
      );

      this.updateComponents(); // create container DOM elements
      this.getDomElement().addClass(this.prefixCss('recommendations'));
    };

    const setupAwardEndScreen = (data: AwardData) => {
      clearRecommendations();

      this.addComponent(
        new MusoraAwardEndScreenItem(
          {
            itemConfig: null, // Not using recommendations data
            cssClasses: ['musora-award-end-screen-item'],
            player: player,
            uimanager: uimanager,
            parentEndScreen: this,
          },
          data,
        ),
      );

      this.updateComponents(); // create container DOM elements
      this.getDomElement().addClass(this.prefixCss('recommendations'));
    };

    // uimanager.getConfig().events.onUpdated.subscribe(setupRecommendations);
    // Remove recommendations and hide overlay when source is unloaded

    // player.on(PlayerEvent.SourceLoaded, () => {
    //   console.log('showing end screen');
    // setupUpNextScreen({
    //   title: 'Chorus & Outro',
    //   subtitle: 'Dreamfall',
    //   thumbnail:
    //     'https://i.vimeocdn.com/video/2024105170-4d38d750f3deeb57b3e03d5f5df160e40032bd4d5c1b30d2ade46ff1e14f2cd8-d?mw=1100&mh=620',
    //   delay: 5,
    // });
    // setupMethodSessionScreen({
    //   lessons: [
    //     {
    //       thumbnail: 'https://i.vimeocdn.com/video/2024105170-4d38d750f3deeb57b3e03d5f5df160e40032bd4d5c1b30d2ade46ff1e14f2cd8-d?mw=1100&mh=620',
    //       status: 'completed',
    //     },
    //     {
    //       thumbnail: 'https://i.vimeocdn.com/video/2024105170-4d38d750f3deeb57b3e03d5f5df160e40032bd4d5c1b30d2ade46ff1e14f2cd8-d?mw=1100&mh=620',
    //       status: 'next',
    //     },
    //     {
    //       thumbnail: 'https://i.vimeocdn.com/video/2024105170-4d38d750f3deeb57b3e03d5f5df160e40032bd4d5c1b30d2ade46ff1e14f2cd8-d?mw=1100&mh=620',
    //       status: 'locked',
    //     },
    //   ],
    //   sessionCompleted: true,
    //   completedText: 'Great job! Today’s Method session has been completed.',
    //   nextLessonDelay: 5,
    // });
    // setupAwardEndScreen({
    //   award: 'https://cdn.sanity.io/files/4032r8py/staging/9470587f03479b7c1f8019c3cbcbdfe12aa267f3.png',
    //   lessons: 52,
    //   minutes: 345,
    //   skills: 5,
    // });
    // this.show();
    // });

    if (window.bitmovin?.customMessageHandler) {
      window.bitmovin.customMessageHandler.on('showUpNextEndScreen', (data?: string) => {
        if (data) {
          setupUpNextScreen(JSON.parse(data));
          this.show();
        }
      });

      window.bitmovin.customMessageHandler.on('showMethodSessionEndScreen', (data?: string) => {
        if (data) {
          setupMethodSessionScreen(JSON.parse(data));
          this.show();
        }
      });

      window.bitmovin.customMessageHandler.on('showAwardEndScreen', (data?: string) => {
        if (data) {
          setupAwardEndScreen(JSON.parse(data));
          this.show();
        }
      });

      window.bitmovin.customMessageHandler.on('hideEndScreen', (data?: string) => {
        this.hide();
      });

      window.bitmovin.customMessageHandler.on('stopCountdown', () => {
        this.getComponents().forEach(component => {
          if (component instanceof MusoraStandardEndScreenItem) {
            component.stopTimer();
          }
        });
      });

      window.bitmovin.customMessageHandler.on('setTabletMode', (data?: string) => {
        const isTablet = data ? JSON.parse(data) : true;
        if (isTablet) {
          this.getDomElement().addClass(this.prefixCss('tablet'));
        } else {
          this.getDomElement().removeClass(this.prefixCss('tablet'));
        }
      });

      window.bitmovin.customMessageHandler.on('setLandscapeMode', (data?: string) => {
        const isLandscape = data ? JSON.parse(data) : true;
        if (isLandscape) {
          this.getDomElement().addClass(this.prefixCss('landscape'));
        } else {
          this.getDomElement().removeClass(this.prefixCss('landscape'));
        }
      });
    }
  }
}

/**
 * Configuration interface for the {@link MusoraStandardEndScreenItem}
 */
interface MusoraStandardEndScreenItemConfig extends ComponentConfig {
  itemConfig: RecommendationConfig | null;
  player?: PlayerAPI;
  uimanager?: UIInstanceManager;
  parentEndScreen?: MusoraStandardEndScreen;
}

/**
 * An item of the {@link MusoraStandardEndScreen}. Used only internally in {@link MusoraStandardEndScreen}.
 */
class MusoraStandardEndScreenItem extends Component<MusoraStandardEndScreenItemConfig> {
  // class MusoraStandardEndScreenItem extends Component<MusoraStandardEndScreenItemConfig> {

  countdownTimer: NodeJS.Timeout;
  countdownValue: number;

  constructor(config: MusoraStandardEndScreenItemConfig) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-musora-standard-end-screen-item',
        itemConfig: null, // this must be passed in from outside
      },
      this.config,
    );
  }

  setupTimer(duration: number): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    this.countdownValue = duration;
    this.countdownTimer = setInterval(() => {
      // Check if timer was cleared (stopCountdown was called)
      if (!this.countdownTimer) {
        return;
      }

      this.countdownValue--;

      const timerElement = document.querySelector(`.${this.prefixCss('timer')}`);
      if (timerElement) {
        timerElement.textContent = this.countdownValue.toString();
      }
      if (this.countdownValue <= 0) {
        if (this.countdownTimer && window.bitmovin.customMessageHandler) {
          window.bitmovin.customMessageHandler.sendAsynchronous('onEndScreenAutoAction');
        }
        if (this.countdownTimer) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
        }
      }
    }, 1000);
  }

  stopTimer(): void {
    // Clear the timer first to prevent race conditions
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    // Update the DOM immediately to reflect the stopped state
    const timerElement = document.querySelector(`.${this.prefixCss('timer')}`);
    if (timerElement) {
      timerElement.textContent = '0';
    }
    // Set countdown to 0 to indicate stopped state
    this.countdownValue = 0;
  }

  onClose(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    if (this.config.parentEndScreen) {
      this.config.parentEndScreen.hide();
    }
  }

  onBack(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    if (window.bitmovin?.customMessageHandler) {
      window.bitmovin.customMessageHandler.sendAsynchronous('onEndScreenBack');
    }
  }

  onCancel(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    if (window.bitmovin?.customMessageHandler) {
      window.bitmovin.customMessageHandler.sendAsynchronous('onEndScreenCancel');
    }
  }

  onReplay(): void {
    if (window.bitmovin?.customMessageHandler) {
      window.bitmovin.customMessageHandler.sendAsynchronous('onEndScreenReplay');
    }
  }

  onAction(): void {
    if (window.bitmovin?.customMessageHandler) {
      window.bitmovin.customMessageHandler.sendAsynchronous('onEndScreenAction');
    }
  }

  onCardPress(index: number): void {
    if (window.bitmovin?.customMessageHandler) {
      window.bitmovin.customMessageHandler.sendAsynchronous('onCardPress', JSON.stringify({ index }));
    }
  }
}

interface UpNextData {
  title: string;
  subtitle: string;
  thumbnail: string;
  delay: number;
}

class MusoraUpNextEndScreenItem extends MusoraStandardEndScreenItem {
  data: UpNextData;
  private upNextTextElement: DOM | null = null;
  private cancelButtonElement: DOM | null = null;
  private cancelButtonHandler: (() => void) | null = null;

  constructor(config: MusoraStandardEndScreenItemConfig, data: UpNextData) {
    super(config);
    this.data = data;
    this.setupTimer(data.delay);
  }

  protected toDomElement(): DOM {
    const itemElement = new DOM(
      'div',
      {
        id: this.config.id || '',
        class: this.getCssClasses(),
      },
      this,
    );

    // Row 1: "Up Next in 5" text and replay button
    const topRow = new DOM('div', {
      class: this.prefixCss('top-row'),
    });

    const backButton = new DOM('button', {
      class: this.prefixCss('back-button'),
    });

    backButton.on('click', this.onBack.bind(this));

    const upNextText = new DOM('div', {
      class: this.prefixCss('up-next-text'),
    }).html('Up Next in ');

    const timer = new DOM('span', {
      class: this.prefixCss('timer'),
    }).html(this.countdownValue.toString());

    upNextText.append(timer);
    this.upNextTextElement = upNextText;

    const closeButton = new DOM('button', {
      class: this.prefixCss('close-button'),
    });

    closeButton.on('click', this.onClose.bind(this));

    topRow.append(backButton);
    topRow.append(upNextText);
    topRow.append(closeButton);
    itemElement.append(topRow);

    // Row 2: Thumbnail and text content side by side
    const contentRow = new DOM('div', {
      class: this.prefixCss('content-row'),
    });

    // Thumbnail
    const thumbnail = new DOM('div', {
      class: this.prefixCss('thumbnail'),
    }).css({
      'background-image': `url(${this.data.thumbnail})`,
    });
    thumbnail.on('click', this.onCardPress.bind(this, 0));
    contentRow.append(thumbnail);

    // Text area with title, subtitle, and buttons
    const textArea = new DOM('div', {
      class: this.prefixCss('text-area'),
    });

    // Content text container
    const contentText = new DOM('div', {
      class: this.prefixCss('content-text'),
    });

    const title = new DOM('div', {
      class: this.prefixCss('title'),
    }).html(this.data.title);

    const subtitle = new DOM('div', {
      class: this.prefixCss('subtitle'),
    }).html(this.data.subtitle);

    contentText.append(title);
    contentText.append(subtitle);
    textArea.append(contentText);

    // Button row inside text area
    const buttonRow = new DOM('div', {
      class: this.prefixCss('button-row'),
    });

    const cancelButton = new DOM('button', {
      class: this.prefixCss('cancel-button'),
    }).html('Cancel');

    this.cancelButtonHandler = this.onCancel.bind(this);
    cancelButton.on('click', this.cancelButtonHandler!);
    this.cancelButtonElement = cancelButton;

    const playNowButton = new DOM('button', {
      class: this.prefixCss('play-now-button'),
    }).html('Play Now');

    playNowButton.on('click', this.onAction.bind(this));

    buttonRow.append(cancelButton);
    buttonRow.append(playNowButton);

    contentRow.append(textArea);
    itemElement.append(contentRow);
    itemElement.append(buttonRow);

    return itemElement;
  }

  onCancel(): void {
    super.onCancel();
    if (this.upNextTextElement) {
      this.upNextTextElement.html('Up Next');
    }
    if (this.cancelButtonElement && this.cancelButtonHandler) {
      this.cancelButtonElement.html('Replay');
      this.cancelButtonElement.off('click', this.cancelButtonHandler);
      this.cancelButtonElement.on('click', this.onReplay.bind(this));
    }
  }
}

interface MethodSessionData {
  lessons: {
    thumbnail: string;
    status: 'completed' | 'next' | 'upcoming' | 'locked';
  }[];
  sessionCompleted: boolean;
  completedText: string;
  nextLessonDelay: number;
}

class MusoraMethodSessionEndScreenItem extends MusoraStandardEndScreenItem {
  data: MethodSessionData;
  private nextLabelElement: DOM | null = null;
  private cancelButtonElement: DOM | null = null;
  private cancelButtonHandler: (() => void) | null = null;

  constructor(config: MusoraStandardEndScreenItemConfig, data: MethodSessionData) {
    super(config);
    this.data = data;
    if (!data.sessionCompleted) {
      this.setupTimer(data.nextLessonDelay);
    }
  }

  protected toDomElement(): DOM {
    const itemElement = new DOM(
      'div',
      {
        id: this.config.id || '',
        class: this.getCssClasses(),
      },
      this,
    );

    const topRow = new DOM('div', {
      class: this.prefixCss('top-row'),
    });

    const backButton = new DOM('button', {
      class: this.prefixCss('back-button'),
    });

    backButton.on('click', this.onBack.bind(this));

    const topTitle = new DOM('div', {
      class: this.prefixCss('top-title'),
    }).html(this.data.sessionCompleted ? 'Method Session Complete!' : "Here's What To Do Today");

    const closeButton = new DOM('button', {
      class: this.prefixCss('close-button'),
    });

    closeButton.on('click', this.onClose.bind(this));

    topRow.append(backButton);
    topRow.append(topTitle);
    topRow.append(closeButton);
    itemElement.append(topRow);

    // Center row with suggested lessons
    const contentRow = new DOM('div', {
      class: this.prefixCss('content-row'),
    });

    const thumbnailContainer = new DOM('div', {
      class: this.prefixCss('thumbnail-container'),
    });

    contentRow.append(thumbnailContainer);

    this.data.lessons.forEach((item, index) => {
      const contentItem = new DOM('div', {
        class: this.prefixCss('session-step'),
      });

      const thumbnail = new DOM('div', {
        class: this.prefixCss('thumbnail'),
      }).css({
        'background-image': 'url(' + item.thumbnail + ')',
      });

      thumbnail.on('click', this.onCardPress.bind(this, index));

      if (item.status === 'completed' || this.data.sessionCompleted) {
        const cover = new DOM('div', {
          class: this.prefixCss('completed'),
        });

        thumbnail.append(cover);
      } else if (item.status === 'locked') {
        const cover = new DOM('div', {
          class: this.prefixCss('locked'),
        });

        thumbnail.append(cover);
      }

      contentItem.append(thumbnail);

      if (!this.data.sessionCompleted) {
        if (item.status === 'completed') {
          const label = new DOM('div', {
            class: `${this.prefixCss(`label`)} ${this.prefixCss('completed')}`,
          }).html('Completed');

          contentItem.append(label);
        } else if (item.status === 'next') {
          const label = new DOM('div', {
            class: `${this.prefixCss(`label`)} ${this.prefixCss('time')}`,
          }).html('Starting in ');

          const time = new DOM('span', {
            class: this.prefixCss('timer'),
          }).html(this.countdownValue.toString());

          label.append(time);
          this.nextLabelElement = label;

          contentItem.append(label);
        } else if (item.status === 'upcoming') {
          const label = new DOM('div', {
            class: `${this.prefixCss(`label`)}`,
          }).html('Upcoming');

          contentItem.append(label);
        } else if (item.status === 'locked') {
          const label = new DOM('div', {
            class: `${this.prefixCss(`label`)} ${this.prefixCss('locked')}`,
          }).html('Locked');

          contentItem.append(label);
        }
      }

      thumbnailContainer.append(contentItem);
    });

    if (this.data.sessionCompleted) {
      const completeContainer = new DOM('div', {
        class: this.prefixCss('complete-container'),
      });

      const completeImage = new DOM('div', {
        class: this.prefixCss('complete-image'),
      }).html('');

      const completeText = new DOM('div', {
        class: this.prefixCss('complete-text'),
      }).html(this.data.completedText);

      completeContainer.append(completeImage);
      completeContainer.append(completeText);
      contentRow.append(completeContainer);
    }

    itemElement.append(contentRow);

    // Button row inside text area
    const buttonRow = new DOM('div', {
      class: this.prefixCss('button-row'),
    });

    const cancelButton = new DOM('button', {
      class: this.prefixCss('cancel-button'),
    }).html(this.data.sessionCompleted ? 'Back to Home' : 'Cancel');

    this.cancelButtonHandler = this.onCancel.bind(this);
    cancelButton.on('click', this.cancelButtonHandler!);
    this.cancelButtonElement = cancelButton;

    const playNowButton = new DOM('button', {
      class: this.prefixCss('play-now-button'),
    }).html(this.data.sessionCompleted ? 'Keep Going' : 'Play Now');

    playNowButton.on('click', this.onAction.bind(this));

    buttonRow.append(cancelButton);
    buttonRow.append(playNowButton);

    itemElement.append(buttonRow);

    return itemElement;
  }

  onCancel(): void {
    super.onCancel();
    if (this.nextLabelElement) {
      this.nextLabelElement.html('Up Next');
      this.nextLabelElement.removeClass(this.prefixCss('time'));
    }
    if (this.cancelButtonElement && this.cancelButtonHandler) {
      this.cancelButtonElement.html('Replay');
      this.cancelButtonElement.off('click', this.cancelButtonHandler);
      this.cancelButtonElement.on('click', this.onReplay.bind(this));
    }
  }
}

interface AwardData {
  award: string;
  lessons: number;
  minutes: number;
  skills: number;
}

class MusoraAwardEndScreenItem extends MusoraStandardEndScreenItem {
  data: AwardData;

  constructor(config: MusoraStandardEndScreenItemConfig, data: AwardData) {
    super(config);
    this.data = data;
  }

  protected toDomElement(): DOM {
    const itemElement = new DOM(
      'div',
      {
        id: this.config.id || '',
        class: this.getCssClasses(),
      },
      this,
    );

    // Top row with title and close button
    const topRow = new DOM('div', {
      class: this.prefixCss('top-row'),
    });

    const topTitle = new DOM('div', {
      class: this.prefixCss('top-title'),
    }).html('Great job! Learning Path Complete!');

    const closeButton = new DOM('button', {
      class: this.prefixCss('close-button'),
    });

    closeButton.on('click', this.onClose.bind(this));

    topRow.append(topTitle);
    topRow.append(closeButton);
    itemElement.append(topRow);

    // Center row with award & info
    const contentRow = new DOM('div', {
      class: this.prefixCss('content-row'),
    });

    const award = new DOM('div', {
      class: this.prefixCss('award'),
    }).css({
      'background-image': 'url(' + this.data.award + ')',
    });

    contentRow.append(award);

    const info = new DOM('div', {
      class: this.prefixCss('info'),
    });

    const lessons = new DOM('div', {
      class: this.prefixCss('lessons'),
    })
      .append(
        new DOM('span', {
          class: this.prefixCss('info-count'),
        }).html(`${this.data.lessons}`),
      )
      .append(
        new DOM('span', {
          class: this.prefixCss('info-label'),
        }).html(' Lessons Completed'),
      );

    const minutes = new DOM('div', {
      class: this.prefixCss('minutes'),
    })
      .append(
        new DOM('span', {
          class: this.prefixCss('info-count'),
        }).html(`${this.data.minutes}`),
      )
      .append(
        new DOM('span', {
          class: this.prefixCss('info-label'),
        }).html(' Minutes Practiced'),
      );

    const skills = new DOM('div', {
      class: this.prefixCss('skills'),
    })
      .append(
        new DOM('span', {
          class: this.prefixCss('info-count'),
        }).html(`${this.data.skills}`),
      )
      .append(
        new DOM('span', {
          class: this.prefixCss('info-label'),
        }).html(' Skills Learned'),
      );

    info.append(lessons);
    info.append(minutes);
    info.append(skills);

    contentRow.append(info);

    itemElement.append(contentRow);

    // Bottom row with buttons
    const buttonRow = new DOM('div', {
      class: this.prefixCss('button-row'),
    });

    const cancelButton = new DOM('button', {
      class: this.prefixCss('cancel-button'),
    }).html('Go TO METHOD');

    cancelButton.on('click', this.onCancel.bind(this));

    const playNowButton = new DOM('button', {
      class: this.prefixCss('action-button'),
    }).html('START NEXT PATH');

    playNowButton.on('click', this.onAction.bind(this));

    buttonRow.append(cancelButton);
    buttonRow.append(playNowButton);

    itemElement.append(buttonRow);

    return itemElement;
  }
}
