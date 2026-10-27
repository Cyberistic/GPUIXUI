/**
 * The rows a virtualized viewport shows, as opposed to the rows it mounts.
 *
 * `@gpuixui/data`'s window calculator answers the **mounted** window: the rows
 * in view plus the overdraw on either side. A drawing that painted every
 * mounted row as "in view" claimed four rows a reader cannot see above the
 * viewport's top edge. The two ranges are one subtraction apart, so this module
 * keeps the viewport's own intersection and both drawings read it.
 */

import {
  clampScrollOffset,
  rowCount,
  rowHeightOf,
  type VirtualWindow,
  type WindowSpec,
} from "@gpuixui/data/virtual/window";

/**
 * The rows whose painted box meets the viewport at a scroll offset.
 *
 * The offset is clamped into the set first, so a scroll past the end names the
 * last rows rather than a range beyond them. `start` is inclusive and `end`
 * exclusive, the convention the package's `VirtualWindow` uses.
 */
export const rowsInView = (
  spec: WindowSpec,
  scrollOffset: number,
): VirtualWindow => {
  const count = rowCount(spec.count);
  const height = rowHeightOf(spec.rowHeight);
  const top = clampScrollOffset(spec, scrollOffset);
  return {
    start: Math.min(count, Math.floor(top / height)),
    end: Math.min(count, Math.ceil((top + spec.viewportHeight) / height)),
  };
};

/** The line under a drawing: the rows in view, and the window that holds them. */
export const viewReadout = (
  spec: WindowSpec,
  scrollOffset: number,
  mounted: number,
): string => {
  const view = rowsInView(spec, scrollOffset);
  return `${view.start + 1}–${view.end} in view · ${mounted} mounted of ${rowCount(
    spec.count,
  )}`;
};
