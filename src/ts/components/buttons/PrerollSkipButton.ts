import { PlayerAPI } from 'bitmovin-player';
import { UIInstanceManager } from '../../UIManager';
import { Button, ButtonConfig, ButtonStyle } from './Button';

export const PREROLL_SKIP_MESSAGE = 'onPrerollSkip';

declare const window: {
  bitmovin?: {
    customMessageHandler?: {
      sendAsynchronous: (message: string, payload?: string) => void;
    };
  };
};

/** Always-available native-host skip action shown only during an inline preroll. */
export class PrerollSkipButton extends Button<ButtonConfig> {
  constructor() {
    super({
      cssClasses: ['musora-preroll-skip'],
      text: 'Skip',
      ariaLabel: 'Skip introduction',
      buttonStyle: ButtonStyle.TextWithTrailingIcon,
    });
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);
    this.onClick.subscribe(() => {
      window.bitmovin?.customMessageHandler?.sendAsynchronous(PREROLL_SKIP_MESSAGE);
    });
  }
}
