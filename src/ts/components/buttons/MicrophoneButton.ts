import { Button, ButtonConfig } from './Button';
import { DOM } from '../../DOM';
import { UIInstanceManager } from '../../UIManager';
import { PlayerAPI } from 'bitmovin-player';

/**
 * Configuration interface for the {@link MicrophoneButton}.
 *
 * @category Configs
 */
export interface MicrophoneButtonConfig extends ButtonConfig {}

/**
 * Message sent to React Native when the microphone button is pressed.
 * The host checks mic permission, then opens Audio Settings when access is granted.
 */
export const MICROPHONE_BUTTON_MESSAGE = 'onMicrophonePress';

/**
 * Message React Native sends to drive the microphone button.
 * Payload JSON: `{ visible: boolean; enabled: boolean; recording: boolean }`.
 * - `visible` — feature is on for this user
 * - `enabled` — the Audio Settings recording toggle is on (off shows the slashed mic)
 * - `recording` — capture is running (red outline, capsule fills from the bottom)
 */
export const SET_MICROPHONE_STATE_MESSAGE = 'setMicrophoneState';

interface MicrophoneButtonState {
  visible?: boolean;
  enabled?: boolean;
  recording?: boolean;
}

declare const window: {
  bitmovin?: {
    customMessageHandler?: {
      sendAsynchronous: (message: string, payload?: string) => void;
      on: (event: string, callback: (data?: string) => void) => void;
    };
  };
};

/**
 * Title-bar microphone control, placed immediately left of AirPlay.
 * Visual state is owned by React Native. A tap only notifies the host.
 *
 * @category Buttons
 */
export class MicrophoneButton extends Button<MicrophoneButtonConfig> {
  constructor(config: MicrophoneButtonConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-microphonebutton',
        text: 'Microphone',
      } as MicrophoneButtonConfig,
      this.config,
    );
  }

  protected toDomElement(): DOM {
    const buttonElement = super.toDomElement();

    // mic-recording.svg already draws the capsule outline as a hollow ring,
    // so this overlay only fills its interior. The path is copied from that
    // same capsule so the fill clips exactly to the icon's own edges.
    const iconElement = buttonElement.find('.' + this.prefixCss('ui-icon'));
    const overlay = new DOM('div', { class: this.prefixCss('mic-capsule-overlay') });
    const capsuleInteriorPath =
      'M7.5 1.95593C6.51611 1.95593 5.68359 2.78845 5.68359 3.77233V8.61609C5.68359 9.63781 6.51611 10.4325 7.5 10.4325' +
      'C8.52173 10.4325 9.31641 9.63781 9.31641 8.61609V3.77233C9.31641 2.78845 8.52173 1.95593 7.5 1.95593Z';

    overlay.html(
      '<svg viewBox="0 0 15 20" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
        `<clipPath id="${this.prefixCss('mic-capsule-clip')}">` +
        `<path d="${capsuleInteriorPath}" />` +
        '</clipPath>' +
        '</defs>' +
        `<rect class="${this.prefixCss('mic-level')}" x="5.68359" y="1.95593" width="3.63282" height="8.47657" clip-path="url(#${this.prefixCss(
          'mic-capsule-clip',
        )})" />` +
        '</svg>',
    );
    iconElement.append(overlay);

    return buttonElement;
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    const customMessageHandler = window.bitmovin?.customMessageHandler;
    if (!customMessageHandler) {
      this.hide();
      return;
    }

    this.hide();

    this.onClick.subscribe(() => {
      customMessageHandler.sendAsynchronous(MICROPHONE_BUTTON_MESSAGE);
    });

    customMessageHandler.on(SET_MICROPHONE_STATE_MESSAGE, (data?: string) => {
      this.applyState(data);
    });
  }

  private applyState(data?: string): void {
    let state: MicrophoneButtonState = {};
    if (data) {
      try {
        state = JSON.parse(data) as MicrophoneButtonState;
      } catch {
        return;
      }
    }

    if (state.visible) {
      this.show();
    } else {
      this.hide();
    }

    const element = this.getDomElement();
    const recordingClass = this.prefixCss('mic-recording');
    const offClass = this.prefixCss('mic-off');

    if (state.recording) {
      element.addClass(recordingClass);
    } else {
      element.removeClass(recordingClass);
    }

    // Slashed mic is the recording toggle being off, not a permission state.
    if (state.enabled || state.recording) {
      element.removeClass(offClass);
    } else {
      element.addClass(offClass);
    }

    const label = state.recording ? 'Microphone, recording' : state.enabled ? 'Microphone' : 'Microphone off';
    element.attr('aria-label', label);
  }
}
