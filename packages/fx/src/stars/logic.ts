import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { paintable, seededUnit, tenth } from "@gpuixui/components/authoring";

export const starCount = 48;

export const starCountCap = 200;

export const starMinSize = 1;
export const starMaxSize = 3;

export const starTwinkleMs = 2_400;

export const starTwinkleFloor = 320;

export const starTwinkleCap = 20_000;

const durationFloorShare = 0.7;
const durationCeilingShare = 1.3;

const delayShare = 0.6;

const dimFloor = 0.15;
const dimCeiling = 0.4;
const glowFloor = 0.65;
const glowCeiling = 1;

export interface StarSpec {
  readonly key: string;

  readonly x: number;
  readonly y: number;
  readonly size: number;

  readonly dim: number;
  readonly glow: number;

  readonly durationMs: number;

  readonly delayMs: number;
}

export interface StarFieldInput {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly twinkleMs: number;
}

export type StarDirection = 1 | -1;

export interface StarBox {
  readonly width: number;
  readonly height: number;
}

export const starAt = (spec: StarSpec, direction: StarDirection): number =>
  direction === 1 ? spec.glow : spec.dim;

export const turned = (direction: StarDirection): StarDirection =>
  direction === 1 ? -1 : 1;

export const directionOf = (
  directions: HashMap.HashMap<string, StarDirection>,
  key: string,
): StarDirection => Option.getOrElse(HashMap.get(directions, key), () => 1);

export const sameBox = (
  a: Option.Option<StarBox>,
  b: Option.Option<StarBox>,
): boolean =>
  Option.match(a, {
    onNone: () => Option.isNone(b),
    onSome: (held) =>
      Option.exists(
        b,
        (next) => held.width === next.width && held.height === next.height,
      ),
  });

export const starField = (input: StarFieldInput): ReadonlyArray<StarSpec> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  const count = Math.min(Math.max(Math.round(input.count), 0), starCountCap);
  if (count === 0) return [];
  const maxSize = Math.max(input.maxSize, input.minSize);
  const originX = Math.min(maxSize, input.width / 2);
  const originY = Math.min(maxSize, input.height / 2);
  const spanX = Math.max(input.width - originX * 2, 0);
  const spanY = Math.max(input.height - originY * 2, 0);

  return Arr.makeBy(count, (index) => {
    const size = Math.round(
      input.minSize +
        seededUnit(input.seed, index, 2) * (maxSize - input.minSize),
    );
    const durationMs = Math.round(
      input.twinkleMs *
        (durationFloorShare +
          seededUnit(input.seed, index, 4) *
            (durationCeilingShare - durationFloorShare)),
    );
    return {
      key: String(index),
      x: tenth(originX + seededUnit(input.seed, index, 0) * spanX),
      y: tenth(originY + seededUnit(input.seed, index, 1) * spanY),
      size: Math.max(size, 1),
      dim: tenth(
        dimFloor + seededUnit(input.seed, index, 3) * (dimCeiling - dimFloor),
      ),
      glow: tenth(
        glowFloor +
          seededUnit(input.seed, index, 5) * (glowCeiling - glowFloor),
      ),
      durationMs,
      delayMs: Math.round(
        seededUnit(input.seed, index, 6) * durationMs * delayShare,
      ),
    };
  });
};
