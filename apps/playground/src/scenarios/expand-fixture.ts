/**
 * The geometry the `virtual-list-expand` probe paints.
 *
 * Kept native-free (no `@gpuix/react`) so the probe's premise is testable on a
 * host with no binding: the probe asserts that the grown row leaves less than a
 * row of viewport below it, and that claim only holds for these numbers.
 * `expand-fixture.test.ts` guards them.
 */

/** Rows declared; far more than the viewport holds. */
export const ROWS = 200;
/** A collapsed row's height, in pixels. */
export const ROW = 32;
/** The detail block an expanded row adds. */
export const DETAIL = 88;
/** The row that expands. */
export const TARGET = 3;
/** Where a far reveal jumps once the row has grown. */
export const REVEAL = 150;
/** The list's viewport height, in pixels. */
export const VIEWPORT = 240;

/** The height row `index` paints while `open` says whether the detail is out. */
export const heightAt = (index: number, open: boolean): number =>
  index === TARGET && open ? ROW + DETAIL : ROW;

/** Viewport space left under the grown row and the rows above it. */
export const spaceBelowGrowth = (): number =>
  VIEWPORT - TARGET * ROW - (ROW + DETAIL);
