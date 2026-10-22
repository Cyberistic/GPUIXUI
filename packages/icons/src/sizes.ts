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

/** Resolve a size name or a raw pixel count to the number of pixels to paint. */
export const iconPixels = (size: IconSize | number): number =>
  typeof size === "number" ? size : ICON_SIZES[size];
