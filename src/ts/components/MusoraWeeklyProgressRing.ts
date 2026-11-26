import { Component, ComponentConfig } from './Component';
import { DOM } from '../DOM';
import {
  buildRingCelebration,
  IMusoraRingCelebrationHandles,
  TEXT_CROSSFADE_SWAP_AT_MS,
} from './MusoraRingCelebration';

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

// Days reveal one at a time, same stagger as SegmentedProgressRing.tsx.
const TIME_BETWEEN_SEGMENTS_MS = 120;

// Same as MusoraDailyProgressRing's INNER_CARD_RATIO.
const INNER_CARD_RATIO = 100 / 136;

interface ISegmentGeometry {
  radius: number;
  circumference: number;
  arcLength: number;
  rotation: number;
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
  private dayCountElement: HTMLElement | null = null;
  private goalElement: HTMLElement | null = null;
  private celebration: IMusoraRingCelebrationHandles | null = null;
  private goalReached = false;

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

    // Fill circles get animated via CSS transform, so their rotation has to be a custom property
    // (see _musoraweeklyprogressring.scss) rather than the SVG transform attribute, which a CSS
    // transform would otherwise wipe out. Track circles are never animated, so the attribute is fine.
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

    this.geometry.forEach(g => svg.appendChild(createArc(g, 'weekly-ring-track', false)));
    this.fillCircles = this.geometry.map(g => createArc(g, 'weekly-ring-fill', true));
    this.fillCircles.forEach(circle => svg.appendChild(circle));

    element.get(0)?.appendChild(svg);

    // Inner card filling the ring's hollow center, matching ProgressCircle.tsx's innerCard.
    const innerCardSize = this.size * INNER_CARD_RATIO;
    const innerCard = new DOM('div', { class: this.prefixCss('weekly-ring-card') }).css({
      height: `${innerCardSize}px`,
      width: `${innerCardSize}px`,
    });
    element.append(innerCard);

    // Center content: calendar icon, day count, then the weekly goal below it — same layout as
    // MusoraDailyProgressRing's time/goal.
    const content = new DOM('div', { class: this.prefixCss('weekly-ring-content') });
    const calendarContent = new DOM('div', { class: this.prefixCss('weekly-ring-calendar') }).html(
      // Path from images/svgs/extras/CalendarSvg.tsx (viewBox 0 0 18 21).
      '<svg viewBox="0 0 18 21" xmlns="http://www.w3.org/2000/svg" fill="none">' +
        '<path d="M5.27072 4.76837e-06C5.96996 4.76837e-06 6.51381 0.543858 6.51381 1.2431V2.48619H11.4862V1.2431C11.4862 0.543858 12.03 4.76837e-06 12.7293 4.76837e-06C13.4285 4.76837e-06 13.9724 0.543858 13.9724 1.2431V2.48619H15.2155C16.5751 2.48619 17.7017 3.61275 17.7017 4.97238V6.83702H0.298342V4.97238C0.298342 3.61275 1.4249 2.48619 2.78453 2.48619H4.02762V1.2431C4.02762 0.543858 4.57148 4.76837e-06 5.27072 4.76837e-06ZM0.298342 8.70166H17.7017V16.1602C17.7017 17.5199 16.5751 18.6464 15.2155 18.6464H2.78453C1.4249 18.6464 0.298342 17.5199 0.298342 16.1602V8.70166Z" fill="currentColor" />' +
        '</svg>',
    );
    const dayCountContent = new DOM('div', { class: this.prefixCss('weekly-ring-count') });
    const goalContent = new DOM('div', { class: this.prefixCss('weekly-ring-goal') });
    content.append(calendarContent);
    content.append(dayCountContent);
    content.append(goalContent);
    element.append(content);
    this.dayCountElement = dayCountContent.get(0) ?? null;
    this.goalElement = goalContent.get(0) ?? null;
    // Figma: "{n} days goal" — lowercase, matching the dark-theme end screen exactly.
    goalContent.html(`${this.totalSegments} ${this.totalSegments === 1 ? 'day' : 'days'} goal`);
    this.setDayCountText(0);

    this.celebration = buildRingCelebration(
      element.get(0)!,
      cls => this.prefixCss(cls),
      this.size,
      calendarContent.get(0) ?? null,
    );

    return element;
  }

  private setDayCountText(filledSegments: number): void {
    if (this.dayCountElement) {
      this.dayCountElement.textContent = `${filledSegments} ${filledSegments === 1 ? 'day' : 'days'}`;
    }
  }

  /**
   * Reveals segments up to `filledSegments` (0..totalSegments) in sequence, one every
   * {@link TIME_BETWEEN_SEGMENTS_MS}. A decrease just hides the extra segments immediately —
   * there's nothing to animate on the way down.
   */
  setFilledSegments(filledSegments: number): void {
    const clamped = Math.max(0, Math.min(Math.round(filledSegments), this.totalSegments));
    this.clearRevealTimers();
    this.setDayCountText(clamped);

    const revealedClass = this.prefixCss('weekly-ring-fill-revealed');

    if (clamped <= this.filledSegments) {
      this.fillCircles.forEach((el, index) => {
        el.classList.toggle(revealedClass, index < clamped);
      });
      this.filledSegments = clamped;
      return;
    }

    for (let i = this.filledSegments; i < clamped; i++) {
      const delay = (i - this.filledSegments) * TIME_BETWEEN_SEGMENTS_MS;
      const timer = window.setTimeout(() => {
        this.fillCircles[i]?.classList.add(revealedClass);
        if (clamped === this.totalSegments && i === clamped - 1) {
          this.checkGoalReached();
        }
      }, delay);
      this.revealTimers.push(timer);
    }
    this.filledSegments = clamped;
  }

  // Fires once, the first time all segments are filled.
  private checkGoalReached(): void {
    if (this.goalReached) {
      return;
    }
    this.goalReached = true;

    this.celebration?.play();
    this.fillCircles.forEach(circle => circle.classList.add(this.prefixCss('weekly-ring-fill-celebrating')));

    if (this.dayCountElement) {
      this.dayCountElement.classList.add(this.prefixCss('celebration-count-bounce'));
    }
    if (this.goalElement) {
      this.goalElement.classList.add(this.prefixCss('celebration-text-crossfade'));
      window.setTimeout(() => {
        if (this.goalElement) {
          this.goalElement.textContent = 'this week';
        }
      }, TEXT_CROSSFADE_SWAP_AT_MS);
    }
  }

  private clearRevealTimers(): void {
    this.revealTimers.forEach(timer => window.clearTimeout(timer));
    this.revealTimers = [];
  }

  release(): void {
    this.clearRevealTimers();
    super.release();
  }
}
