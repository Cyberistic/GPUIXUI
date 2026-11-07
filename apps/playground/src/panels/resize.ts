import { Match } from "effect";
import * as Number from "effect/Number";
import * as Schema from "effect/Schema";

export interface ResizeInput {
  readonly start: number;
  readonly pointerDelta: number;
  readonly min: number;
  readonly max: number;
}

export const nextSize = ({
  start,
  pointerDelta,
  min,
  max,
}: ResizeInput): number =>
  Number.clamp({ minimum: min, maximum: max })(start + pointerDelta);

export const resizeKeys = ["left", "right", "home", "end"] as const;

export const ResizeKey = Schema.Literals(resizeKeys);

export type ResizeKey = typeof ResizeKey.Type;

export const isResizeKey = Schema.is(ResizeKey);

export interface KeyResizeInput {
  readonly size: number;
  readonly key: ResizeKey;

  readonly step: number;
  readonly min: number;
  readonly max: number;
}

export const keySize = ({
  size,
  key,
  step,
  min,
  max,
}: KeyResizeInput): number =>
  Match.value(key).pipe(
    Match.when("left", () =>
      nextSize({ start: size, pointerDelta: -step, min, max }),
    ),
    Match.when("right", () =>
      nextSize({ start: size, pointerDelta: step, min, max }),
    ),
    Match.when("home", () => min),
    Match.when("end", () => max),
    Match.exhaustive,
  );
