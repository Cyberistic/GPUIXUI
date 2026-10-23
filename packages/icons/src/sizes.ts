import * as Arr from "effect/Array";
import * as R from "effect/Record";
import { iconSize } from "@gpuixui/tokens";

/**
 * Icon sizes.
 *
 * The scale is `@gpuixui/tokens`' `iconSize`: a named size is a
 * number of logical pixels on the 24x24 grid, so an icon at `md` is exactly the
 * height of a line of `md` text's cap box and lines up with it. Pass a number
 * only when the icon is not inline with text.
 */
export const ICON_SIZES = iconSize;

export type IconSize = keyof typeof ICON_SIZES;

/** The scale's names, as a list a decoded value can be checked against. */
const ICON_STEPS: ReadonlyArray<string> = R.keys(ICON_SIZES);

/** Whether a value names a step of the scale. */
const isIconSize = (size: unknown): size is IconSize =>
  typeof size === "string" && Arr.contains(ICON_STEPS, size);

/**
 * Resolve a size name or a raw pixel count to the number of pixels to paint.
 *
 * A raw count is a number the caller measured (a collapsed panel's width, a row's
 * height), so it can be `NaN`, infinite, zero or negative. None of those is a
 * size the runtime can paint — a `NaN` inset draws nothing, which looks exactly
 * like a decorative icon — so an unusable count reads as the **`md` step**, the
 * size an `Icon` takes when it names none. A readable count stays the caller's
 * number, including a fraction.
 *
 * A **name the scale does not carry** is the same absence from the other side:
 * `size` is often a stored preference, so a name from a release that renamed or
 * dropped a step arrives as an untrusted string. The lookup answered `undefined`
 * and the caller wrote it to `style.width`/`style.height`; measured on 0.11.0, a
 * sized icon with no side paints a full-width, zero-height box, so a toolbar row
 * around a vanished glyph stretched across the window. An unknown name reads as
 * the `md` step too, and the input is `unknown` because that is what a decoded
 * preference is.
 */
export const iconPixels = (size: unknown): number => {
  if (typeof size === "number") {
    return Number.isFinite(size) && size > 0 ? size : ICON_SIZES.md;
  }
  return isIconSize(size) ? ICON_SIZES[size] : ICON_SIZES.md;
};
