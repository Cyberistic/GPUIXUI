/**
 * The markup a generated line-art field hands `<svg source>`.
 *
 * `@gpuix/native@0.11.0` paints the markup as **one mask** in the element's
 * `style.color` (the `content-surfaces` probe), so every shape is stroked
 * plainly and the tint belongs to the element. And the `svg-pattern` probe
 * measured how the view box lands: the path is scaled by the element's **width
 * alone**, the view box clips its own overflow, and the content area is centred
 * rather than fitted, so the element does not clip a content area taller than
 * itself.
 *
 * A pattern field therefore generates its markup in a view box **the size of the
 * box it is given**, which makes the width scale exactly 1:1 on both axes and
 * leaves nothing for the centred content area to leak. That is why the fields
 * measure themselves before they generate.
 */

/** A box the runtime reported through `onLayout`. */
export interface PatternBox {
  readonly width: number;
  readonly height: number;
}

/**
 * One stroked path in a view box the size of `box`.
 *
 * `width`/`height` are written on the markup as well as the view box because the
 * probe's shapes did; the element's own `style` decides the painted size.
 */
export const svgPatternMarkup = (
  box: PatternBox,
  path: string,
  stroke: number,
): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}"><path d="${path}" fill="none" stroke="#000000" stroke-width="${stroke}"/></svg>`;

/** Whether a measured box can be drawn in at all. */
export const paintableBox = (box: PatternBox): boolean =>
  Number.isFinite(box.width) &&
  Number.isFinite(box.height) &&
  box.width > 0 &&
  box.height > 0;
