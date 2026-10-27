import { Container, ContainerConfig } from './Container';
import { Button, ButtonConfig } from './buttons/Button';
import { UIInstanceManager } from '../UIManager';
import { PlayerAPI } from 'bitmovin-player';

/**
 * Message sent to React Native when a fullscreen lesson action is tapped.
 * Payload JSON: `{ action: MusoraLessonAction }`.
 */
export const LESSON_ACTION_PRESS_MESSAGE = 'onLessonActionPress';

/**
 * Message React Native sends to drive the fullscreen lesson action bar.
 * Payload JSON: {@link MusoraLessonActionsState}.
 */
export const SET_LESSON_ACTIONS_STATE_MESSAGE = 'setLessonActionsState';

export enum MusoraLessonAction {
  Complete = 'complete',
  Like = 'like',
  Notes = 'notes',
  Comments = 'comments',
  More = 'more',
}

export interface MusoraLessonActionsState {
  visible?: boolean;
  completed?: boolean;
  liked?: boolean;
  showComplete?: boolean;
  showNotes?: boolean;
  showComments?: boolean;
}

declare const window: {
  bitmovin?: {
    customMessageHandler?: {
      sendAsynchronous: (message: string, payload?: string) => void;
      on: (event: string, callback: (data?: string) => void) => void;
    };
  };
};

const ACTIONS: { action: MusoraLessonAction; label: string; activeLabel?: string }[] = [
  { action: MusoraLessonAction.Complete, label: 'Complete', activeLabel: 'Completed' },
  { action: MusoraLessonAction.Like, label: 'Like', activeLabel: 'Liked' },
  { action: MusoraLessonAction.Notes, label: 'Notes' },
  { action: MusoraLessonAction.Comments, label: 'Comments' },
  { action: MusoraLessonAction.More, label: 'More' },
];

/**
 * Fullscreen row of lesson actions below the seek bar.
 * State is owned by React Native. A tap only notifies the host.
 *
 * @category Components
 */
export class MusoraLessonActionBar extends Container<ContainerConfig> {
  private static readonly SHOWN_CLASS = 'musora-lesson-actions-shown';
  private static readonly ACTIVE_CLASS = 'musora-lesson-action-active';

  private readonly buttons: Record<MusoraLessonAction, Button<ButtonConfig>>;

  constructor(config: ContainerConfig = {}) {
    super(config);

    this.buttons = ACTIONS.reduce(
      (buttons, { action, label }) => {
        buttons[action] = new Button({
          text: label,
          cssClasses: ['musora-lesson-action', `musora-lesson-action-${action}`],
        });
        return buttons;
      },
      {} as Record<MusoraLessonAction, Button<ButtonConfig>>,
    );

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'musora-lesson-action-bar',
        components: ACTIONS.map(({ action }) => this.buttons[action]),
        hidden: true,
      },
      this.config,
    );
  }

  configure(player: PlayerAPI, uimanager: UIInstanceManager): void {
    super.configure(player, uimanager);

    const customMessageHandler = window.bitmovin?.customMessageHandler;
    if (!customMessageHandler) {
      return;
    }

    ACTIONS.forEach(({ action }) => {
      this.buttons[action].onClick.subscribe(() => {
        customMessageHandler.sendAsynchronous(LESSON_ACTION_PRESS_MESSAGE, JSON.stringify({ action }));
      });
    });

    customMessageHandler.on(SET_LESSON_ACTIONS_STATE_MESSAGE, (data?: string) => {
      this.applyState(uimanager, data);
    });
  }

  private applyState(uimanager: UIInstanceManager, data?: string): void {
    let state: MusoraLessonActionsState = {};
    if (data) {
      try {
        state = JSON.parse(data) as MusoraLessonActionsState;
      } catch {
        return;
      }
    }

    const shownClass = this.prefixCss(MusoraLessonActionBar.SHOWN_CLASS);
    const uiElement = uimanager.getUI().getDomElement();
    if (state.visible) {
      this.show();
      uiElement.addClass(shownClass);
    } else {
      this.hide();
      uiElement.removeClass(shownClass);
    }

    const shown: Record<MusoraLessonAction, boolean> = {
      [MusoraLessonAction.Complete]: !!state.showComplete,
      [MusoraLessonAction.Like]: true,
      [MusoraLessonAction.Notes]: !!state.showNotes,
      [MusoraLessonAction.Comments]: !!state.showComments,
      [MusoraLessonAction.More]: true,
    };
    const active: Partial<Record<MusoraLessonAction, boolean>> = {
      [MusoraLessonAction.Complete]: state.completed,
      [MusoraLessonAction.Like]: state.liked,
    };
    const activeClass = this.prefixCss(MusoraLessonActionBar.ACTIVE_CLASS);

    ACTIONS.forEach(({ action, label, activeLabel }) => {
      const button = this.buttons[action];
      if (shown[action]) {
        button.show();
      } else {
        button.hide();
      }

      if (activeLabel) {
        const element = button.getDomElement();
        if (active[action]) {
          element.addClass(activeClass);
        } else {
          element.removeClass(activeClass);
        }
        element.attr('aria-label', active[action] ? activeLabel : label);
      }
    });
  }
}
