/**
 * The active slide index, which every carousel part reads from the root.
 *
 * A slide index is whole. A caller that computes `1.5` (or `NaN`) names no
 * slide: `index === active` then fails for every slide, so the track paints
 * nothing and a step adds to a fraction that still matches no slide. The rule is
 * shared with every indexed collection (`wholeIndex`): truncate a finite value,
 * start a non-finite one at the first slide, and report `0` for an empty track.
 */

import { wholeIndex } from "../internal/count.js";

export const slideIndex = (value: number, count: number): number =>
  wholeIndex(value, count);
