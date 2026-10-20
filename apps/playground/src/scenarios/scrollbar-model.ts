/**
 * The scroll affordance, as a rule (plan `801`).
 *
 * The pinned runtime reserves **no** gutter and paints **no** thumb (§2.2 of
 * the plan), so a scrollable container that shows a scroll position must paint
 * its own. This module owns the three rules such a thumb needs — where it sits,
 * how long it is, and what a press on the track asks for — so the scenario's
 * assertions and a consumer's `ScrollArea` share one source of truth.
 *
 * The sample geometry is here for the same reason: a trait that scans a
 * container's trailing strip must derive its points from the reported box, and
 * a hardcoded coordinate is the one mistake that makes both the "a thumb paints"
 * and "no thumb paints" checks pass.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels, type Smoke } from "@gpuixui/testing";

/** The shipping thumb's width: a classic scrollbar's, and what the probe paints. */
export const THUMB_WIDTH = 6;

/** The shortest a thumb gets, however long the content. */
export const MIN_THUMB = 24;

/** How far inside a container's trailing edge the strip sample sits. */
export const EDGE_INSET = 3;

/** How far inside the same edge the "this is content" neighbour sits. */
export const NEIGHBOUR_GAP = 20;

/** The five points along an edge that a thumb would break up. */
export const EDGE_STOPS: ReadonlyArray<number> = [0.1, 0.3, 0.5, 0.7, 0.9];

/** A thumb's box inside its track, in logical pixels. */
export interface ThumbBox {
  readonly start: number;
  readonly length: number;
}

/** A logical window point. */
export interface SamplePoint {
  readonly x: number;
  readonly y: number;
}

/** One trailing-edge sample and the content sample that must match it. */
export interface EdgePair {
  readonly edge: SamplePoint;
  readonly inner: SamplePoint;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Where the thumb sits for one scroll offset.
 *
 * `None` when the content fits: a thumb with nowhere to go is noise, and a
 * component must not paint one. `offset` is the runtime's own (zero or
 * negative); the length mirrors the classic `track² / content` rule with a
 * `MIN_THUMB` floor, clamped to the track so a tiny track cannot overshoot.
 */
export const thumbGeometry = (
  track: number,
  content: number,
  offset: number,
): Option.Option<ThumbBox> => {
  const maxOffset = content - track;
  if (track <= 0 || maxOffset <= 0) return Option.none();
  const floor = Math.min(MIN_THUMB, track);
  const length = clamp((track * track) / content, floor, track);
  const progress = clamp(-offset / maxOffset, 0, 1);
  return Option.some({ start: progress * (track - length), length });
};

/**
 * The scroll offset a press at `y` inside the track asks for.
 *
 * Always negative (the runtime's scroll offsets are) and clamped to the
 * content's maximum. A track with nothing to scroll asks for `0`.
 */
export const offsetForTrackPress = (
  track: number,
  content: number,
  y: number,
): number => {
  const maxOffset = content - track;
  if (track <= 0 || maxOffset <= 0) return 0;
  const offset = -clamp(y / track, 0, 1) * maxOffset;
  // `-0` is a real value here and would print as `offset=-0` in a readout.
  return offset === 0 ? 0 : offset;
};

/**
 * The five pairs along a container's trailing edge.
 *
 * `axis: "x"` reads a vertical scroller's right edge, `"y"` a horizontal
 * scroller's bottom edge. Both points come from the reported box, so the scan
 * follows a border, a padding step or a resized fixture without a magic number.
 */
export const edgePairs = (
  box: Smoke.Bounds,
  axis: "x" | "y",
): ReadonlyArray<EdgePair> =>
  EDGE_STOPS.map((stop) =>
    axis === "x"
      ? {
          edge: {
            x: box.x + box.width - EDGE_INSET,
            y: box.y + box.height * stop,
          },
          inner: {
            x: box.x + box.width - NEIGHBOUR_GAP,
            y: box.y + box.height * stop,
          },
        }
      : {
          edge: {
            x: box.x + box.width * stop,
            y: box.y + box.height - EDGE_INSET,
          },
          inner: {
            x: box.x + box.width * stop,
            y: box.y + box.height - NEIGHBOUR_GAP,
          },
        },
  );

/**
 * The first pair whose samples disagree, or `-1` when every pair agrees.
 *
 * The caller turns `-1` into a pass and the index into a failure that names the
 * stop: a thumb is the only thing that can make a flat child's strip differ from
 * its own interior.
 */
export const firstMismatch = (
  edge: ReadonlyArray<Pixels.Rgba>,
  inner: ReadonlyArray<Pixels.Rgba>,
  tolerance: number,
): number =>
  Option.match(
    Arr.findFirst(Arr.range(0, edge.length - 1), (index) => {
      const left = edge[index];
      const right = inner[index];
      return (
        left === undefined ||
        right === undefined ||
        !Pixels.rgbaNear(left, right, tolerance)
      );
    }),
    { onNone: () => -1, onSome: (index) => index },
  );
