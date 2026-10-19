/**
 * The runtime's reported box, and the box an element actually paints.
 *
 * Published `@gpuix/native@0.10.0` reports a **hybrid** for a plain `div`: the
 * origin is the content origin (inside the border and padding), while the size
 * excludes only the border. Measured on this host: a 100 × 36 element at
 * (12, 12) with `padding: 10` and `borderWidth: 1` reports
 * `{ x: 23, y: 23, width: 98, height: 34 }`, and a real pointer hits all 100 px
 * starting at (12, 12). A `Button` reports its border box (measured), which is
 * why a correction is never applied implicitly: a caller says which host it is
 * measuring (plan `597`).
 */

import * as P from "effect/Predicate";

/** A painted box in window pixels. */
export interface BoxBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One side's name, matching the runtime's style keys. */
type Side = "Top" | "Right" | "Bottom" | "Left";

/**
 * A finite number under `key`, read from an own property.
 *
 * Accepts any style object — a resolved `StyleDesc` or the runtime's authored
 * `Record<string, unknown>` — without an index-signature cast.
 */
const styleLength = (style: object, key: string): number => {
  const value: unknown = Object.getOwnPropertyDescriptor(style, key)?.value;
  return P.isNumber(value) && Number.isFinite(value) ? value : 0;
};

/**
 * One side's inset: the longhand when set, else the shorthand.
 *
 * The style vocabulary is numeric only (`padding`, `paddingTop`,
 * `borderWidth`, `borderTopWidth`, …), so a percentage cannot reach here
 * (`StyleDesc`, `@gpuix/native@0.10.0`).
 */
const inset = (style: object, specific: string, shorthand: string): number => {
  const longhand = Object.getOwnPropertyDescriptor(style, specific)?.value;
  return P.isNumber(longhand)
    ? styleLength(style, specific)
    : styleLength(style, shorthand);
};

/**
 * The box a host element paints, from the runtime's report and its style.
 *
 * The size adds the border back; the origin moves out by the border **and** the
 * padding, because the report already includes the padding in its size.
 */
export const paintedBox = (reported: BoxBounds, style: object): BoxBounds => {
  const side = (name: Side) => ({
    border: inset(style, `border${name}Width`, "borderWidth"),
    padding: inset(style, `padding${name}`, "padding"),
  });
  const top = side("Top");
  const right = side("Right");
  const bottom = side("Bottom");
  const left = side("Left");
  return {
    x: reported.x - left.border - left.padding,
    y: reported.y - top.border - top.padding,
    width: reported.width + left.border + right.border,
    height: reported.height + top.border + bottom.border,
  };
};

/**
 * A scroll container's visible box, from its reported box and scroll offset.
 *
 * The runtime reports a scroller from its **content origin**, so the report
 * slides by the offset as content moves (measured on the pinned release build:
 * a 552-high region at `y 91` reports `y -18` at offset `-109`) while its
 * painted viewport stays put. Its children already report painted positions, so
 * the subtraction applies to the scroller's own box only (plan `598`).
 */
export const viewportBox = (
  box: BoxBounds,
  offset: { readonly x: number; readonly y: number },
): BoxBounds => ({
  x: box.x - offset.x,
  y: box.y - offset.y,
  width: box.width,
  height: box.height,
});
