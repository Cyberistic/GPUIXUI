import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import type { Point } from "./frame.js";

export const SURFACE_ORIGIN_PROBE = "surface-origin-probe";
export const SURFACE_ORIGIN_MOVE = "surface-origin-move";
export const SURFACE_ORIGIN_TARGET = "surface-origin-target";
export const SURFACE_ORIGIN_NUDGE = "surface-origin-nudge";
export const SURFACE_ORIGIN_READOUT = "surface-origin-readout";

export const MOVED_BY = 120;

export interface SurfaceOrigin {
  readonly x: number;
  readonly y: number;
}

export const localPoint = (origin: SurfaceOrigin, point: Point): Point => ({
  x: point.x - origin.x,
  y: point.y - origin.y,
});

export class SurfaceReadout extends Schema.Class<SurfaceReadout>(
  "SurfaceReadout",
)({
  pad: Schema.Number,

  surface: Schema.Number,

  probe: Schema.Number,

  originX: Schema.Number,
  originY: Schema.Number,

  pointX: Schema.Number,
  pointY: Schema.Number,

  reportedX: Schema.Number,
  reportedY: Schema.Number,
}) {}

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

export const decodeReadout = (text: string): Option.Option<SurfaceReadout> =>
  Option.flatMap(decodeFields(text), (fields) =>
    Schema.decodeUnknownOption(SurfaceReadout)(fields),
  );
