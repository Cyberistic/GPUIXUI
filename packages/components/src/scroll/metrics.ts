/**
 * Where a scroll box is, and what its edges owe the reader.
 *
 * `ScrollProgress` and `ScrollFade` are two readings of one measurement: the
 * runtime reports the clamped absolute offset (`onScrollChange`), and both the
 * viewport and its content report their painted box (`onLayout`). The height a
 * scroller holds is the content's border box, not the offset — `0.11.0` exposes
 * no `scrollHeight` — so the pair is the only source for "how much is left".
 *
 * Everything here is pure and sanitised. A missing measurement arrives as `0`
 * (nothing is scrollable yet), a non-finite one is ignored rather than reaching
 * the runtime as `NaN`, and an offset past either end clamps to the fraction the
 * reader can actually see.
 */

import type { LinearGradientBackground } from "@gpuix/react";
import * as Option from "effect/Option";

/** The three numbers one scroll box reports. */
export interface ScrollSample {
  /** The clamped absolute offset: `0` at the start, negative as it scrolls. */
  readonly offsetY: number;
  /** The scroller's own painted height. */
  readonly viewportHeight: number;
  /** The full height of what sits inside it. */
  readonly contentHeight: number;
}

/** What a scroll box's position means for a bar, a pair of edges and a pinned header. */
export interface ScrollMetrics {
  /** How far through the content the reader is, `0` to `1`. */
  readonly progress: number;
  /** The clamped absolute offset: `0` at the start, negative as it scrolls. */
  readonly offsetY: number;
  /** Whether the content is taller than the box, i.e. there is anywhere to go. */
  readonly scrollable: boolean;
  /** Whether the reader is at the top (or there is nothing to scroll). */
  readonly atStart: boolean;
  /** Whether the reader is at the bottom (or there is nothing to scroll). */
  readonly atEnd: boolean;
}

/** The two edges an overlay can sit on. */
export type ScrollEdge = "top" | "bottom";

/**
 * A finite number, or the fallback.
 *
 * A component's first frame has measured nothing yet, and a caller can hand a
 * `NaN` through a computed size. Neither may become a style value.
 */
const finite = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/** The position of a scroll box, clamped to the travel it actually has. */
export const scrollMetrics = (sample: ScrollSample): ScrollMetrics => {
  const viewport = Math.max(0, finite(sample.viewportHeight, 0));
  const content = Math.max(0, finite(sample.contentHeight, 0));
  const offset = Math.min(0, finite(sample.offsetY, 0));
  const overflow = Math.max(0, content - viewport);
  // A one-pixel difference is rounding between a border box and its content,
  // not a scroll a reader could perform.
  const scrollable = overflow > 1;
  const travelled = scrollable ? Math.max(0, Math.min(overflow, -offset)) : 0;

  return {
    progress: scrollable ? travelled / overflow : 0,
    // `-0` is not the start: a header positioned from it would read as a scroll.
    offsetY: travelled === 0 ? 0 : -travelled,
    scrollable,
    atStart: !scrollable || -offset <= 1,
    atEnd: !scrollable || -offset >= overflow - 1,
  };
};

/** The solid and clear stops of an edge fade, resolved from the theme's role. */
export interface EdgeFadeColors {
  /** The surface the fade settles into, opaque at the edge. */
  readonly solid: string;
  /** The same colour with no alpha, where the content shows through. */
  readonly clear: string;
}

/**
 * A two-stop gradient that hides the content under an edge.
 *
 * `0.11.0`'s `LinearGradientBackground` takes exactly two stops and a CSS
 * angle: `180` runs from the top down, `0` from the bottom up, so the opaque
 * stop sits on the edge the fade belongs to in both directions.
 */
export const edgeGradient = (
  edge: ScrollEdge,
  colors: EdgeFadeColors,
): LinearGradientBackground => ({
  type: "linear-gradient",
  angle: edge === "top" ? 180 : 0,
  stops: [
    { color: colors.solid, position: 0 },
    { color: colors.clear, position: 1 },
  ],
});

/** A positive pixel size, or the fallback, for an edge or a bar. */
export const scrollSize = (
  value: Option.Option<number>,
  fallback: number,
): number =>
  Option.match(value, {
    onNone: () => fallback,
    onSome: (size) =>
      Number.isFinite(size) && size > 0 ? Math.round(size) : fallback,
  });
