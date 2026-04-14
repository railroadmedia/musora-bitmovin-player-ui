import { QuickSeekButton, QuickSeekButtonConfig } from './QuickSeekButton';
import { MUSORA_LESSON_NEXT_MESSAGE } from '../../utils/MusoraLessonNavigation';

/**
 * Next lesson: sends {@link MUSORA_LESSON_NEXT_MESSAGE} via CustomMessageHandler (same behavior as lesson-mode {@link QuickSeekButton}).
 *
 * @category Buttons
 */
export class MusoraNextButton extends QuickSeekButton {
  constructor(config: QuickSeekButtonConfig = {}) {
    super({
      customMessage: MUSORA_LESSON_NEXT_MESSAGE,
      lessonNavigationRole: 'next',
      ...config,
    });
  }
}
