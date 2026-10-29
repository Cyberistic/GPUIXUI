/**
 * The geometry of the theme toggler's two-glyph crossover.
 *
 * The classic toggle is a sun whose rays retract while a moon's crescent grows.
 * GPUix has no `transform` and no clip-path, so neither the disc growing under
 * a bite nor a rotated ring is available; what it does publish is a tween over
 * `width`/`height`/`left`/`top`/`opacity`, which is the same geometry a scale
 * would paint. A glyph that leaves shrinks into the centre of the box while it
 * fades, and the one that arrives grows out of it — two stacked glyphs crossing
 * over on one button.
 */

import type { MotionStyle } from "@gpuix/react";

/** The share of its box the glyph that is leaving shrinks to. */
export const recededShare = 0.55;

/** The share of the flip the arriving glyph waits, so the two cross over. */
export const incomingDelayShare = 0.15;

/**
 * The frame one glyph paints: the whole box when it is shown, a centred
 * `recededShare` of it when it is not. `left`/`top` carry the centre, because a
 * width change alone would grow out of the top-left corner.
 */
export const glyphFrame = (box: number, shown: boolean): MotionStyle => {
  const side = shown ? box : box * recededShare;
  const inset = (box - side) / 2;
  return {
    width: side,
    height: side,
    left: inset,
    top: inset,
    opacity: shown ? 1 : 0,
  };
};
