/**
 * What a `boxShadow` paints in a window.
 *
 * Every raised surface in the library — a card, a popover, a menu, a dialog —
 * separates itself from the page with the theme's `elevation` level, and no probe
 * had painted one: the capability record called `boxShadow`, `inset` included,
 * supported because `StyleDesc` declares it, and the token package's own report
 * claims an unparseable shadow colour paints nothing at all. Both are claims
 * about paint, and a window reports no style.
 *
 * The fixture asks for one property per box, with opaque colours so a sample is
 * either the shadow's own bytes or the page's — a blurred shadow is the only
 * shape that needs a magnitude, and `distanceFrom` gives it one.
 *
 * Geometry is shared between the view and the reads: a sample sits at a fixed
 * number of points outside an edge, so a box that moved would fail the read
 * rather than silently sample the page.
 */

/** Where the window's checks read the fixture. */
export const ELEVATION_IDS = {
  offset: "elevation-offset",
  blur: "elevation-blur",
  spread: "elevation-spread",
  inset: "elevation-inset",
  outset: "elevation-outset",
  stacked: "elevation-stacked",
  unreadable: "elevation-unreadable",
  resting: "elevation-resting",
  deepest: "elevation-deepest",
} as const;

/** The shadow's own colour: no role paints it, so a sample says "a shadow". */
export const ELEVATION_SHADOW = "#FF3B30";

/** The second entry of a stacked shadow, so each entry is told apart. */
export const ELEVATION_SECOND = "#0A84FF";

/** The fill a raised box paints, chosen to differ from both shadow colours. */
export const ELEVATION_FILL = "#E7E9EE";

/** Every measured box, so the fixture and the readouts agree on one size. */
export const ELEVATION_WIDTH = 120;
export const ELEVATION_HEIGHT = 48;

/**
 * The height each row reserves. A box sits at its row's top and the farthest
 * sample is `ELEVATION_FAR` below it, so the row must be tall enough to hold
 * that point: a sample past the row would land on the next one's box and read
 * its fill as shade.
 */
export const ELEVATION_ROW = 130;

/** The downward offset a shadow is asked for, and the band it therefore paints. */
export const ELEVATION_OFFSET = 16;

/** The blur one box asks for, and the spread another does. */
export const ELEVATION_BLUR = 24;
export const ELEVATION_SPREAD = 8;

/** A point inside a painted band: past an edge or past a box's own border. */
export const ELEVATION_INSIDE = 4;

/** A point in the middle of the offsetting shadow's band, clear of an edge. */
export const ELEVATION_NEAR = 8;

/**
 * A point past every shadow's reach: the deepest shipped level's blur ends well
 * inside it, so a sample there is the page unless the shadow escapes its level.
 */
export const ELEVATION_FAR = 48;

/** Where the two blurred samples sit, near the box and further down its falloff. */
export const ELEVATION_FADE_NEAR = 4;
export const ELEVATION_FADE_MID = 16;

/** How far below a raised box its level is compared with the resting one. */
export const ELEVATION_DEPTH = 20;

/**
 * The size the shipped levels are measured on: a menu or a card, not the 120×48
 * probe box, because a blur whose radius exceeds the box's own height paints a
 * fainter edge than the same level paints on a surface an app would raise.
 */
export const ELEVATION_RAISED = { width: 220, height: 120 } as const;

/** A colour string the runtime's parser cannot read. */
export const ELEVATION_UNREADABLE = "notacolour";

/** A painted box, as the runtime's layout report gives it. */
export interface ShadowBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The sample points a side-painted shadow is read at, each `distance` out. */
export const aroundBox = (
  box: ShadowBox,
  distance: number,
): {
  readonly above: number;
  readonly below: number;
  readonly left: number;
  readonly middleY: number;
  readonly middleX: number;
  readonly right: number;
} => ({
  above: box.y - distance,
  below: box.y + box.height + distance,
  left: box.x - distance,
  right: box.x + box.width + distance,
  middleX: box.x + box.width / 2,
  middleY: box.y + box.height / 2,
});
