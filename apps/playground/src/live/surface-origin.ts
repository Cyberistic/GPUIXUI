/**
 * Reading a box a layout above it moved.
 *
 * `onLayout` reports an element after its first paint and again when its **size**
 * changes, not when it is moved: on 0.11.0 a box shifted 120 px by a padding
 * change delivered no layout at all while the pointer's own payload moved with
 * it. A surface that stores its box from the last report and subtracts a fresh
 * pointer point therefore reads the centre the surface *used to have* until
 * something resizes it.
 *
 * The candidate repair is a one-pixel probe at the surface's origin: alternating
 * its width on each pointer read makes the runtime lay it out again, and the
 * probe's own report carries the origin the surface has now. This fixture names
 * the ids, the distance and the arithmetic the `surface-origin` probe asserts,
 * so the premise is held without a window.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import type { Point } from "./frame.js";

/** The surface the probe reads, and the control that moves it. */
export const SURFACE_ORIGIN_PROBE = "surface-origin-probe";
export const SURFACE_ORIGIN_MOVE = "surface-origin-move";
export const SURFACE_ORIGIN_TARGET = "surface-origin-target";
export const SURFACE_ORIGIN_NUDGE = "surface-origin-nudge";
export const SURFACE_ORIGIN_READOUT = "surface-origin-readout";

/** How far the control opens above the surface: the move a report would miss. */
export const MOVED_BY = 120;

/** An origin in window coordinates. */
export interface SurfaceOrigin {
  readonly x: number;
  readonly y: number;
}

/** The point `point` is inside the box at `origin`, in that box's coordinates. */
export const localPoint = (origin: SurfaceOrigin, point: Point): Point => ({
  x: point.x - origin.x,
  y: point.y - origin.y,
});

/**
 * What the probe's readout publishes.
 *
 * Counts, the two origins and the last pointer point are the frame facts; the
 * local points are derived here so a probe cannot disagree with the arithmetic
 * the fixture's test holds.
 */
export class SurfaceReadout extends Schema.Class<SurfaceReadout>(
  "SurfaceReadout",
)({
  /** The padding above the surface, in points. */
  pad: Schema.Number,
  /** How many layout reports the surface itself delivered. */
  surface: Schema.Number,
  /** How many layout reports the one-pixel probe delivered. */
  probe: Schema.Number,
  /** The origin the probe last reported. */
  originX: Schema.Number,
  originY: Schema.Number,
  /** The last pointer point, in window coordinates. */
  pointX: Schema.Number,
  pointY: Schema.Number,
  /** The origin the surface last reported, which a move does not refresh. */
  reportedX: Schema.Number,
  reportedY: Schema.Number,
}) {}

/** One `key=value` token, `None` when the token names no key. */
const tokenOf = (
  token: string,
): Option.Option<{ readonly key: string; readonly value: string }> => {
  const at = token.indexOf("=");
  return at <= 0
    ? Option.none()
    : Option.some({
        key: token.slice(0, at),
        value: token.slice(at + 1),
      });
};

const finite = Schema.decodeUnknownOption(Schema.FiniteFromString);

/** The readout as a record of numbers, or `None` when a token is not one. */
export const decodeFields = (
  text: string,
): Option.Option<Record<string, number>> =>
  Option.map(
    Option.all(
      Arr.map(
        Arr.getSomes(Arr.map(text.trim().split(/\s+/), tokenOf)),
        (token) =>
          Option.map(
            finite(token.value),
            (value) => [token.key, value] as const,
          ),
      ),
    ),
    R.fromEntries,
  );

/** The readout a painted line names, decoded rather than compared. */
export const decodeReadout = (text: string): Option.Option<SurfaceReadout> =>
  Option.flatMap(decodeFields(text), (fields) =>
    Schema.decodeUnknownOption(SurfaceReadout)(fields),
  );
