import { Component, ComponentConfig } from './Component';
import { DOM } from '../DOM';
import { buildCelebrationSparks, IMusoraCelebrationSparksHandles } from './MusoraRingCelebration';
import { getAwardSparkColors } from './AwardSparkColors';

/**
 * Configuration interface for the {@link MusoraAwardFlip}.
 *
 * @category Configs
 */
export interface MusoraAwardFlipConfig extends ComponentConfig {
  /**
   * Reference box size, in px, used only to scale the landing spark burst's travel distance
   * (Figma's sparks are authored against a 136px box — see `MusoraRingCelebration.ts`). The
   * element's actual rendered size still comes from CSS (`_musorastandardendscreen.scss`'s
   * responsive `.award` sizing), not this value. Default: 136.
   */
  size?: number;
}

/** Image URLs (and brand) for one {@link MusoraAwardFlip.setAward} call. */
export interface IMusoraAwardFlipImages {
  /** The earned artwork — always required; shown statically if `unearned`/`back` are missing. */
  front: string;
  /** "Unearned"/locked face. Flip is skipped (front shows immediately) if this or `back` is missing. */
  unearned?: string;
  /** "Back" face — the brief mid-flip face. Flip is skipped (front shows immediately) if this or `unearned` is missing. */
  back?: string;
  /** Brand the award belongs to (e.g. `IEndScreen`'s `awardBrand`) — picks the landing spark burst's colors. */
  brand?: string;
}

declare const window: {
  setTimeout: (callback: () => void, ms: number) => number;
  clearTimeout: (handle: number) => void;
};

// Figma: Custom-Goals-On-The-End-Screens, node 10601:225 "Award (spin)". Tweak any of these to
// retime the flip; nothing else in this file hardcodes a duration.

// Phase 1: the locked ("unearned") face collapses away.
export const AWARD_FLIP_UNEARNED_EXIT_MS = 545;
// Phase 2: the "back" face bulges in and back out — a brief peek, not a face that holds.
export const AWARD_FLIP_BACK_PEEK_MS = 330;
// Phase 3: the earned ("front") face expands in.
export const AWARD_FLIP_FRONT_ENTER_MS = 545;
// Phase 4: pop-scale once the front face has fully landed.
export const AWARD_FLIP_LANDING_POP_DURATION_MS = 440;

/**
 * Plays the "locked -> back -> unearned" award-reveal flip (Figma: Custom-Goals-On-The-End-Screens,
 * node 10601:225). Three faces — unearned, back, front — stacked in the same box and swapped via a
 * 2D card-flip (scaleX squash), the same technique as {@link MusoraEndScreenProgressRings}'s ring
 * flip, generalized to three faces instead of two.
 *
 * Reuses the existing `award` CSS class as its root so it drops into
 * `MusoraAwardEndScreenItem`'s layout with no sizing changes — see `_musorastandardendscreen.scss`.
 *
 * On landing, bursts the same sparks {@link MusoraDailyProgressRing}/{@link MusoraWeeklyProgressRing}
 * use on goal-reached (see `MusoraRingCelebration.ts`), colored by the award's brand instead of the
 * rings' fixed gold (see `AwardSparkColors.ts`).
 *
 * @category Containers
 */
export class MusoraAwardFlip extends Component<MusoraAwardFlipConfig> {
  private readonly size: number;
  private unearnedFaceElement: HTMLElement | null = null;
  private backFaceElement: HTMLElement | null = null;
  private frontFaceElement: HTMLElement | null = null;
  private rootElement: HTMLElement | null = null;
  private sparks: IMusoraCelebrationSparksHandles | null = null;
  private sequenceTimers: number[] = [];
  private flipCapable = false;

  constructor(config: MusoraAwardFlipConfig = {}) {
    super(config);

    this.config = this.mergeConfig(
      config,
      {
        cssClass: 'award',
        size: 136,
      } as MusoraAwardFlipConfig,
      this.config,
    );
    this.size = this.config.size;
  }

  protected toDomElement(): DOM {
    const element = super.toDomElement();

    const rootStyle = element.get(0)?.style;
    rootStyle?.setProperty('--award-flip-unearned-exit-duration', `${AWARD_FLIP_UNEARNED_EXIT_MS}ms`);
    rootStyle?.setProperty('--award-flip-back-peek-duration', `${AWARD_FLIP_BACK_PEEK_MS}ms`);
    rootStyle?.setProperty('--award-flip-front-enter-duration', `${AWARD_FLIP_FRONT_ENTER_MS}ms`);
    rootStyle?.setProperty('--award-flip-landing-pop-duration', `${AWARD_FLIP_LANDING_POP_DURATION_MS}ms`);

    const unearnedFace = new DOM('div', { class: this.prefixCss('award-flip-face') }).addClass(
      this.prefixCss('award-flip-face-unearned'),
    );
    const backFace = new DOM('div', { class: this.prefixCss('award-flip-face') }).addClass(
      this.prefixCss('award-flip-face-back'),
    );
    const frontFace = new DOM('div', { class: this.prefixCss('award-flip-face') }).addClass(
      this.prefixCss('award-flip-face-front'),
    );

    element.append(unearnedFace);
    element.append(backFace);
    element.append(frontFace);

    this.unearnedFaceElement = unearnedFace.get(0) ?? null;
    this.backFaceElement = backFace.get(0) ?? null;
    this.frontFaceElement = frontFace.get(0) ?? null;
    this.rootElement = element.get(0) ?? null;

    return element;
  }

  /**
   * Sets the award artwork and lands on the resting baseline: the locked face if `unearned` and
   * `back` are both present (ready for a later {@link playFlip}), or the earned face directly if
   * either is missing — matching the old static (non-flip) behavior for that case.
   */
  setAward(images: IMusoraAwardFlipImages): void {
    this.clearSequenceTimers();
    this.resetFlipState();
    this.rebuildSparks(images.brand);

    this.flipCapable = !!images.unearned && !!images.back;

    if (this.frontFaceElement) {
      this.frontFaceElement.style.backgroundImage = `url(${images.front})`;
    }

    if (!this.flipCapable) {
      // No locked/back art to flip through — show the earned face immediately, same as the
      // pre-flip static `background-image` rendering.
      this.frontFaceElement?.classList.add(this.prefixCss('award-flip-face-visible'));
      return;
    }

    if (this.unearnedFaceElement) {
      this.unearnedFaceElement.style.backgroundImage = `url(${images.unearned})`;
    }
    if (this.backFaceElement) {
      this.backFaceElement.style.backgroundImage = `url(${images.back})`;
    }
    this.unearnedFaceElement?.classList.add(this.prefixCss('award-flip-face-visible'));
  }

  // Sparks bake their color into static per-dot CSS custom properties at build time (see
  // MusoraRingCelebration's buildCelebrationSparks), so a brand change needs a fresh build, not a
  // re-color — rebuilt on every setAward() rather than once in toDomElement(), where the brand
  // isn't known yet.
  private rebuildSparks(brand: string | undefined): void {
    const existing = this.rootElement?.querySelector(`.${this.prefixCss('celebration-sparks')}`);
    existing?.remove();
    if (this.rootElement) {
      this.sparks = buildCelebrationSparks(
        this.rootElement,
        cls => this.prefixCss(cls),
        this.size,
        getAwardSparkColors(brand),
      );
    }
  }

  /** Plays the flip. No-op if the last {@link setAward} call didn't supply both `unearned` and `back`. */
  playFlip(): void {
    if (!this.flipCapable) {
      return;
    }
    this.clearSequenceTimers();

    const visibleClass = this.prefixCss('award-flip-face-visible');
    const exitingClass = this.prefixCss('award-flip-face-exiting');
    const peekingClass = this.prefixCss('award-flip-face-peeking');
    const enteringClass = this.prefixCss('award-flip-face-entering');
    const landedClass = this.prefixCss('award-flip-landed');

    // Phase 1: unearned collapses away.
    this.unearnedFaceElement?.classList.add(exitingClass);

    // Phase 2: back bulges in and back out.
    this.schedule(AWARD_FLIP_UNEARNED_EXIT_MS, () => {
      this.unearnedFaceElement?.classList.remove(visibleClass, exitingClass);
      this.backFaceElement?.classList.add(visibleClass, peekingClass);
    });

    // Phase 3: front expands in.
    this.schedule(AWARD_FLIP_UNEARNED_EXIT_MS + AWARD_FLIP_BACK_PEEK_MS, () => {
      this.backFaceElement?.classList.remove(visibleClass, peekingClass);
      this.frontFaceElement?.classList.add(visibleClass, enteringClass);
    });

    // Phase 4: landing pop + spark burst.
    this.schedule(AWARD_FLIP_UNEARNED_EXIT_MS + AWARD_FLIP_BACK_PEEK_MS + AWARD_FLIP_FRONT_ENTER_MS, () => {
      this.frontFaceElement?.classList.remove(enteringClass);
      this.rootElement?.classList.add(landedClass);
      this.sparks?.play();
    });
  }

  private resetFlipState(): void {
    const visibleClass = this.prefixCss('award-flip-face-visible');
    [this.unearnedFaceElement, this.backFaceElement, this.frontFaceElement].forEach(el => {
      el?.classList.remove(
        visibleClass,
        this.prefixCss('award-flip-face-exiting'),
        this.prefixCss('award-flip-face-peeking'),
        this.prefixCss('award-flip-face-entering'),
      );
    });
    this.rootElement?.classList.remove(this.prefixCss('award-flip-landed'));
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
    super.release();
  }
}
