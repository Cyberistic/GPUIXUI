/**
 * The box model (plan `835`).
 *
 * The bug being guarded: `padding` appears in 144 shipped call sites, `margin`
 * in 8 component sites (plus every separator inset and the slider thumb's
 * **negative** margins), and a percentage size in 29 — and no scenario in either
 * registry asserted one. A runtime that ignored padding, doubled a uniform
 * inset, refused a negative margin, collapsed vertical margins, or resolved a
 * percentage against the border box passed the whole suite.
 *
 * This module owns the arithmetic the scenario asserts — the content box, the
 * percentage basis, margin placement, the no-collapse rule and the runtime's
 * own `bounds` rectangle — so the view, the checks and the unit tests read one
 * rule.
 */
import * as Arr from "effect/Array";

/** The four insets a fixture declares. */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** A uniform inset on all four sides. */
export const allSides = (inset: number): Insets => ({
  top: inset,
  right: inset,
  bottom: inset,
  left: inset,
});

/**
 * A box as `getElementBounds` reports it.
 *
 * Measured in plan `835`: `x`/`y` are the **content origin** while `width`/
 * `height` are the **padding box** — the declared size includes padding and
 * excludes the border.
 */
export interface ReportedBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The content width a padded box leaves. */
export const contentWidth = (width: number, insets: Insets): number =>
  width - insets.left - insets.right;

/** The content height a padded box leaves. */
export const contentHeight = (height: number, insets: Insets): number =>
  height - insets.top - insets.bottom;

/** Where the content origin sits inside a painted box. */
export const contentOffset = (
  insets: Insets,
  border: number,
): { readonly x: number; readonly y: number } => ({
  x: insets.left + border,
  y: insets.top + border,
});

/**
 * The painted rectangle, recovered from a reported box.
 *
 * The reported size is already the padding box, so only the border is added
 * back; the padding moves the origin without changing the extent.
 */
export const paintedBox = (
  box: ReportedBox,
  insets: Insets,
  border: number,
): ReportedBox => ({
  x: box.x - insets.left - border,
  y: box.y - insets.top - border,
  width: box.width + border * 2,
  height: box.height + border * 2,
});

/** A percentage of a basis, in pixels. */
export const percentOf = (basis: number, percent: number): number =>
  (basis * percent) / 100;

/**
 * The left edge of each item in a flex row, from its width and **its own**
 * leading margin (negative margins pull the item back over its predecessor).
 */
export const marginRow = (
  widths: ReadonlyArray<number>,
  margins: ReadonlyArray<number>,
): ReadonlyArray<number> =>
  Arr.map(
    widths,
    (_width, index) =>
      (margins[index] ?? 0) +
      Arr.reduce(Arr.take(widths, index), 0, (sum, width) => sum + width) +
      Arr.reduce(Arr.take(margins, index), 0, (sum, margin) => sum + margin),
  );

/**
 * The next item's start in a flex column.
 *
 * Vertical margins do **not** collapse in the runtime's flex layout, so the two
 * margins add rather than being maxed.
 */
export const stackedStart = (
  previousEnd: number,
  marginBottom: number,
  marginTop: number,
): number => previousEnd + marginBottom + marginTop;

/**
 * The top offset `alignItems: "center"` gives a child.
 *
 * The runtime centres the child's **margin box**, so the leading margin moves
 * the child down by its full value. A margin box taller than the row clamps at
 * zero rather than going negative.
 */
export const centreOffset = (
  rowHeight: number,
  childHeight: number,
  marginTop: number,
  marginBottom: number,
): number =>
  Math.max(0, (rowHeight - childHeight - marginTop - marginBottom) / 2) +
  marginTop;

/** The cross size `stretch` leaves a child with vertical margins. */
export const stretchHeight = (
  rowHeight: number,
  marginTop: number,
  marginBottom: number,
): number => Math.max(0, rowHeight - marginTop - marginBottom);

/** The right edge a consumer computes from a reported box (`x + width`). */
export const reportedRight = (box: ReportedBox): number => box.x + box.width;

/** Whether two measured numbers agree within a device-independent tolerance. */
export const near = (
  measured: number,
  predicted: number,
  tolerance = 1,
): boolean => Math.abs(measured - predicted) <= tolerance;
