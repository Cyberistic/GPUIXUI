export const OPACITY_IDS = {
  full: "opacity-full",
  half: "opacity-half",
  quarter: "opacity-quarter",
  hidden: "opacity-hidden",
  clamped: "opacity-clamped",
  exactParent: "opacity-exact-parent",
  exactInk: "opacity-exact-ink",
  fadedParent: "opacity-faded-parent",
  fadedInk: "opacity-faded-ink",
  shadow: "opacity-shadow",
} as const;

export const OPACITY_FILL = "#FF3B30";
export const OPACITY_INK = "#FFD60A";

export const OPACITY_WIDTH = 120;
export const OPACITY_HEIGHT = 48;

export const OPACITY_HALF = 0.5;
export const OPACITY_QUARTER = 0.25;
export const OPACITY_ABOVE_ONE = 1.5;

export const OPACITY_SHADOW = "#0A84FF";

export const OPACITY_SHADOW_OFFSET = 16;

export const OPACITY_SHADOW_SAMPLE = 8;

export interface Channels {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export const mixedAt = (
  fill: Channels,
  page: Channels,
  share: number,
): Channels => ({
  r: fill.r * share + page.r * (1 - share),
  g: fill.g * share + page.g * (1 - share),
  b: fill.b * share + page.b * (1 - share),
});

export const withinBytes = (
  sample: Channels,
  mixed: Channels,
  tolerance = 1,
): boolean =>
  Math.abs(sample.r - mixed.r) <= tolerance &&
  Math.abs(sample.g - mixed.g) <= tolerance &&
  Math.abs(sample.b - mixed.b) <= tolerance;
