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

/**
 * Resolve a size name or a raw pixel count to the number of pixels to paint.
 *
 * A raw count is a number the caller measured (a collapsed panel's width, a row's
 * height), so it can be `NaN`, infinite, zero or negative. None of those is a
 * size the runtime can paint — a `NaN` inset draws nothing, which looks exactly
 * like a decorative icon — so an unusable count reads as the **`md` step**, the
 * size an `Icon` takes when it names none. A readable count stays the caller's
 * number, including a fraction.
 */
export const iconPixels = (size: IconSize | number): number =>
  typeof size === "number"
    ? Number.isFinite(size) && size > 0
      ? size
      : ICON_SIZES.md
    : ICON_SIZES[size];
