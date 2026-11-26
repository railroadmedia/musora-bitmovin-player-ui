import { Component, ComponentConfig } from './Component';
import { DOM } from '../DOM';
import { MusoraDailyProgressRing } from './MusoraDailyProgressRing';
import { MusoraWeeklyProgressRing } from './MusoraWeeklyProgressRing';

/**
 * Configuration interface for the {@link MusoraEndScreenProgressRings}.
 *
 * @category Configs
 */
export interface MusoraEndScreenProgressRingsConfig extends ComponentConfig {
  /** Outer diameter of both rings, in px. Default: 136 (Figma: Custom-Goals-On-The-End-Screens). */
  size?: number;
  /** Ring stroke width, in px. Default: 12. */
  strokeWidth?: number;
  /** Number of segments (days in the weekly goal) for the weekly ring. Default: 7. */
  weeklyTotalSegments?: number;
}

/** Values for one {@link MusoraEndScreenProgressRings.playSequence} call. */
export interface IMusoraEndScreenProgressRingsSequence {
  /** Day count (not ratio) the weekly ring shows before the lesson completed. */
  weeklyFrom: number;
  /** Day count the weekly ring animates to. */
  weeklyTo: number;
  /** Seconds practiced today before the lesson completed. */
  dailyFrom: number;
  /** Seconds practiced today after the lesson completed. */
  dailyTo: number;
  /** Daily practice goal, in seconds. */
  dailyGoal: number;
}

declare const window: {
  setTimeout: (callback: () => void, ms: number) => number;
  clearTimeout: (handle: number) => void;
};

// Figma: Custom-Goals-On-The-End-Screens, node 10598:176 — "Lesson complete" end-screen clip.
// Tweak any of these to retime the sequence; nothing else in this file hardcodes a duration.

// Step 1: hold on the weekly ring's pre-lesson value before animating it.
export const SEQUENCE_WEEKLY_INITIAL_HOLD_MS = 1000;
// Step 2: time budgeted for the weekly ring's own reveal animation (a single day increment) to
// visibly finish before the sequencer moves on. The ring's per-segment reveal timing lives in
// MusoraWeeklyProgressRing (TIME_BETWEEN_SEGMENTS_MS) — this is a sequencing budget, not a copy
// of it, so widen it here if a multi-day jump needs more time to finish revealing.
export const SEQUENCE_WEEKLY_FILL_HOLD_MS = 500;
// Step 3: hold on the weekly ring's post-lesson value before flipping to the daily ring.
export const SEQUENCE_WEEKLY_POST_HOLD_MS = 1000;
// Step 4: total card-flip duration — split evenly into "weekly collapses away" (ease-in) then
// "daily expands in" (ease-out) halves, matching Figma's authored flip.
export const SEQUENCE_FLIP_DURATION_MS = 300;

/**
 * Plays the full "Custom Goals" end-screen reveal: shows the weekly ring's current progress,
 * animates it to its new value, holds, flips to reveal the daily ring at its own pre-lesson
 * value, then animates the daily ring to its post-lesson value. Mirrors the sequence plan in
 * `.claude/docs/planning/musoraapp-end-screen-progress-rings.md`.
 *
 * The two rings are stacked in the same box and swapped via a 2D card-flip (scaleX 1→0→1,
 * matching Figma's own flip — not a 3D rotateY), rather than being shown side by side.
 *
 * @category Containers
 */
export class MusoraEndScreenProgressRings extends Component<MusoraEndScreenProgressRingsConfig> {
  private readonly dailyRing: MusoraDailyProgressRing;
  private readonly weeklyRing: MusoraWeeklyProgressRing;

  private weeklyFaceElement: HTMLElement | null = null;
  private dailyFaceElement: HTMLElement | null = null;
  private sequenceTimers: number[] = [];

  constructor(config: MusoraEndScreenProgressRingsConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-musora-end-screen-progress-rings',
        size: 136,
        strokeWidth: 12,
        weeklyTotalSegments: 7,
      } as MusoraEndScreenProgressRingsConfig,
      this.config,
    );

    this.dailyRing = new MusoraDailyProgressRing({
      size: this.config.size,
      strokeWidth: this.config.strokeWidth,
    });
    this.weeklyRing = new MusoraWeeklyProgressRing({
      size: this.config.size,
      strokeWidth: this.config.strokeWidth,
      totalSegments: this.config.weeklyTotalSegments,
    });
  }

  protected toDomElement(): DOM {
    const element = super.toDomElement();
    const size = this.config.size;
    element.css({ height: `${size}px`, width: `${size}px` });

    const flipHalfMs = SEQUENCE_FLIP_DURATION_MS / 2;
    element.get(0)?.style.setProperty('--rings-flip-half-duration', `${flipHalfMs}ms`);

    const weeklyFace = new DOM('div', { class: this.prefixCss('rings-flip-face') }).addClass(
      this.prefixCss('rings-flip-face-front'),
    );
    weeklyFace.append(this.weeklyRing.getDomElement());

    const dailyFace = new DOM('div', { class: this.prefixCss('rings-flip-face') }).addClass(
      this.prefixCss('rings-flip-face-back'),
    );
    dailyFace.append(this.dailyRing.getDomElement());

    element.append(weeklyFace);
    element.append(dailyFace);
    this.weeklyFaceElement = weeklyFace.get(0) ?? null;
    this.dailyFaceElement = dailyFace.get(0) ?? null;

    return element;
  }

  /**
   * Plays the step 1-5 sequence described on {@link MusoraEndScreenProgressRings}. Safe to call
   * again (e.g. for the next lesson's end screen) — any in-flight sequence is cancelled first and
   * both rings are re-primed from the new `*From` baselines.
   */
  playSequence(values: IMusoraEndScreenProgressRingsSequence): void {
    this.clearSequenceTimers();
    this.resetFlipState();

    // Step 1 baseline: land both rings on their pre-lesson values with no reveal animation, so
    // the weekly ring is what's showing (and the daily ring is already primed, though hidden)
    // the instant this plays.
    this.weeklyRing.setFilledSegmentsInstant(values.weeklyFrom);
    this.dailyRing.animateProgress(values.dailyFrom, values.dailyFrom, values.dailyGoal);

    // Step 2: after the initial hold, animate the weekly ring to its new value.
    this.schedule(SEQUENCE_WEEKLY_INITIAL_HOLD_MS, () => {
      this.weeklyRing.setFilledSegments(values.weeklyTo);
    });

    // Step 4: after the fill + post-hold, flip from the weekly face to the daily face.
    const flipStartMs = SEQUENCE_WEEKLY_INITIAL_HOLD_MS + SEQUENCE_WEEKLY_FILL_HOLD_MS + SEQUENCE_WEEKLY_POST_HOLD_MS;
    this.schedule(flipStartMs, () => {
      this.weeklyFaceElement?.classList.add(this.prefixCss('rings-flip-face-flipping-out'));
    });

    // Step 5: midway through the flip, swap which face is showing and immediately start the
    // daily ring's own fill animation — it plays concurrently with the flip-in half, not after it.
    this.schedule(flipStartMs + SEQUENCE_FLIP_DURATION_MS / 2, () => {
      this.weeklyFaceElement?.classList.add(this.prefixCss('rings-flip-face-hidden'));
      this.dailyFaceElement?.classList.add(this.prefixCss('rings-flip-face-flipping-in'));
      this.dailyRing.animateProgress(values.dailyFrom, values.dailyTo, values.dailyGoal);
    });
  }

  private resetFlipState(): void {
    this.weeklyFaceElement?.classList.remove(
      this.prefixCss('rings-flip-face-flipping-out'),
      this.prefixCss('rings-flip-face-hidden'),
    );
    this.dailyFaceElement?.classList.remove(this.prefixCss('rings-flip-face-flipping-in'));
  }

  private schedule(delayMs: number, callback: () => void): void {
    this.sequenceTimers.push(window.setTimeout(callback, delayMs));
  }

  private clearSequenceTimers(): void {
    this.sequenceTimers.forEach(timer => window.clearTimeout(timer));
    this.sequenceTimers = [];
  }

  release(): void {
    this.clearSequenceTimers();
    this.dailyRing.release();
    this.weeklyRing.release();
    super.release();
  }
}
