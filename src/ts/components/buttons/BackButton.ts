import { ButtonConfig, Button } from './Button';
import { UIInstanceManager } from '../../UIManager';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from '../../localization/i18n';

/**
 * Configuration interface for the {@link BackButton}.
 *
 * @category Configs
 */
export interface BackButtonConfig extends ButtonConfig {}

/**
 * Message sent to React Native when the back button is pressed.
 * Handle this in your CustomMessageHandler to navigate back (e.g. navigation.goBack()).
 */
export const BACK_BUTTON_MESSAGE = 'onBackPress';

/**
 * Message React Native can send to the UI to show or hide the back button.
 * Payload: `'true'` to show, `'false'` to hide.
 */
export const SET_BACK_BUTTON_VISIBLE_MESSAGE = 'setBackButtonVisible';

declare const window: {
  bitmovin?: {
    customMessageHandler?: {
      sendAsynchronous: (message: string, payload?: string) => void;
      on: (event: string, callback: (data?: string) => void) => void;
    };
  };
};

/**
 * A button that shows a back arrow in the top-left corner. On click it sends
 * {@link BACK_BUTTON_MESSAGE} via CustomMessageHandler so React Native can handle navigation.
 * The button is shown by default when CustomMessageHandler is available; hide it by sending
 * {@link SET_BACK_BUTTON_VISIBLE_MESSAGE} with payload `'false'` when needed.
 *
 * @category Buttons
 */
export class BackButton extends Button<BackButtonConfig> {
  constructor(config: BackButtonConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-backbutton',
        text: i18n.getLocalizer('back'),
      } as BackButtonConfig,
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    const customMessageHandler = window.bitmovin?.customMessageHandler;

    if (customMessageHandler) {
      // Shown by default; RN can send setBackButtonVisible('false') to hide when needed

      this.onClick.subscribe(() => {
        customMessageHandler.sendAsynchronous(BACK_BUTTON_MESSAGE);
      });

      customMessageHandler.on(SET_BACK_BUTTON_VISIBLE_MESSAGE, (data?: string) => {
        const visible = data !== 'false';
        if (visible) {
          this.show();
        } else {
          this.hide();
        }
      });
    } else {
      this.hide();
    }
  }
}
