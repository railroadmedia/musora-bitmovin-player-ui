import { ToggleButton, ToggleButtonConfig } from './ToggleButton';
import { UIInstanceManager } from '../../UIManager';
import { PlayerAPI } from 'bitmovin-player';
import { i18n } from '../../localization/i18n';

/**
 * Message React Native can send to force the UI into or out of fullscreen visual state,
 * independent of the player's ViewMode API. Use this to re-sync the UI when the native
 * fullscreen state changes without going through player.setViewMode().
 * Payload: `'true'` for fullscreen, `'false'` for inline.
 */
export const SET_FULLSCREEN_STATE_MESSAGE = 'setFullscreenState';

declare const window: {
  bitmovin?: {
    customMessageHandler?: {
      sendAsynchronous: (message: string, payload?: string) => void;
      on: (event: string, callback: (data?: string) => void) => void;
    };
  };
};

/**
 * A button that toggles the player between windowed and fullscreen view.
 *
 * @category Buttons
 */
export class FullscreenToggleButton extends ToggleButton<ToggleButtonConfig> {
  constructor(config: ToggleButtonConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-fullscreentogglebutton',
        text: i18n.getLocalizer('fullscreen'),
      },
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    const isFullScreenAvailable = () => {
      return player.isViewModeAvailable(player.exports.ViewMode.Fullscreen);
    };

    const fullscreenStateHandler = () => {
      player.getViewMode() === player.exports.ViewMode.Fullscreen ? this.on() : this.off();
    };

    const fullscreenAvailabilityChangedHandler = () => {
      isFullScreenAvailable() ? this.show() : this.hide();
    };

    player.on(player.exports.PlayerEvent.ViewModeChanged, fullscreenStateHandler);

    // Available only in our native SDKs for now
    if ((player.exports.PlayerEvent as any).ViewModeAvailabilityChanged) {
      player.on((player.exports.PlayerEvent as any).ViewModeAvailabilityChanged, fullscreenAvailabilityChangedHandler);
    }

    uimanager.getConfig().events.onUpdated.subscribe(fullscreenAvailabilityChangedHandler);

    this.onClick.subscribe(() => {
      if (!isFullScreenAvailable()) {
        if (console) {
          console.log('Fullscreen unavailable');
        }
        return;
      }

      const targetViewMode =
        player.getViewMode() === player.exports.ViewMode.Fullscreen
          ? player.exports.ViewMode.Inline
          : player.exports.ViewMode.Fullscreen;

      player.setViewMode(targetViewMode);
    });

    // Allow React Native to force-sync the button state when the native fullscreen
    // state changes without going through player.setViewMode().
    window.bitmovin?.customMessageHandler?.on(SET_FULLSCREEN_STATE_MESSAGE, (data?: string) => {
      data === 'true' ? this.on() : this.off();
    });

    // Startup init
    fullscreenAvailabilityChangedHandler();
    fullscreenStateHandler();
  }
}
