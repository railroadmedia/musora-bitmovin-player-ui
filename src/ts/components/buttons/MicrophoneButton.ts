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
 * - `recording` — capture is running (brand-coloured icon, capsule fills with the input level)
 */
export const SET_MICROPHONE_STATE_MESSAGE = 'setMicrophoneState';

/**
 * Message React Native sends with the live mic input level while recording.
 * Payload: a number from 0 to 1, as a string. Until the first one arrives the capsule pulses.
 */
export const SET_MICROPHONE_LEVEL_MESSAGE = 'setMicrophoneLevel';

// Levels arrive about every 80ms; after this long without one the fill falls back to empty.
const LEVEL_STALE_MS = 250;

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
  requestAnimationFrame: (callback: () => void) => number;
  cancelAnimationFrame: (handle: number) => void;
};

/**
 * Title-bar microphone control, placed immediately left of AirPlay.
 * Visual state is owned by React Native. A tap only notifies the host.
 *
 * @category Buttons
 */
export class MicrophoneButton extends Button<MicrophoneButtonConfig> {
  private isRecording = false;
  private hasLevel = false;
  private targetLevel = 0;
  private displayedLevel = 0;
  private lastLevelAt = 0;
  private levelFrame: number | null = null;

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

    // While recording, this overlay draws the whole icon (the mic-recording.svg outline plus a
    // capsule fill clipped to its interior), so both can take the brand colour from CSS.
    const iconElement = buttonElement.find('.' + this.prefixCss('ui-icon'));
    const overlay = new DOM('div', { class: this.prefixCss('mic-capsule-overlay') });
    const capsuleInteriorPath =
      'M7.5 1.95593C6.51611 1.95593 5.68359 2.78845 5.68359 3.77233V8.61609C5.68359 9.63781 6.51611 10.4325 7.5 10.4325' +
      'C8.52173 10.4325 9.31641 9.63781 9.31641 8.61609V3.77233C9.31641 2.78845 8.52173 1.95593 7.5 1.95593Z';
    const micOutlinePath =
      capsuleInteriorPath +
      'M3.86719 3.77233C3.86719 1.76672 5.49438 0.13952 7.5 0.13952' +
      'C9.50562 0.13952 11.1328 1.76672 11.1328 3.77233V8.61609C11.1328 10.6217 9.50562 12.2489 7.5 12.2489' +
      'C5.49438 12.2489 3.86719 10.6217 3.86719 8.61609V3.77233ZM2.05078 7.10241V8.61609' +
      'C2.05078 11.6434 4.5105 14.0653 7.5 14.0653C10.5273 14.0653 12.9492 11.6434 12.9492 8.61609V7.10241' +
      'C12.9492 6.61047 13.3655 6.19421 13.8574 6.19421C14.3494 6.19421 14.7656 6.61047 14.7656 7.10241' +
      'V8.61609C14.7656 12.3246 12.0032 15.3898 8.4082 15.8439V17.6981H10.2246' +
      'C10.7166 17.6981 11.1328 18.1144 11.1328 18.6063C11.1328 19.0983 10.7166 19.5145 10.2246 19.5145' +
      'H4.77539C4.28345 19.5145 3.86719 19.0983 3.86719 18.6063' +
      'C3.86719 18.1144 4.28345 17.6981 4.77539 17.6981H6.5918V15.8439' +
      'C2.99682 15.3898 0.234372 12.3246 0.234372 8.61609V7.10241' +
      'C0.234372 6.61047 0.650632 6.19421 1.14258 6.19421C1.63452 6.19421 2.05078 6.61047 2.05078 7.10241Z';

    overlay.html(
      '<svg viewBox="0 0 15 20" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
        `<clipPath id="${this.prefixCss('mic-capsule-clip')}">` +
        `<path d="${capsuleInteriorPath}" />` +
        '</clipPath>' +
        '</defs>' +
        `<path class="${this.prefixCss('mic-outline')}" d="${micOutlinePath}" />` +
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

    customMessageHandler.on(SET_MICROPHONE_LEVEL_MESSAGE, (data?: string) => {
      this.applyLevel(data);
    });
  }

  release(): void {
    this.stopLevelAnimation();
    super.release();
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

    this.isRecording = !!state.recording;
    if (this.isRecording) {
      element.addClass(recordingClass);
    } else {
      element.removeClass(recordingClass);
      this.stopLevelAnimation();
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

  private applyLevel(data?: string): void {
    const level = Number(data);
    if (!this.isRecording || data === undefined || !isFinite(level)) {
      return;
    }

    if (!this.hasLevel) {
      this.hasLevel = true;
      this.getDomElement().addClass(this.prefixCss('mic-level-live'));
    }
    this.targetLevel = Math.min(1, Math.max(0, level));
    this.lastLevelAt = Date.now();
    if (this.levelFrame === null && (this.targetLevel > 0 || this.displayedLevel > 0)) {
      this.levelFrame = window.requestAnimationFrame(this.renderLevel);
    }
  }

  // Rises quickly and falls slowly, like a VU meter, so it doesn't flicker (same as web).
  // Idles once the fill has emptied; the next non-zero level restarts it.
  private renderLevel = (): void => {
    if (Date.now() - this.lastLevelAt > LEVEL_STALE_MS) {
      this.targetLevel = 0;
    }
    const easing = this.targetLevel > this.displayedLevel ? 0.5 : 0.1;
    this.displayedLevel += (this.targetLevel - this.displayedLevel) * easing;
    if (this.targetLevel === 0 && this.displayedLevel < 0.001) {
      this.displayedLevel = 0;
      this.setLevelProperty(0);
      this.levelFrame = null;
      return;
    }
    this.setLevelProperty(this.displayedLevel);
    this.levelFrame = window.requestAnimationFrame(this.renderLevel);
  };

  private stopLevelAnimation(): void {
    if (this.levelFrame !== null) {
      window.cancelAnimationFrame(this.levelFrame);
      this.levelFrame = null;
    }
    this.hasLevel = false;
    this.targetLevel = 0;
    this.displayedLevel = 0;
    this.setLevelProperty(0);
    this.getDomElement().removeClass(this.prefixCss('mic-level-live'));
  }

  private setLevelProperty(level: number): void {
    this.getDomElement().get(0)?.style.setProperty('--mic-level', level.toFixed(3));
  }
}
