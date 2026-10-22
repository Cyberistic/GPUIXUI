/**
 * What `StyleDesc.opacity` paints.
 *
 * The capability record calls opacity supported because the field exists, and
 * two contracts in the library already composite through it: the disabled fade
 * (`disabledFadePairs` reasons about a control at a share of its own opacity) and
 * the skeleton's pulse. Nothing had measured the paint. Three questions a
 * component needs answered are not in the typings: is a box's fill mixed with the
 * page at the share it asks for, does the share reach the subtree a parent holds
 * (a disabled field's label is a child), and does a shadow under the box fade
 * with it or stay at full strength.
 *
 * The probe asks for one share per box, with opaque colours so a sample is
 * either a named end of the blend or a mix of them. The measured mix is the
 * fill's channel and the page's added at the share (a half box reads
 * `136,39,37` from a `255,59,48` fill on a `17,20,26` page), within the byte the
 * frame's own rounding costs — so the checks are that mix plus the orderings a
 * fade owes: a quarter is nearer the page, zero is the page and a share above
 * one is the fill.
 */

/** Where the window's checks read the fixture. */
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

/** The fill every measured box paints, and the ink a child paints over it. */
export const OPACITY_FILL = "#FF3B30";
export const OPACITY_INK = "#FFD60A";

/** The box every measurement is made against. */
export const OPACITY_WIDTH = 120;
export const OPACITY_HEIGHT = 48;

/** The shares the boxes ask for. */
export const OPACITY_HALF = 0.5;
export const OPACITY_QUARTER = 0.25;
export const OPACITY_ABOVE_ONE = 1.5;

/** The shadow the faded box carries: no role paints it. */
export const OPACITY_SHADOW = "#0A84FF";

/** The shadow's downward offset, so a sample clears the box's own edge. */
export const OPACITY_SHADOW_OFFSET = 16;

/** Where a shadow sample sits below the faded box it belongs to. */
export const OPACITY_SHADOW_SAMPLE = 8;

/** One colour's channels. */
export interface Channels {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** The colour a fill and a page add to at `share`, before the frame rounds it. */
export const mixedAt = (
  fill: Channels,
  page: Channels,
  share: number,
): Channels => ({
  r: fill.r * share + page.r * (1 - share),
  g: fill.g * share + page.g * (1 - share),
  b: fill.b * share + page.b * (1 - share),
});

/**
 * Whether a sample is the mix `mixedAt` describes, within `tolerance` bytes.
 *
 * A byte of slack on purpose: a frame stores one, and the runtime's own
 * conversion from its working value rounds some channels and truncates others
 * (a quarter box's green lands on `30` where the sum is `29.75`).
 */
export const withinBytes = (
  sample: Channels,
  mixed: Channels,
  tolerance = 1,
): boolean =>
  Math.abs(sample.r - mixed.r) <= tolerance &&
  Math.abs(sample.g - mixed.g) <= tolerance &&
  Math.abs(sample.b - mixed.b) <= tolerance;
