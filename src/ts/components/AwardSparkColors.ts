/**
 * Per-brand spark-burst palettes for {@link MusoraAwardFlip}'s landing celebration (Figma:
 * Custom-Goals-On-The-End-Screens, node 10601:160 "Celebration / Sparks"). Figma's own example
 * (Pianote) bursts in that brand's red, not the generic gold `MusoraRingCelebration` uses — each
 * brand gets its own [primary, secondary, white] triple, as given by design (not derived from
 * MusoraApp's AppStyle.ts brand colors, which use different shades for this purpose).
 */
export enum AwardBrand {
  Drumeo = 'drumeo',
  Pianote = 'pianote',
  Guitareo = 'guitareo',
  Singeo = 'singeo',
  Playbass = 'playbass',
}

const AWARD_SPARK_COLORS_BY_BRAND: Record<AwardBrand, string[]> = {
  [AwardBrand.Drumeo]: ['#3B81D1', '#6EBEFF', '#FFFFFF'],
  [AwardBrand.Pianote]: ['#F61A30', '#FF7A86', '#FFFFFF'],
  [AwardBrand.Guitareo]: ['#04A588', '#8CFAF0', '#FFFFFF'],
  [AwardBrand.Singeo]: ['#8300E9', '#D28CFF', '#FFFFFF'],
  [AwardBrand.Playbass]: ['#96B414', '#D2E66E', '#FFFFFF'],
};

// MusoraRingCelebration's own gold — used when the brand is missing or unrecognized.
const DEFAULT_SPARK_COLORS = ['#FFAE00', '#FFD66B', '#FFFFFF'];

/** Looks up the spark palette for `brand` (e.g. `IEndScreen`'s `awardBrand`), falling back to gold. */
export function getAwardSparkColors(brand?: string | null): string[] {
  if (brand && (Object.values(AwardBrand) as string[]).includes(brand)) {
    return AWARD_SPARK_COLORS_BY_BRAND[brand as AwardBrand];
  }
  return DEFAULT_SPARK_COLORS;
}
