import * as Arr from "effect/Array";
import { paintable, seededUnit, tenth } from "@gpuixui/components/authoring";

export const fireworkBursts = 3;

export const fireworkBurstCap = 6;

export const fireworkSparks = 18;

export const fireworkSparksCap = 40;

export const fireworkMinSize = 2;
export const fireworkMaxSize = 4;

export const fireworkBurstMs = 1_400;

export const fireworkBurstFloor = 400;

export const fireworkBurstCapMs = 12_000;

const flyShare = 0.7;

const peakFloor = 0.5;
const peakCeiling = 0.95;

const ringFloorShare = 0.55;
const ringCeilingShare = 0.95;

const centreFloorShare = 0.25;
const centreCeilingShare = 0.75;

const burstStaggerShare = 0.4;

const sparkJitterShare = 0.08;

export interface FireworkSpark {
  readonly key: string;

  readonly burst: number;

  readonly x: number;
  readonly y: number;

  readonly midLeft: number;
  readonly midTop: number;
  readonly toLeft: number;
  readonly toTop: number;
  readonly size: number;

  readonly peak: number;

  readonly durationMs: number;

  readonly delayMs: number;
}

export interface FireworkFieldInput {
  readonly width: number;
  readonly height: number;
  readonly bursts: number;
  readonly sparks: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly burstMs: number;
}

export interface SparkPhase {
  readonly left: number;
  readonly top: number;
  readonly opacity: number;

  readonly durationMs: number;

  readonly delayMs: number;
}

export interface SparkPhases {
  readonly fly: SparkPhase;
  readonly fade: SparkPhase;
}

export const fireworkField = (
  input: FireworkFieldInput,
): ReadonlyArray<FireworkSpark> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  const bursts = Math.min(
    Math.max(Math.round(input.bursts), 0),
    fireworkBurstCap,
  );
  const sparks = Math.min(
    Math.max(Math.round(input.sparks), 0),
    fireworkSparksCap,
  );
  if (bursts === 0 || sparks === 0) return [];
  const maxSize = Math.max(input.maxSize, input.minSize);
  const step = (Math.PI * 2) / sparks;

  return Arr.flatMap(
    Arr.makeBy(bursts, (index) => index),
    (burst) => {
      const centreX = tenth(
        input.width *
          (centreFloorShare +
            seededUnit(input.seed, burst, 0) *
              (centreCeilingShare - centreFloorShare)),
      );
      const centreY = tenth(
        input.height *
          (centreFloorShare +
            seededUnit(input.seed, burst, 1) *
              (centreCeilingShare - centreFloorShare)),
      );
      const burstDelayMs = burst * input.burstMs * burstStaggerShare;

      return Arr.makeBy(sparks, (index): FireworkSpark => {
        const slot = burst * 64 + index;
        const size = Math.round(
          input.minSize +
            seededUnit(input.seed, slot, 4) * (maxSize - input.minSize),
        );
        const angle =
          step * index + (seededUnit(input.seed, slot, 2) - 0.5) * step * 0.6;

        const room = Math.max(
          Math.min(
            centreX - size,
            input.width - size - centreX,
            centreY - size,
            input.height - size - centreY,
          ),
          0,
        );
        const radius =
          room *
          (ringFloorShare +
            seededUnit(input.seed, slot, 3) *
              (ringCeilingShare - ringFloorShare));
        const toLeft = tenth(centreX + Math.cos(angle) * radius);
        const toTop = tenth(centreY + Math.sin(angle) * radius);
        const durationMs = Math.round(
          input.burstMs * (0.6 + seededUnit(input.seed, slot, 6) * 0.4),
        );

        return {
          key: `${burst}-${index}`,
          burst,
          x: centreX,
          y: centreY,
          midLeft: tenth(centreX + (toLeft - centreX) * flyShare),
          midTop: tenth(centreY + (toTop - centreY) * flyShare),
          toLeft,
          toTop,
          size: Math.max(size, 1),
          peak: tenth(
            peakFloor +
              seededUnit(input.seed, slot, 5) * (peakCeiling - peakFloor),
          ),
          durationMs,
          delayMs: Math.round(
            burstDelayMs +
              seededUnit(input.seed, slot, 7) *
                input.burstMs *
                sparkJitterShare,
          ),
        };
      });
    },
  );
};

export const sparkPhases = (spec: FireworkSpark): SparkPhases => {
  const flyMs = Math.round(spec.durationMs * flyShare);
  return {
    fly: {
      left: spec.midLeft,
      top: spec.midTop,
      opacity: spec.peak,
      durationMs: flyMs,
      delayMs: spec.delayMs,
    },
    fade: {
      left: spec.toLeft,
      top: spec.toTop,
      opacity: 0,
      durationMs: Math.max(spec.durationMs - flyMs, 0),
      delayMs: 0,
    },
  };
};

export const sparkRest = (
  spec: FireworkSpark,
): { readonly left: number; readonly top: number } => ({
  left: spec.midLeft,
  top: spec.midTop,
});
