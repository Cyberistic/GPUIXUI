/**
 * `@gpuixui/icons` — the icon set, its sizes and its accessibility rule.
 *
 * Icons are **data**: a 24x24 monochrome SVG markup string that GPUix's host
 * `<svg source>` element paints and tints with `style.color`. Nothing here
 * needs a theme, so the icon set is usable before the design system exists.
 */

export { Icon } from "./Icon.js";
export type { IconProps } from "./Icon.js";
export { ICON_NAMES } from "./names.js";
export type { IconName } from "./names.js";
export { icons } from "./registry.js";
export type { IconMarkup } from "./registry.js";
export { ICON_SIZES, iconPixels } from "./sizes.js";
export type { IconSize } from "./sizes.js";
