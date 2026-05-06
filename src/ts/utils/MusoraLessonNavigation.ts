/**
 * CustomMessageHandler event names for lesson navigation (Musora touch overlay prev/next).
 * These match the BitmovinCustomEvents enum in the MusoraApp host and are handled in the
 * customMessageHandler switch inside BitmovinVideo.tsx (onPreviousLesson / onNextLesson cases).
 */
export const MUSORA_LESSON_PREVIOUS_MESSAGE = 'onPreviousLesson';
export const MUSORA_LESSON_NEXT_MESSAGE = 'onNextLesson';
