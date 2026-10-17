/**
 * Colour arithmetic for interaction states.
 *
 * A filled control has to show hover and press feedback, and the theme gives
 * one colour per role, not four. Lifting the fill's alpha is how every design
 * system expresses that — `primary` at 90% over the surface reads as pressed
 * without a second palette entry.
 *
 * `TODO:` `@gpuixui/tokens` exports the same helper; delete this module and
 * import it once that package is in the tree.
 */

const clampByte = (value: number): number =>
  Math.max(0, Math.min(255, Math.round(value * 255)));

const isHex = (value: string): boolean =>
  /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value);

/**
 * Return `color` with the given alpha, as an 8-digit hex colour.
 *
 * A value that is not plain hex (a named colour, `rgb(...)`, a gradient) is
 * returned unchanged: GPUix would ignore a malformed colour, and silently
 * dropping the fill is worse feedback than a flat hover.
 */
export const alpha = (color: string, value: number): string => {
  if (!isHex(color)) return color;
  const alphaHex = clampByte(value).toString(16).padStart(2, "0").toUpperCase();
  return `${color.slice(0, 7)}${alphaHex}`;
};
