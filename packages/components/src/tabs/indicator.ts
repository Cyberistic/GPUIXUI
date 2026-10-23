/**
 * Where the shared selected surface sits inside the rail.
 *
 * The pill is one element for the whole tab set, not a background on each
 * trigger, so its box comes from measurement: the rail reports the origin of the
 * box its absolute children resolve against, each trigger reports its painted
 * border box, and this module turns the pair into the pill's offsets.
 *
 * Taking the origin from the runtime rather than from the rail's box is the
 * point: an absolute child resolves against the rail's padding box, so
 * subtracting the rail's border box would leave the pill short by the border
 * width. Measured 2026-10-21 in the behaviour suite: with the rail's 1px border
 * and 4px padding, a `left: 0, top: 0` child paints 1px inside the rail box, and
 * the probe's box plus this delta lands the pill exactly on the trigger.
 *
 * The two boxes are window coordinates, so they must come from the same paint:
 * a rail the window moved is subtracted at its new place, not the one it was
 * measured at when the tab set mounted. The probe therefore fills the padding
 * box rather than sitting in its corner — the runtime reports a layout whose box
 * it can see change, so a rail that resizes (and re-measures its triggers)
 * reports the origin again in that same round.
 *
 * The payload decoder is the seam's (`internal/measure.ts`), not a copy: a box
 * the runtime cannot paint is refused there for every measuring surface, and the
 * tab pill was the one reader a second decoder would have left behind.
 */

import type { MeasuredBox } from "../internal/measure.js";

/** A border box in window coordinates, as an `onLayout` event reports it. */
export type TabBox = MeasuredBox;

/** The pill's offsets inside the rail's containing block. */
export interface IndicatorBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The box an `onLayout` event carries, `None` for any other event or a payload
 * missing or unable to carry one of the four numbers.
 */
export { measuredBox } from "../internal/measure.js";

/**
 * The pill's box: the selected trigger's painted box, re-expressed against the
 * origin its absolute children start from. Both arguments are window boxes taken
 * from the same paint, so the subtraction is exact.
 */
export const indicatorBox = (
  origin: TabBox,
  selected: TabBox,
): IndicatorBox => ({
  left: selected.x - origin.x,
  top: selected.y - origin.y,
  width: selected.width,
  height: selected.height,
});
