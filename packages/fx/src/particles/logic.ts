import * as Arr from "effect/Array";
import { paintable, seededUnit, tenth } from "@gpuixui/components/authoring";

export const particleCount = 24;

export const particleCountCap = 120;

export const particleMinSize = 2;
export const particleMaxSize = 5;

export const particleDriftMs = 14_000;

export const particleDriftFloor = 320;

export const particleDriftCap = 120_000;

const durationFloorShare = 0.75;
const durationCeilingShare = 1.25;

const driftShare = 0.08;
const driftFloor = 2;
const driftCeiling = 40;

const opacityFloor = 0.2;
const opacityCeiling = 0.55;

export interface ParticleSpec {
  readonly key: string;

  readonly x: number;
  readonly y: number;
  readonly size: number;

  readonly driftX: number;
  readonly driftY: number;

  readonly durationMs: number;

  readonly opacity: number;
}

export interface ParticleFieldInput {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly driftMs: number;
}

export type ParticleDirection = 1 | -1;

export interface ParticleTravel {
  readonly left: number;
  readonly top: number;
}

export const particleAmplitude = (width: number, height: number): number => {
  const shorter = Math.min(width, height);
  if (!paintable(shorter)) return driftFloor;
  return Math.min(Math.max(shorter * driftShare, driftFloor), driftCeiling);
};

export const particleField = (
  input: ParticleFieldInput,
): ReadonlyArray<ParticleSpec> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  const count = Math.min(
    Math.max(Math.round(input.count), 0),
    particleCountCap,
  );
  if (count === 0) return [];
  const amplitude = particleAmplitude(input.width, input.height);
  const maxSize = Math.max(input.maxSize, input.minSize);

  const originX = Math.min(maxSize + amplitude, input.width / 2);
  const originY = Math.min(maxSize + amplitude, input.height / 2);
  const spanX = Math.max(input.width - originX * 2, 0);
  const spanY = Math.max(input.height - originY * 2, 0);

  return Arr.makeBy(count, (index) => {
    const angle = seededUnit(input.seed, index, 3) * Math.PI * 2;
    const size = Math.round(
      input.minSize +
        seededUnit(input.seed, index, 2) * (maxSize - input.minSize),
    );
    return {
      key: String(index),
      x: tenth(originX + seededUnit(input.seed, index, 0) * spanX),
      y: tenth(originY + seededUnit(input.seed, index, 1) * spanY),
      size: Math.max(size, 1),
      driftX: tenth(Math.cos(angle) * amplitude),
      driftY: tenth(Math.sin(angle) * amplitude),
      durationMs: Math.round(
        input.driftMs *
          (durationFloorShare +
            seededUnit(input.seed, index, 4) *
              (durationCeilingShare - durationFloorShare)),
      ),
      opacity: tenth(
        opacityFloor +
          seededUnit(input.seed, index, 5) * (opacityCeiling - opacityFloor),
      ),
    };
  });
};

export const particleTravel = (
  spec: ParticleSpec,
  direction: ParticleDirection,
): ParticleTravel =>
  direction === 1
    ? { left: tenth(spec.x + spec.driftX), top: tenth(spec.y + spec.driftY) }
    : { left: spec.x, top: spec.y };
