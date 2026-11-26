import { Component, ComponentConfig } from './Component';
import { DOM } from '../DOM';
import {
  buildRingCelebration,
  IMusoraRingCelebrationHandles,
  TEXT_CROSSFADE_SWAP_AT_MS,
} from './MusoraRingCelebration';
import { DAILY_RING_GOLD_DISC_DATA_URI, DAILY_RING_GOLD_TRACK_DATA_URI } from './DailyProgressRingAssets';

/**
 * Configuration interface for the {@link MusoraDailyProgressRing}.
 *
 * @category Configs
 */
export interface MusoraDailyProgressRingConfig extends ComponentConfig {
  /** Outer diameter of the ring, in px. Default: 136 (Figma: Custom-Goals-On-The-End-Screens). */
  size?: number;
  /** Ring stroke width, in px. Default: 12. */
  strokeWidth?: number;
}

declare const window: {
  requestAnimationFrame: (callback: () => void) => number;
  cancelAnimationFrame: (handle: number) => void;
  setTimeout: (callback: () => void, ms: number) => number;
};

// Matches ProgressCircle.tsx: ratios at/above this start blending in the "exceeded goal" gradient.
const GRADIENT_THRESHOLD = 0.95;
const FILL_EASING = 0.08;
const SETTLE_THRESHOLD = 0.001;

// 100px inner card at a 136px ring size, with a 6px gap to the stroke.
const INNER_CARD_RATIO = 100 / 136;

// Figma's "Progress_1 (gold)" gold-track asset is 152px at a 136px ring (it bleeds past the ring edge).
const GOLD_TRACK_SIZE_RATIO = 152 / 136;

// Same "M:SS" format as ProgressCircle.tsx's formatTime (helpers.ts) — minutes unpadded.
function formatTime(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Solid end-screen daily-progress ring. Mirrors `ProgressCircle.tsx`'s fill + exceeded-goal
 * gradient-overlay behavior, driven by a requestAnimationFrame loop instead of Reanimated.
 *
 * @category Containers
 */
export class MusoraDailyProgressRing extends Component<MusoraDailyProgressRingConfig> {
  private readonly size: number;
  private readonly strokeWidth: number;
  private readonly radius: number;
  private readonly circumference: number;

  private targetRatio = 0;
  private displayedRatio = 0;
  private goal = 0;
  private animationFrame: number | null = null;
  private timeElement: HTMLElement | null = null;
  private goalElement: HTMLElement | null = null;
  private trackElement: SVGCircleElement | null = null;
  private fillElement: SVGCircleElement | null = null;
  private dotElement: SVGCircleElement | null = null;
  private popGroupElement: SVGGElement | null = null;
  private contentElement: HTMLElement | null = null;
  private cardGoldElement: HTMLElement | null = null;
  private goldTrackElement: HTMLElement | null = null;
  private goldBlendElement: SVGImageElement | null = null;
  private goldBlendMaskShapeElement: SVGCircleElement | null = null;
  private celebration: IMusoraRingCelebrationHandles | null = null;
  private goalReached = false;

  constructor(config: MusoraDailyProgressRingConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'ui-musora-daily-progress-ring',
        size: 136,
        strokeWidth: 12,
      } as MusoraDailyProgressRingConfig,
      this.config,
    );

    this.size = this.config.size;
    this.strokeWidth = this.config.strokeWidth;
    this.radius = (this.size - this.strokeWidth) / 2;
    this.circumference = 2 * Math.PI * this.radius;
  }

  protected toDomElement(): DOM {
    const element = super.toDomElement();
    const center = this.size / 2;

    element.css({ width: `${this.size}px`, height: `${this.size}px` });

    // Centered the same as the illustrated gold-track background below, so the masked image
    // samples from exactly the same position/scale as that static track.
    const goldTrackSize = this.size * GOLD_TRACK_SIZE_RATIO;
    const goldTrackOffset = (this.size - goldTrackSize) / 2;

    element.html(
      `<svg viewBox="0 0 ${this.size} ${this.size}" xmlns="http://www.w3.org/2000/svg" ` +
        'xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<defs>' +
        `<linearGradient id="${this.prefixCss('daily-ring-exceeded-gradient')}" x1="0" y1="0" x2="0" y2="1">` +
        '<stop offset="20%" stop-opacity="0" />' +
        `<stop offset="40%" class="${this.prefixCss('daily-ring-gradient-stop')}" />` +
        `<stop offset="45%" class="${this.prefixCss('daily-ring-gradient-stop')}" />` +
        '<stop offset="80%" stop-opacity="0" />' +
        '</linearGradient>' +
        // Reveals a small arc of the *static* illustrated gold-track image (below) through a
        // window shaped and rotated exactly like daily-ring-dot. Unlike a separate rotating
        // raster asset, this always samples the real track's own pixels at the current angle —
        // no seam, no baked-in shadow of its own to clash with the ring underneath it.
        `<mask id="${this.prefixCss('daily-ring-gold-blend-mask')}">` +
        `<circle class="${this.prefixCss('daily-ring-gold-blend-mask-shape')}" cx="${center}" cy="${center}" ` +
        `r="${this.radius}" stroke="#fff" stroke-width="${this.strokeWidth}" fill="none" stroke-linecap="round" ` +
        `stroke-dasharray="1 ${this.circumference - 1}" stroke-dashoffset="${-this.circumference}" />` +
        '</mask>' +
        '</defs>' +
        // Groups track/fill/exceeded/dot so one shared pop-scale animation on the group covers
        // all four at once, instead of pasting the same scale keyframe onto each separately.
        // Each still carries its own rotation and its own opacity/filter celebrate animation.
        `<g class="${this.prefixCss('daily-ring-pop-group')}">` +
        `<circle class="${this.prefixCss('daily-ring-track')}" cx="${center}" cy="${center}" r="${this.radius}" ` +
        `stroke-width="${this.strokeWidth}" fill="none" />` +
        // No SVG `transform` attribute here — the CSS `transform` property fully owns rotation
        // for this element (and always wins over a presentation attribute anyway, per spec).
        `<circle class="${this.prefixCss('daily-ring-fill')}" cx="${center}" cy="${center}" r="${this.radius}" ` +
        `stroke-width="${this.strokeWidth}" fill="none" stroke-linecap="round" ` +
        `stroke-dasharray="${this.circumference} ${this.circumference}" />` +
        `<circle class="${this.prefixCss('daily-ring-exceeded')}" cx="${center}" cy="${center}" r="${this.radius}" ` +
        `stroke-width="${this.strokeWidth}" fill="none" stroke-linecap="round" ` +
        `stroke="url(#${this.prefixCss('daily-ring-exceeded-gradient')})" ` +
        `stroke-dasharray="${this.circumference * 0.1} ${this.circumference * 0.9}" />` +
        // Caps the fill's leading tip: its round-linecap glow can otherwise bleed past the
        // track underneath (ProgressCircle.tsx's "progress dot" fix for the same artifact).
        `<circle class="${this.prefixCss('daily-ring-dot')}" cx="${center}" cy="${center}" r="${this.radius}" ` +
        `stroke-width="${this.strokeWidth}" fill="none" stroke-linecap="round" ` +
        `stroke-dasharray="1 ${this.circumference - 1}" stroke-dashoffset="${-this.circumference}" />` +
        '</g>' +
        // Not rotated itself — only the mask's window rotates (CSS, on the mask shape above) —
        // so the texture it reveals always lines up with the identical, static goldTrack image.
        `<image class="${this.prefixCss('daily-ring-gold-blend')}" href="${DAILY_RING_GOLD_TRACK_DATA_URI}" ` +
        `xlink:href="${DAILY_RING_GOLD_TRACK_DATA_URI}" x="${goldTrackOffset}" y="${goldTrackOffset}" ` +
        `width="${goldTrackSize}" height="${goldTrackSize}" ` +
        `mask="url(#${this.prefixCss('daily-ring-gold-blend-mask')})" />` +
        '</svg>',
    );
    element.get(0)?.style.setProperty('--daily-ring-circumference', this.circumference.toFixed(3));

    // Figma's illustrated gold-track ring; hidden until goal-reached. Inserted before the SVG so
    // the dot/exceeded-overlay (drawn last inside it) stay on top of it.
    const goldTrack = new DOM('div', { class: this.prefixCss('daily-ring-gold-track') }).css({
      backgroundImage: `url(${DAILY_RING_GOLD_TRACK_DATA_URI})`,
      height: `${goldTrackSize}px`,
      width: `${goldTrackSize}px`,
    });
    element.get(0)?.insertBefore(goldTrack.get(0)!, element.get(0)!.firstChild);
    this.goldTrackElement = goldTrack.get(0) ?? null;

    // Inner card filling the ring's hollow center, matching ProgressCircle.tsx's innerCard.
    const innerCardSize = this.size * INNER_CARD_RATIO;
    const innerCard = new DOM('div', { class: this.prefixCss('daily-ring-card') }).css({
      height: `${innerCardSize}px`,
      width: `${innerCardSize}px`,
    });
    element.append(innerCard);

    // Figma's "Gold disc" — fades in on top of the card's flat navy background on goal-reached.
    const cardGold = new DOM('div', { class: this.prefixCss('daily-ring-card-gold') }).css({
      backgroundImage: `url(${DAILY_RING_GOLD_DISC_DATA_URI})`,
      height: `${innerCardSize}px`,
      width: `${innerCardSize}px`,
    });
    element.append(cardGold);
    this.cardGoldElement = cardGold.get(0) ?? null;

    // Center content: clock icon, practice time, goal below it. Sized to the inner card (not
    // auto) so the celebrating layout can position children by percentage.
    const content = new DOM('div', { class: this.prefixCss('daily-ring-content') }).css({
      height: `${innerCardSize}px`,
      width: `${innerCardSize}px`,
    });
    const clockContent = new DOM('div', { class: this.prefixCss('daily-ring-clock') }).html(
      // Path from images/svgs/extras/ClockSvg.tsx (viewBox 0 0 17 20).
      '<svg viewBox="0 0 17 20" xmlns="http://www.w3.org/2000/svg" fill="none">' +
        '<path d="M6.53846 0C5.81514 0 5.23077 0.558594 5.23077 1.25C5.23077 1.94141 5.81514 2.5 6.53846 2.5H7.19231V3.84375C3.11803 4.44531 0 7.8125 0 11.875C0 16.3633 3.80457 20 8.5 20C13.1954 20 17 16.3633 17 11.875C17 10.2422 16.4974 8.72266 15.631 7.45313L16.6159 6.51172C17.1267 6.02344 17.1267 5.23047 16.6159 4.74219C16.105 4.25391 15.2755 4.25391 14.7647 4.74219L13.882 5.58594C12.7337 4.6875 11.3401 4.07031 9.80769 3.84375V2.5H10.4615C11.1849 2.5 11.7692 1.94141 11.7692 1.25C11.7692 0.558594 11.1849 0 10.4615 0H8.5H6.53846ZM9.48077 7.5V12.5C9.48077 13.0195 9.04351 13.4375 8.5 13.4375C7.95649 13.4375 7.51923 13.0195 7.51923 12.5V7.5C7.51923 6.98047 7.95649 6.5625 8.5 6.5625C9.04351 6.5625 9.48077 6.98047 9.48077 7.5Z" fill="currentColor" />' +
        '</svg>',
    );
    const timeContent = new DOM('div', { class: this.prefixCss('daily-ring-time') });
    const goalContent = new DOM('div', { class: this.prefixCss('daily-ring-goal') });
    content.append(clockContent);
    content.append(timeContent);
    content.append(goalContent);
    element.append(content);
    this.timeElement = timeContent.get(0) ?? null;
    this.goalElement = goalContent.get(0) ?? null;
    this.contentElement = content.get(0) ?? null;
    this.trackElement =
      (element.find('.' + this.prefixCss('daily-ring-track')).get(0) as unknown as SVGCircleElement) ?? null;
    this.fillElement =
      (element.find('.' + this.prefixCss('daily-ring-fill')).get(0) as unknown as SVGCircleElement) ?? null;
    this.dotElement =
      (element.find('.' + this.prefixCss('daily-ring-dot')).get(0) as unknown as SVGCircleElement) ?? null;
    this.popGroupElement =
      (element.find('.' + this.prefixCss('daily-ring-pop-group')).get(0) as unknown as SVGGElement) ?? null;
    this.goldBlendElement =
      (element.find('.' + this.prefixCss('daily-ring-gold-blend')).get(0) as unknown as SVGImageElement) ?? null;
    this.goldBlendMaskShapeElement =
      (element.find('.' + this.prefixCss('daily-ring-gold-blend-mask-shape')).get(0) as unknown as SVGCircleElement) ??
      null;

    this.celebration = buildRingCelebration(
      element.get(0)!,
      cls => this.prefixCss(cls),
      this.size,
      clockContent.get(0) ?? null,
      // Skip the generic synthetic glow disc — this ring already renders the real illustrated
      // gold-track asset, and the two together over-brighten into one edge-less blob.
      false,
    );

    return element;
  }

  /**
   * Animates the ring fill from `from` to `to` out of `goal`. Ratios above 1 (goal exceeded)
   * wrap the fill and fade in the gradient overlay, matching `ProgressCircle.tsx`.
   */
  animateProgress(from: number, to: number, goal: number): void {
    if (goal <= 0) {
      return;
    }
    this.goal = goal;
    const startRatio = Math.max(0, from / goal);
    this.targetRatio = Math.max(0, to / goal);

    // Every call starts fresh from `from`'s actual state, instead of carrying over whatever
    // celebration state a previous call left behind — reset to the non-achieved baseline first,
    // then instantly re-apply the achieved state if `from` is already past the goal.
    this.resetCelebration();
    this.displayedRatio = startRatio;
    this.setRatioProperty(this.displayedRatio);
    this.setTimeText(this.displayedRatio);

    // The goal line doesn't change mid-animation, so it's set once here, not per frame. Set
    // before the instant goal-reached check below, which overwrites it with "complete" when due.
    if (this.goalElement) {
      this.goalElement.textContent = `of ${Math.round(goal / 60)} min`;
    }

    if (startRatio >= 1) {
      this.applyGoalReachedState(true);
    }

    if (this.animationFrame === null) {
      this.animationFrame = window.requestAnimationFrame(this.renderFrame);
    }
  }

  private renderFrame = (): void => {
    this.displayedRatio += (this.targetRatio - this.displayedRatio) * FILL_EASING;
    const settled = Math.abs(this.targetRatio - this.displayedRatio) < SETTLE_THRESHOLD;
    if (settled) {
      this.displayedRatio = this.targetRatio;
    }

    this.setRatioProperty(this.displayedRatio);
    this.setTimeText(this.displayedRatio);
    this.checkGoalReached(this.displayedRatio);

    if (settled) {
      this.animationFrame = null;
      return;
    }

    this.animationFrame = window.requestAnimationFrame(this.renderFrame);
  };

  // Fires once per animation, the first time the fill reaches the goal.
  private checkGoalReached(ratio: number): void {
    if (this.goalReached || ratio < 1) {
      return;
    }
    this.applyGoalReachedState(false);
  }

  // Switches every goal-reached visual on. `instant` skips the animated transitions (used when
  // `animateProgress` starts already past the goal) and lands directly on their end state — see
  // the `celebration-instant` CSS utility these classes get paired with below.
  private applyGoalReachedState(instant: boolean): void {
    this.goalReached = true;
    this.celebration?.play(instant);

    const instantClass = this.prefixCss('celebration-instant');
    // `.celebration-instant *` (see _musoraringcelebration.scss) also zeroes every descendant's
    // animation, so adding it to popGroupElement alone covers track/fill/exceeded/dot for free.
    const instantTargets: Array<Element | null> = instant
      ? [
          this.popGroupElement,
          this.cardGoldElement,
          this.goldTrackElement,
          this.goldBlendElement,
          this.goldBlendMaskShapeElement,
          this.goalElement,
          this.timeElement,
        ]
      : [];
    instantTargets.forEach(el => el?.classList.add(instantClass));

    const fillCelebrating = this.prefixCss('daily-ring-fill-celebrating');
    this.trackElement?.classList.add(this.prefixCss('daily-ring-track-celebrating'));
    this.fillElement?.classList.add(fillCelebrating);
    this.dotElement?.classList.add(fillCelebrating);
    // One shared pop-scale animation on the group covers track/fill/exceeded/dot together,
    // instead of pasting the same scale keyframe onto each. The gold-blend mask shape can't join
    // this group (SVG <mask> content lives outside the visible tree), so it keeps its own copy.
    this.popGroupElement?.classList.add(fillCelebrating);
    this.goldBlendMaskShapeElement?.classList.add(fillCelebrating);
    this.goldBlendElement?.classList.add(this.prefixCss('daily-ring-gold-blend-playing'));
    // Figma's completed state decouples the layout: time recenters to the card's true middle
    // instead of sitting in a flex stack below the icon, which stays pinned near the top.
    this.contentElement?.classList.add(this.prefixCss('daily-ring-content-celebrating'));
    this.cardGoldElement?.classList.add(this.prefixCss('daily-ring-card-gold-playing'));
    this.goldTrackElement?.classList.add(this.prefixCss('daily-ring-gold-track-playing'));

    if (this.goalElement) {
      this.goalElement.classList.add(this.prefixCss('celebration-text-crossfade'));
      if (instant) {
        this.goalElement.textContent = 'complete';
      } else {
        window.setTimeout(() => {
          if (this.goalElement) {
            this.goalElement.textContent = 'complete';
          }
        }, TEXT_CROSSFADE_SWAP_AT_MS);
      }
    }
    // Figma (node 10542:40978): the time digits recolor white -> #4A3000 alongside the label's
    // own crossfade (to #6B4A10) — a different target color, so its own class, not a reuse.
    this.timeElement?.classList.add(this.prefixCss('daily-ring-time-celebrating'));
  }

  // Reverts everything `applyGoalReachedState` set, back to the non-achieved baseline.
  private resetCelebration(): void {
    this.goalReached = false;
    this.celebration?.reset();

    const fillCelebrating = this.prefixCss('daily-ring-fill-celebrating');
    this.trackElement?.classList.remove(this.prefixCss('daily-ring-track-celebrating'));
    this.fillElement?.classList.remove(fillCelebrating);
    this.dotElement?.classList.remove(fillCelebrating);
    this.popGroupElement?.classList.remove(fillCelebrating);
    this.goldBlendMaskShapeElement?.classList.remove(fillCelebrating);
    this.contentElement?.classList.remove(this.prefixCss('daily-ring-content-celebrating'));
    this.cardGoldElement?.classList.remove(this.prefixCss('daily-ring-card-gold-playing'));
    this.goldTrackElement?.classList.remove(this.prefixCss('daily-ring-gold-track-playing'));
    this.goldBlendElement?.classList.remove(this.prefixCss('daily-ring-gold-blend-playing'));
    this.goalElement?.classList.remove(this.prefixCss('celebration-text-crossfade'));
    this.timeElement?.classList.remove(this.prefixCss('daily-ring-time-celebrating'));

    const instantClass = this.prefixCss('celebration-instant');
    [
      this.popGroupElement,
      this.cardGoldElement,
      this.goldTrackElement,
      this.goldBlendElement,
      this.goldBlendMaskShapeElement,
      this.goalElement,
      this.timeElement,
    ].forEach(el => el?.classList.remove(instantClass));
  }

  // Counts up/down in step with the ring's own eased fill, same source value as the stroke.
  private setTimeText(ratio: number): void {
    if (this.timeElement) {
      this.timeElement.textContent = formatTime(ratio * this.goal);
    }
  }

  private setRatioProperty(ratio: number): void {
    const fillRatio = Math.min(ratio, 1);
    const exceededRatio = Math.max(ratio, 1);
    const exceededOpacity =
      ratio > GRADIENT_THRESHOLD
        ? Math.min(1, Math.max(0.7, (ratio - GRADIENT_THRESHOLD) / (1 - GRADIENT_THRESHOLD)))
        : 0;

    const element = this.getDomElement().get(0);
    if (!element) {
      return;
    }
    element.style.setProperty('--daily-ring-fill-ratio', fillRatio.toFixed(4));
    // -90 so 0deg lines up with 12 o'clock, matching the ring's own orientation.
    element.style.setProperty('--daily-ring-exceeded-rotation', `${(360 * exceededRatio - 90).toFixed(2)}deg`);
    element.style.setProperty('--daily-ring-exceeded-opacity', exceededOpacity.toFixed(3));
    // Raw (unclamped) ratio, like ProgressCircle.tsx's dot — keeps tracking the true head
    // position past a full loop instead of pinning to the fill's own 0-1 dash-offset range.
    element.style.setProperty('--daily-ring-dot-rotation', `${(360 * ratio - 90).toFixed(2)}deg`);
  }

  release(): void {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    super.release();
  }
}
