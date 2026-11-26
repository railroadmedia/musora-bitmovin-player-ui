import { Component, ComponentConfig } from './Component';
import { DOM } from '../DOM';
import {
  buildRingCelebration,
  IMusoraRingCelebrationHandles,
  TEXT_CROSSFADE_SWAP_AT_MS,
} from './MusoraRingCelebration';
import { GOLD_DISC_DATA_URI, GOLD_RING_TRACK_DATA_URI } from './ProgressRingAssets';

/**
 * Configuration interface for the {@link MusoraWeeklyProgressRing}.
 *
 * @category Configs
 */
export interface MusoraWeeklyProgressRingConfig extends ComponentConfig {
  /** Outer diameter of the ring, in px. Default: 136 (Figma: Custom-Goals-On-The-End-Screens). */
  size?: number;
  /** Ring stroke width, in px. Default: 12. */
  strokeWidth?: number;
  /** Number of segments (days in the week goal). Default: 7. */
  totalSegments?: number;
  /** Visual gap between segments, in px. Default: 8. */
  gapSize?: number;
}

declare const window: {
  setTimeout: (callback: () => void, ms: number) => number;
  clearTimeout: (handle: number) => void;
};

// Days reveal one at a time, same stagger as SegmentedProgressRing.tsx.
const TIME_BETWEEN_SEGMENTS_MS = 120;

// Same as MusoraDailyProgressRing's INNER_CARD_RATIO.
const INNER_CARD_RATIO = 100 / 136;

// Same as MusoraDailyProgressRing's GOLD_TRACK_SIZE_RATIO.
const GOLD_TRACK_SIZE_RATIO = 152 / 136;

// Day-count slot/roller duration (see playCountOdometer).
const ODOMETER_DURATION_MS = 400;

interface ISegmentGeometry {
  radius: number;
  circumference: number;
  arcLength: number;
  rotation: number;
}

function formatDayCount(days: number): string {
  const clamped = Math.max(0, days);
  return `${clamped} ${clamped === 1 ? 'day' : 'days'}`;
}

/**
 * Segmented end-screen weekly-progress ring: discrete per-day arcs that reveal in sequence.
 * Mirrors `SegmentedProgressRing.tsx`'s geometry. No "exceeded goal" state — it simply maxes
 * out (all segments filled) once the weekly goal is met.
 *
 * @category Containers
 */
export class MusoraWeeklyProgressRing extends Component<MusoraWeeklyProgressRingConfig> {
  private readonly size: number;
  private readonly strokeWidth: number;
  private readonly totalSegments: number;
  private readonly gapSize: number;
  private readonly geometry: ISegmentGeometry[];

  private filledSegments = 0;
  private revealTimers: number[] = [];
  // Built once in toDomElement and kept directly — avoids re-querying the DOM by class name,
  // which DOM.find().get() turns into `undefined` (not `[]`) when a selector can match nothing.
  private fillCircles: SVGCircleElement[] = [];
  private trackCircles: SVGCircleElement[] = [];
  private dayCountElement: HTMLElement | null = null;
  private dayCountNextElement: HTMLElement | null = null;
  private dayCountTrackElement: HTMLElement | null = null;
  private goalElement: HTMLElement | null = null;
  private cardGoldElement: HTMLElement | null = null;
  private goldBlendElement: SVGImageElement | null = null;
  private celebration: IMusoraRingCelebrationHandles | null = null;
  private goalReached = false;
  private odometerTimeout: number | null = null;
  private goalTextTimeout: number | null = null;

  constructor(config: MusoraWeeklyProgressRingConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-musora-weekly-progress-ring',
        size: 136,
        strokeWidth: 12,
        totalSegments: 7,
        gapSize: 8,
      } as MusoraWeeklyProgressRingConfig,
      this.config,
    );

    this.size = this.config.size;
    this.strokeWidth = this.config.strokeWidth;
    this.totalSegments = Math.max(1, Math.round(this.config.totalSegments));
    this.gapSize = this.config.gapSize;
    this.geometry = this.computeGeometry();
  }

  // Same math as SegmentedProgressRing.tsx: gap measured at the stroke's outer edge, padded for
  // the rounded caps' own bulge, so the gap actually visible matches gapSize.
  private computeGeometry(): ISegmentGeometry[] {
    const radius = (this.size - this.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const outerRadius = radius + this.strokeWidth / 2;
    const outerCircumference = 2 * Math.PI * outerRadius;
    const visualGapSize = this.gapSize + this.strokeWidth;
    const gapDegrees = (visualGapSize / outerCircumference) * 360;
    const spanDegrees = (360 - this.totalSegments * gapDegrees) / this.totalSegments;
    const arcLength = circumference * (spanDegrees / 360);

    return Array.from({ length: this.totalSegments }).map((_, i) => ({
      radius,
      circumference,
      arcLength,
      rotation: -90 + i * (360 / this.totalSegments) + gapDegrees / 2,
    }));
  }

  protected toDomElement(): DOM {
    const element = super.toDomElement();
    const center = this.size / 2;
    const svgNamespace = 'http://www.w3.org/2000/svg';

    element.css({ width: `${this.size}px`, height: `${this.size}px` });

    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', `0 0 ${this.size} ${this.size}`);

    // Fill circles animate rotation via CSS, so they need a custom property instead of the SVG
    // transform attribute (which a CSS transform would wipe out). Track/mask shapes never animate.
    const createArc = (g: ISegmentGeometry, cssClass: string, rotateViaCss: boolean): SVGCircleElement => {
      const circle = document.createElementNS(svgNamespace, 'circle') as SVGCircleElement;
      circle.setAttribute('class', this.prefixCss(cssClass));
      circle.setAttribute('cx', `${center}`);
      circle.setAttribute('cy', `${center}`);
      circle.setAttribute('r', `${g.radius}`);
      circle.setAttribute('stroke-width', `${this.strokeWidth}`);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke-linecap', 'round');
      circle.setAttribute('stroke-dasharray', `${g.arcLength} ${g.circumference - g.arcLength}`);
      if (rotateViaCss) {
        circle.style.setProperty('--weekly-ring-segment-rotation', `${g.rotation}deg`);
      } else {
        circle.setAttribute('transform', `rotate(${g.rotation} ${center} ${center})`);
      }
      return circle;
    };

    this.trackCircles = this.geometry.map(g => createArc(g, 'weekly-ring-track', false));
    this.trackCircles.forEach(circle => svg.appendChild(circle));
    this.fillCircles = this.geometry.map(g => createArc(g, 'weekly-ring-fill', true));
    this.fillCircles.forEach(circle => svg.appendChild(circle));

    // Masks the shared gold-track texture per-segment so segments turn individually gold on
    // goal-reached instead of merging into one seamless ring — gaps stay masked out forever.
    // prefixCss() alone would collide: it returns the same string for every instance of this
    // component, but an SVG id/url(#id) pair must be unique per *instance*, or two rings on the
    // same page resolve url(#...) to whichever instance's <defs> the browser finds first (one
    // ring then visibly driven by the other's rotation/opacity). this.config.id is already
    // unique per instance, so it's appended here as a disambiguating suffix.
    const maskId = `${this.prefixCss('weekly-ring-gold-blend-mask')}-${this.config.id}`;
    const mask = document.createElementNS(svgNamespace, 'mask');
    mask.setAttribute('id', maskId);
    this.geometry.forEach(g => mask.appendChild(createArc(g, 'weekly-ring-gold-blend-mask-shape', false)));
    const defs = document.createElementNS(svgNamespace, 'defs');
    defs.appendChild(mask);
    svg.appendChild(defs);

    const goldTrackSize = this.size * GOLD_TRACK_SIZE_RATIO;
    const goldTrackOffset = (this.size - goldTrackSize) / 2;
    const goldBlend = document.createElementNS(svgNamespace, 'image');
    goldBlend.setAttribute('class', this.prefixCss('weekly-ring-gold-blend'));
    goldBlend.setAttribute('href', GOLD_RING_TRACK_DATA_URI);
    goldBlend.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', GOLD_RING_TRACK_DATA_URI);
    goldBlend.setAttribute('x', `${goldTrackOffset}`);
    goldBlend.setAttribute('y', `${goldTrackOffset}`);
    goldBlend.setAttribute('width', `${goldTrackSize}`);
    goldBlend.setAttribute('height', `${goldTrackSize}`);
    goldBlend.setAttribute('mask', `url(#${maskId})`);
    svg.appendChild(goldBlend);
    this.goldBlendElement = goldBlend as unknown as SVGImageElement;

    element.get(0)?.appendChild(svg);

    // Inner card filling the ring's hollow center, matching ProgressCircle.tsx's innerCard.
    const innerCardSize = this.size * INNER_CARD_RATIO;
    const innerCard = new DOM('div', { class: this.prefixCss('weekly-ring-card') }).css({
      height: `${innerCardSize}px`,
      width: `${innerCardSize}px`,
    });
    element.append(innerCard);

    // Fades in over the card's flat navy background on goal-reached.
    const cardGold = new DOM('div', { class: this.prefixCss('weekly-ring-card-gold') }).css({
      backgroundImage: `url(${GOLD_DISC_DATA_URI})`,
      height: `${innerCardSize}px`,
      width: `${innerCardSize}px`,
    });
    element.append(cardGold);
    this.cardGoldElement = cardGold.get(0) ?? null;

    // Center content: calendar icon, day count, then the weekly goal below it — same layout as
    // MusoraDailyProgressRing's time/goal.
    const content = new DOM('div', { class: this.prefixCss('weekly-ring-content') });
    const calendarContent = new DOM('div', { class: this.prefixCss('weekly-ring-calendar') }).html(
      // Path from images/svgs/extras/CalendarSvg.tsx (viewBox 0 0 18 21).
      '<svg viewBox="0 0 18 21" xmlns="http://www.w3.org/2000/svg" fill="none">' +
        '<path d="M5.27072 4.76837e-06C5.96996 4.76837e-06 6.51381 0.543858 6.51381 1.2431V2.48619H11.4862V1.2431C11.4862 0.543858 12.03 4.76837e-06 12.7293 4.76837e-06C13.4285 4.76837e-06 13.9724 0.543858 13.9724 1.2431V2.48619H15.2155C16.5751 2.48619 17.7017 3.61275 17.7017 4.97238V6.83702H0.298342V4.97238C0.298342 3.61275 1.4249 2.48619 2.78453 2.48619H4.02762V1.2431C4.02762 0.543858 4.57148 4.76837e-06 5.27072 4.76837e-06ZM0.298342 8.70166H17.7017V16.1602C17.7017 17.5199 16.5751 18.6464 15.2155 18.6464H2.78453C1.4249 18.6464 0.298342 17.5199 0.298342 16.1602V8.70166Z" fill="currentColor" />' +
        '</svg>',
    );

    // Slot-roller day count: a clipped box with two stacked lines (current + incoming); the
    // track slides up one step to swap which line shows.
    const countWrap = new DOM('div', { class: this.prefixCss('weekly-ring-count') });
    const countTrack = new DOM('div', { class: this.prefixCss('weekly-ring-count-track') });
    const countCurrent = new DOM('div', { class: this.prefixCss('weekly-ring-count-line') });
    const countNext = new DOM('div', { class: this.prefixCss('weekly-ring-count-line') });
    countTrack.append(countCurrent);
    countTrack.append(countNext);
    countWrap.append(countTrack);
    this.dayCountElement = countCurrent.get(0) ?? null;
    this.dayCountNextElement = countNext.get(0) ?? null;
    this.dayCountTrackElement = countTrack.get(0) ?? null;

    const goalContent = new DOM('div', { class: this.prefixCss('weekly-ring-goal') });
    content.append(calendarContent);
    content.append(countWrap);
    content.append(goalContent);
    element.append(content);
    this.goalElement = goalContent.get(0) ?? null;
    this.setGoalLabelText();
    this.setDayCountText(0);

    this.celebration = buildRingCelebration(
      element.get(0)!,
      cls => this.prefixCss(cls),
      this.size,
      calendarContent.get(0) ?? null,
      // Skip the generic glow disc — it doubles up with the real gold-track/gold-disc assets.
      false,
    );

    return element;
  }

  private setDayCountText(filledSegments: number): void {
    if (this.dayCountElement) {
      this.dayCountElement.textContent = formatDayCount(filledSegments);
    }
  }

  private setGoalLabelText(): void {
    if (this.goalElement) {
      // Figma: "{n} days goal" — lowercase, matching the dark-theme end screen exactly.
      this.goalElement.textContent = `${this.totalSegments} ${this.totalSegments === 1 ? 'day' : 'days'} goal`;
    }
  }

  /**
   * Reveals segments up to `filledSegments` (0..totalSegments) in sequence, one every
   * {@link TIME_BETWEEN_SEGMENTS_MS}. A decrease just hides the extra segments immediately —
   * there's nothing to animate on the way down, but it does undo any goal-reached celebration
   * still showing.
   */
  setFilledSegments(filledSegments: number): void {
    const clamped = Math.max(0, Math.min(Math.round(filledSegments), this.totalSegments));
    this.clearRevealTimers();

    if (clamped <= this.filledSegments) {
      this.applyFilledSegmentsInstant(clamped);
      return;
    }

    const revealedClass = this.prefixCss('weekly-ring-fill-revealed');
    for (let i = this.filledSegments; i < clamped; i++) {
      const delay = (i - this.filledSegments) * TIME_BETWEEN_SEGMENTS_MS;
      const dayNumber = i + 1;
      const isGoalReachingIncrement = clamped === this.totalSegments && i === clamped - 1;
      const timer = window.setTimeout(() => {
        this.fillCircles[i]?.classList.add(revealedClass);
        // Every day gets the odometer roll, not just the one that completes the goal.
        this.playCountOdometer(dayNumber);
        if (isGoalReachingIncrement) {
          this.checkGoalReached();
        }
      }, delay);
      this.revealTimers.push(timer);
    }
    this.filledSegments = clamped;
  }

  /** Reverts to the pristine zero-days state so a later {@link setFilledSegments} can replay cleanly. */
  reset(): void {
    this.clearRevealTimers();
    this.resetCelebrationState();
    this.fillCircles.forEach(el => el.classList.remove(this.prefixCss('weekly-ring-fill-revealed')));
    this.filledSegments = 0;
    this.setDayCountText(0);
  }

  /**
   * Lands directly on `filledSegments` with no per-day reveal stagger — for rendering a known
   * baseline (e.g. the pre-lesson "from" state) before a later {@link setFilledSegments} animates
   * the real change.
   */
  setFilledSegmentsInstant(filledSegments: number): void {
    const clamped = Math.max(0, Math.min(Math.round(filledSegments), this.totalSegments));
    this.clearRevealTimers();
    this.applyFilledSegmentsInstant(clamped);
  }

  // Shared by setFilledSegments' decreasing branch and setFilledSegmentsInstant: lands on
  // `clamped` with no reveal stagger, undoing any goal-reached celebration if `clamped` no longer
  // reaches it.
  private applyFilledSegmentsInstant(clamped: number): void {
    if (this.goalReached) {
      this.resetCelebrationState();
    }
    const revealedClass = this.prefixCss('weekly-ring-fill-revealed');
    this.fillCircles.forEach((el, index) => {
      el.classList.toggle(revealedClass, index < clamped);
    });
    this.setDayCountText(clamped);
    this.filledSegments = clamped;
  }

  // Fires once, the first time all segments are filled.
  private checkGoalReached(): void {
    if (this.goalReached) {
      return;
    }
    this.goalReached = true;

    this.celebration?.play();
    // Fades the live stroke out, revealing the shared gold-track texture underneath.
    this.trackCircles.forEach(circle => circle.classList.add(this.prefixCss('weekly-ring-track-celebrating')));
    this.fillCircles.forEach(circle => circle.classList.add(this.prefixCss('weekly-ring-fill-celebrating')));
    this.goldBlendElement?.classList.add(this.prefixCss('weekly-ring-gold-blend-playing'));
    this.cardGoldElement?.classList.add(this.prefixCss('weekly-ring-card-gold-playing'));
    // Class (not text) carries the color, so it survives playCountOdometer's later text swap.
    const countCelebrating = this.prefixCss('weekly-ring-count-line-celebrating');
    this.dayCountElement?.classList.add(countCelebrating);
    this.dayCountNextElement?.classList.add(countCelebrating);

    if (this.goalElement) {
      this.goalElement.classList.add(this.prefixCss('celebration-text-crossfade'));
      this.goalTextTimeout = window.setTimeout(() => {
        if (this.goalElement) {
          this.goalElement.textContent = 'this week';
        }
        this.goalTextTimeout = null;
      }, TEXT_CROSSFADE_SWAP_AT_MS);
    }
  }

  // Slides the count track up one step so dayNumber takes the current line's place. Calls can
  // overlap (days reveal faster than one roll takes), so each restarts the roll from scratch.
  private playCountOdometer(dayNumber: number): void {
    const playingClass = this.prefixCss('weekly-ring-count-track-playing');

    if (this.odometerTimeout !== null) {
      window.clearTimeout(this.odometerTimeout);
      this.odometerTimeout = null;
    }
    this.dayCountTrackElement?.classList.remove(playingClass);
    // Forces a layout flush so the next classList.add is seen as a fresh animation start.
    void this.dayCountTrackElement?.offsetWidth;

    if (this.dayCountElement) {
      this.dayCountElement.textContent = formatDayCount(dayNumber - 1);
    }
    if (this.dayCountNextElement) {
      this.dayCountNextElement.textContent = formatDayCount(dayNumber);
    }
    this.dayCountTrackElement?.classList.add(playingClass);

    this.odometerTimeout = window.setTimeout(() => {
      // Lands on the final value and resets the strip's position instantly (no transition class),
      // so the DOM is back in its pristine pre-roll shape and ready for a later reset()/replay.
      this.dayCountTrackElement?.classList.remove(playingClass);
      if (this.dayCountElement) {
        this.dayCountElement.textContent = formatDayCount(dayNumber);
      }
      if (this.dayCountNextElement) {
        this.dayCountNextElement.textContent = '';
      }
      this.odometerTimeout = null;
    }, ODOMETER_DURATION_MS);
  }

  // Reverts everything checkGoalReached set, back to the non-achieved baseline.
  private resetCelebrationState(): void {
    this.goalReached = false;
    this.celebration?.reset();

    if (this.odometerTimeout !== null) {
      window.clearTimeout(this.odometerTimeout);
      this.odometerTimeout = null;
    }
    if (this.goalTextTimeout !== null) {
      window.clearTimeout(this.goalTextTimeout);
      this.goalTextTimeout = null;
    }

    const celebratingFill = this.prefixCss('weekly-ring-fill-celebrating');
    const celebratingTrack = this.prefixCss('weekly-ring-track-celebrating');
    this.fillCircles.forEach(circle => circle.classList.remove(celebratingFill));
    this.trackCircles.forEach(circle => circle.classList.remove(celebratingTrack));
    this.goldBlendElement?.classList.remove(this.prefixCss('weekly-ring-gold-blend-playing'));
    this.cardGoldElement?.classList.remove(this.prefixCss('weekly-ring-card-gold-playing'));
    const countCelebrating = this.prefixCss('weekly-ring-count-line-celebrating');
    this.dayCountElement?.classList.remove(countCelebrating);
    this.dayCountNextElement?.classList.remove(countCelebrating);
    this.dayCountTrackElement?.classList.remove(this.prefixCss('weekly-ring-count-track-playing'));
    if (this.dayCountNextElement) {
      this.dayCountNextElement.textContent = '';
    }
    this.goalElement?.classList.remove(this.prefixCss('celebration-text-crossfade'));
    this.setGoalLabelText();
  }

  private clearRevealTimers(): void {
    this.revealTimers.forEach(timer => window.clearTimeout(timer));
    this.revealTimers = [];
  }

  release(): void {
    this.clearRevealTimers();
    if (this.odometerTimeout !== null) {
      window.clearTimeout(this.odometerTimeout);
      this.odometerTimeout = null;
    }
    if (this.goalTextTimeout !== null) {
      window.clearTimeout(this.goalTextTimeout);
      this.goalTextTimeout = null;
    }
    super.release();
  }
}
