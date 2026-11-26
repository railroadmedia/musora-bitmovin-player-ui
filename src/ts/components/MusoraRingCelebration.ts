import { DOM } from '../DOM';

/**
 * Shared "goal achieved" celebration overlay for {@link MusoraDailyProgressRing} and
 * {@link MusoraWeeklyProgressRing} — gold medallion glow, confetti sparks, twinkling glints, and
 * an icon → checkmark swap, reused instead of hand-copying each Figma particle per ring.
 *
 * @category Containers
 */

// Pop + amplified glow on the ring's own fill (applied by the ring itself, not built here).
export const CELEBRATION_POP_DURATION_MS = 400;

const GOLD_DISC_SIZE_RATIO = 1.3;

const CHECKMARK_DELAY_MS = 120;

export const TEXT_CROSSFADE_DURATION_MS = 240;
export const TEXT_CROSSFADE_SWAP_AT_MS = 100;
export const COUNT_BOUNCE_DURATION_MS = 240;

// Figma's "Celebration / Sparks" (10542:40925): two interleaved rings of plain dots (not a
// single-color single-ring burst) — 12 bigger/farther-traveling dots, then 12 smaller/closer
// ones offset halfway between them and starting slightly later, each dot one of three colors.
// Distances/sizes are Figma's px at a 136px ring, scaled proportionally for other sizes.
interface ISparkWaveConfig {
  count: number;
  sizePx: number;
  travelRatio: number;
  angleOffsetDeg: number;
  delayOffsetMs: number;
}

const SPARK_WAVES: ISparkWaveConfig[] = [
  { count: 12, sizePx: 7, travelRatio: 50 / 136, angleOffsetDeg: 0, delayOffsetMs: 0 },
  { count: 12, sizePx: 4, travelRatio: 32 / 136, angleOffsetDeg: 15, delayOffsetMs: 20 },
];
const SPARK_COLORS = ['#FFAE00', '#FFD66B', '#FFFFFF'];

// Figma's "Gold glints" (10542:40983): 7 stars scattered at irregular points (not spaced evenly
// around a ring/spiral), each a different size, left/top given as % of the ring's own box so
// they scale with `size`. Values are each star's Figma center ÷ 136 (its reference ring size).
interface IGlintConfig {
  leftPercent: number;
  topPercent: number;
  sizePx: number;
}

const GLINT_CONFIGS: IGlintConfig[] = [
  { leftPercent: 83.88, topPercent: 19.49, sizePx: 13 },
  { leftPercent: 84.92, topPercent: 79.3, sizePx: 9 },
  { leftPercent: 11.34, topPercent: 74.15, sizePx: 11 },
  { leftPercent: 19.49, topPercent: 16.12, sizePx: 8 },
  { leftPercent: 32.35, topPercent: 36.76, sizePx: 10 },
  { leftPercent: 63.24, topPercent: 57.35, sizePx: 7 },
  { leftPercent: 42.08, topPercent: 94.9, sizePx: 7 },
];
const GLINT_START_DELAY_MS = 390;
const GLINT_STAGGER_MS = 110;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Generic checkmark tick, not tied to any platform asset.
const CHECKMARK_PATH = 'M4 12.5L9.5 18L20 6';

// Generic 4-point sparkle/glint shape.
const GLINT_PATH = 'M12 2L13.8 10.2L22 12L13.8 13.8L12 22L10.2 13.8L2 12L10.2 10.2Z';

export interface IMusoraRingCelebrationHandles {
  /**
   * Call once, when the ring first reaches its goal, to play the celebration. Pass `instant`
   * (default false) when the ring is mounting (or re-animating) already past its goal — this
   * lands directly on the celebrated end state instead of animating into it, and skips the
   * sparks/glints burst entirely, since a burst that's already finished has nothing to show.
   */
  play(instant?: boolean): void;
  /** Reverts to the pre-celebration state so a later {@link play} can run again. */
  reset(): void;
}

/**
 * Builds the celebration's static DOM (gold disc, sparks, glints, checkmark) inside `root`, all
 * at rest/hidden, and returns a handle to trigger it. `root` must be `position: relative`.
 *
 * `includeGoldDisc` (default true) builds a generic soft-glow medallion; pass `false` for a ring
 * that renders its own real illustrated glow asset instead, or the two double up.
 */
export function buildRingCelebration(
  root: HTMLElement,
  prefixCss: (cssClass: string) => string,
  size: number,
  iconElement: HTMLElement | null,
  includeGoldDisc = true,
): IMusoraRingCelebrationHandles {
  let goldDisc: DOM | null = null;
  if (includeGoldDisc) {
    const discSize = size * GOLD_DISC_SIZE_RATIO;
    goldDisc = new DOM('div', { class: prefixCss('celebration-gold-disc') }).css({
      height: `${discSize}px`,
      width: `${discSize}px`,
    });
    root.insertBefore(goldDisc.get(0)!, root.firstChild);
  }

  // The ring's own outer edge (stroke included) — sparks launch from here, not the center, so
  // the travel distance is entirely beyond the ring instead of partway still hidden under it.
  const sparkStartRadius = size / 2;
  const sparkContainer = new DOM('div', { class: prefixCss('celebration-sparks') });
  let sparkIndex = 0;
  for (const wave of SPARK_WAVES) {
    const travel = size * wave.travelRatio;
    // Figma fires every dot in a wave at once (no per-dot stagger within it) — only the two
    // waves themselves are offset from each other. A per-dot delay here reads as a spiral sweep
    // instead of a simultaneous ring burst.
    const delay = wave.delayOffsetMs;
    for (let i = 0; i < wave.count; i++) {
      const angle = (360 / wave.count) * i + wave.angleOffsetDeg;
      const color = SPARK_COLORS[sparkIndex % SPARK_COLORS.length];
      const rotator = new DOM('div', { class: prefixCss('celebration-spark-rotator') }).css({
        transform: `rotate(${angle}deg)`,
      });
      const spark = new DOM('div', { class: prefixCss('celebration-spark') });
      const sparkElement = spark.get(0);
      sparkElement?.style.setProperty('--celebration-spark-start', `${sparkStartRadius}px`);
      sparkElement?.style.setProperty('--celebration-spark-travel', `${travel}px`);
      sparkElement?.style.setProperty('--celebration-spark-delay', `${delay.toFixed(1)}ms`);
      sparkElement?.style.setProperty('--celebration-spark-size', `${wave.sizePx}px`);
      sparkElement?.style.setProperty('--celebration-spark-color', color);
      rotator.append(spark);
      sparkContainer.append(rotator);
      sparkIndex++;
    }
  }
  root.append(sparkContainer.get(0)!);

  const glintContainer = new DOM('div', { class: prefixCss('celebration-glints') });
  GLINT_CONFIGS.forEach((config, i) => {
    const delay = GLINT_START_DELAY_MS + GLINT_STAGGER_MS * i;
    const glintSize = (size / 136) * config.sizePx;
    const glint = new DOM('div', { class: prefixCss('celebration-glint') }).css({
      left: `${config.leftPercent}%`,
      top: `${config.topPercent}%`,
    });
    const glintElement = glint.get(0);
    glintElement?.style.setProperty('--celebration-glint-delay', `${delay}ms`);
    glintElement?.style.setProperty('--celebration-glint-size', `${glintSize.toFixed(1)}px`);
    glint.html(
      `<svg viewBox="0 0 24 24" xmlns="${SVG_NAMESPACE}"><path d="${GLINT_PATH}" fill="currentColor" /></svg>`,
    );
    glintContainer.append(glint);
  });
  root.append(glintContainer.get(0)!);

  // Nested inside the icon element (inset:0) so it lands exactly over the clock/calendar icon.
  const checkmark = new DOM('div', { class: prefixCss('celebration-checkmark') }).html(
    `<svg viewBox="0 0 24 24" xmlns="${SVG_NAMESPACE}">` +
      `<path d="${CHECKMARK_PATH}" fill="none" stroke="#4A3000" stroke-width="3" stroke-linecap="round" ` +
      `stroke-linejoin="round" pathLength="1" />` +
      '</svg>',
  );
  if (iconElement) {
    iconElement.appendChild(checkmark.get(0)!);
  }

  let played = false;
  let checkmarkTimeout: number | null = null;

  return {
    play(instant = false): void {
      if (played) {
        return;
      }
      played = true;

      if (instant) {
        // Forces every animation below to land on its end state immediately — see the
        // `celebration-instant` utility in _musoraringcelebration.scss.
        const instantClass = prefixCss('celebration-instant');
        goldDisc?.addClass(instantClass);
        iconElement?.querySelector('svg')?.classList.add(instantClass);
        checkmark.addClass(instantClass);
      } else {
        // A transient burst that ends back at 0 opacity — instant playback would look
        // identical to never playing it, so skip it outright instead.
        sparkContainer.addClass(prefixCss('celebration-playing'));
        glintContainer.addClass(prefixCss('celebration-playing'));
      }

      goldDisc?.addClass(prefixCss('celebration-gold-disc-playing'));
      // Fade the icon's own SVG, not iconElement — the checkmark is a child of iconElement,
      // so fading the container would fade the checkmark along with it.
      iconElement?.querySelector('svg')?.classList.add(prefixCss('celebration-icon-out'));

      if (instant) {
        checkmark.addClass(prefixCss('celebration-checkmark-playing'));
      } else {
        checkmarkTimeout = window.setTimeout(() => {
          checkmark.addClass(prefixCss('celebration-checkmark-playing'));
        }, CHECKMARK_DELAY_MS);
      }
    },

    reset(): void {
      if (checkmarkTimeout !== null) {
        window.clearTimeout(checkmarkTimeout);
        checkmarkTimeout = null;
      }
      played = false;

      const instantClass = prefixCss('celebration-instant');
      goldDisc?.removeClass(prefixCss('celebration-gold-disc-playing'));
      goldDisc?.removeClass(instantClass);
      sparkContainer.removeClass(prefixCss('celebration-playing'));
      glintContainer.removeClass(prefixCss('celebration-playing'));
      iconElement?.querySelector('svg')?.classList.remove(prefixCss('celebration-icon-out'));
      iconElement?.querySelector('svg')?.classList.remove(instantClass);
      checkmark.removeClass(prefixCss('celebration-checkmark-playing'));
      checkmark.removeClass(instantClass);
    },
  };
}
