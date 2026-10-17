/**
 * Icon sizes.
 *
 * A named size is a number of logical pixels on the 24x24 grid, so an icon at
 * `md` is exactly the height of a line of `md` text's cap box and lines up with
 * it. Pass a number only when the icon is not inline with text.
 */
export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

/** Resolve a size name or a raw pixel count to the number of pixels to paint. */
export const iconPixels = (size: IconSize | number): number =>
  typeof size === "number" ? size : ICON_SIZES[size];
