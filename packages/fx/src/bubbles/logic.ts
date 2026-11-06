import * as Arr from "effect/Array";
import { paintable, seededUnit, tenth } from "@gpuixui/components/authoring";

export const bubbleCount = 24;

export const bubbleCountCap = 60;

export const bubbleMinSize = 6;
export const bubbleMaxSize = 28;

export const bubbleRiseMs = 7_000;

export const bubbleRiseFloor = 1_200;

export const bubbleRiseCap = 60_000;

const durationFloorShare = 0.7;
const durationCeilingShare = 1.3;

const delayShare = 0.9;

const peakFloor = 0.06;
const peakCeiling = 0.18;

const driftShare = 0.08;
const driftCap = 40;

export interface BubbleSpec {
  readonly key: string;

  readonly x: number;
  readonly y: number;
  readonly size: number;

  readonly drift: number;

  readonly peak: number;

  readonly durationMs: number;

  readonly delayMs: number;
}

export interface BubbleFieldInput {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly riseMs: number;
}

export interface BubbleBox {
  readonly width: number;
  readonly height: number;
}

export interface BubbleJourney {
  readonly fromLeft: number;
  readonly fromTop: number;
  readonly toLeft: number;
  readonly toTop: number;
}

const between = (value: number, floor: number, ceiling: number): number =>
  Math.min(Math.max(value, floor), ceiling);

export const bubbleField = (
  input: BubbleFieldInput,
): ReadonlyArray<BubbleSpec> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  const count = Math.min(Math.max(Math.round(input.count), 0), bubbleCountCap);
  if (count === 0) return [];
  const maxSize = Math.max(input.maxSize, input.minSize);
  const spanSize = Math.max(input.width - maxSize, 0);
  const spanY = Math.max(input.height - maxSize, 0);
  const sway = Math.min(input.width * driftShare, driftCap);

  return Arr.makeBy(count, (index) => {
    const size = Math.round(
      input.minSize +
        seededUnit(input.seed, index, 2) * (maxSize - input.minSize),
    );
    const durationMs = Math.round(
      input.riseMs *
        (durationFloorShare +
          seededUnit(input.seed, index, 3) *
            (durationCeilingShare - durationFloorShare)),
    );
    return {
      key: String(index),
      x: tenth(seededUnit(input.seed, index, 0) * spanSize),
      y: tenth(
        Math.min(
          seededUnit(input.seed, index, 1) * spanY,
          Math.max(input.height - size, 0),
        ),
      ),
      size: Math.max(size, 1),
      drift: tenth((seededUnit(input.seed, index, 6) - 0.5) * 2 * sway),
      peak: tenth(
        peakFloor +
          seededUnit(input.seed, index, 4) * (peakCeiling - peakFloor),
      ),
      durationMs,
      delayMs: Math.round(
        seededUnit(input.seed, index, 5) * durationMs * delayShare,
      ),
    };
  });
};

export const bubbleJourney = (
  spec: BubbleSpec,
  box: BubbleBox,
): BubbleJourney => ({
  fromLeft: spec.x,
  fromTop: box.height,
  toLeft: tenth(
    between(spec.x + spec.drift, 0, Math.max(box.width - spec.size, 0)),
  ),
  toTop: -spec.size,
});
