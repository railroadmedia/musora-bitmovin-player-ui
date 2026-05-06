import { QuickSeekButton, QuickSeekButtonConfig } from './QuickSeekButton';
import { MUSORA_LESSON_PREVIOUS_MESSAGE } from '../../utils/MusoraLessonNavigation';

/**
 * Previous lesson: sends {@link MUSORA_LESSON_PREVIOUS_MESSAGE} via CustomMessageHandler (same behavior as lesson-mode {@link QuickSeekButton}).
 *
 * @category Buttons
 */
export class MusoraPreviousButton extends QuickSeekButton {
  constructor(config: QuickSeekButtonConfig = {}) {
    super({
      customMessage: MUSORA_LESSON_PREVIOUS_MESSAGE,
      lessonNavigationRole: 'previous',
      ...config,
    });
  }
}
