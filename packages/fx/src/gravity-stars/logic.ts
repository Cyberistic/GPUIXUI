import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import { paintable, seededUnit, tenth } from "@gpuixui/components/authoring";

export const gravityStars = 36;

export const gravityStarsCap = 160;

export const gravityMinSize = 1;
export const gravityMaxSize = 3;

export const gravityFallMs = 3_000;

export const gravityFallFloor = 600;

export const gravityFallCapMs = 20_000;

const approachShare = 0.6;

const centreFloorShare = 0.3;
const centreCeilingShare = 0.7;

const angleJitterShare = 0.3;

const delayShare = 0.8;

const fallFloorShare = 0.5;
const fallCeilingShare = 1.4;
const nearFallShare = 0.6;
const farFallShare = 1.2;

const peakFloor = 0.35;
const peakCeiling = 0.85;

export interface GravityBox {
  readonly width: number;
  readonly height: number;
}

export interface GravityFieldInput extends GravityBox {
  readonly count: number;
  readonly seed: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly fallMs: number;
}

export interface GravityCentre {
  readonly x: number;
  readonly y: number;
}

export interface GravityStar {
  readonly key: string;
  readonly size: number;

  readonly x: number;
  readonly y: number;

  readonly midX: number;
  readonly midY: number;

  readonly endX: number;
  readonly endY: number;

  readonly peak: number;

  readonly durationMs: number;

  readonly delayMs: number;
}

export interface GravityPhases {
  readonly approach: {
    readonly left: number;
    readonly top: number;
    readonly opacity: number;
    readonly durationMs: number;
    readonly delayMs: number;
  };
  readonly plunge: {
    readonly left: number;
    readonly top: number;
    readonly opacity: number;
    readonly durationMs: number;
  };
}

export const gravityCentreOf = (
  box: GravityBox,
  seed: number,
): GravityCentre => ({
  x: tenth(
    box.width *
      (centreFloorShare +
        seededUnit(seed, 0, 9) * (centreCeilingShare - centreFloorShare)),
  ),
  y: tenth(
    box.height *
      (centreFloorShare +
        seededUnit(seed, 0, 10) * (centreCeilingShare - centreFloorShare)),
  ),
});

const rimDistance = (
  centre: GravityCentre,
  box: GravityBox,
  angle: number,
): number => {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const alongX =
    dx > 0 ? (box.width - centre.x) / dx : dx < 0 ? -centre.x / dx : Infinity;
  const alongY =
    dy > 0 ? (box.height - centre.y) / dy : dy < 0 ? -centre.y / dy : Infinity;
  return Math.min(alongX, alongY);
};

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

const fallFactor = (distance: number, farthest: number): number =>
  paintable(farthest)
    ? nearFallShare + (farFallShare - nearFallShare) * (distance / farthest)
    : farFallShare;

export const gravityField = (
  input: GravityFieldInput,
): ReadonlyArray<GravityStar> => {
  if (!paintable(input.width) || !paintable(input.height)) return [];
  if (input.count <= 0) return [];

  const centre = gravityCentreOf(input, input.seed);
  const slice = (Math.PI * 2) / input.count;
  const farthest = Arr.reduce(
    Arr.range(0, input.count - 1),
    0,
    (widest, index) =>
      Math.max(
        widest,
        rimDistance(
          centre,
          input,
          index * slice +
            (seededUnit(input.seed, index, 1) - 0.5) * slice * angleJitterShare,
        ),
      ),
  );

  return Arr.map(Arr.range(0, input.count - 1), (index) => {
    const angle =
      index * slice +
      (seededUnit(input.seed, index, 1) - 0.5) * slice * angleJitterShare;
    const distance = rimDistance(centre, input, angle);
    const size = Math.round(
      input.minSize +
        seededUnit(input.seed, index, 2) * (input.maxSize - input.minSize),
    );
    const startX = tenth(
      clamp(
        centre.x + Math.cos(angle) * distance - size / 2,
        0,
        Math.max(0, input.width - size),
      ),
    );
    const startY = tenth(
      clamp(
        centre.y + Math.sin(angle) * distance - size / 2,
        0,
        Math.max(0, input.height - size),
      ),
    );
    const endX = tenth(centre.x - size / 2);
    const endY = tenth(centre.y - size / 2);
    const speed = clamp(
      fallFactor(distance, farthest) *
        (0.9 + seededUnit(input.seed, index, 3) * 0.2),
      fallFloorShare,
      fallCeilingShare,
    );

    return {
      key: String(index),
      size,
      x: startX,
      y: startY,
      midX: tenth(startX + (endX - startX) * approachShare),
      midY: tenth(startY + (endY - startY) * approachShare),
      endX,
      endY,
      peak: tenth(
        peakFloor +
          seededUnit(input.seed, index, 4) * (peakCeiling - peakFloor),
      ),
      durationMs: Math.round(input.fallMs * speed),
      delayMs: Math.round(
        seededUnit(input.seed, index, 5) * delayShare * input.fallMs,
      ),
    };
  });
};

export const gravityPhases = (star: GravityStar): GravityPhases => ({
  approach: {
    left: star.midX,
    top: star.midY,
    opacity: star.peak,
    durationMs: Math.round(star.durationMs * approachShare),
    delayMs: star.delayMs,
  },
  plunge: {
    left: star.endX,
    top: star.endY,
    opacity: 0,
    durationMs: Math.round(star.durationMs * (1 - approachShare)),
  },
});

export const gravityRest = (
  star: GravityStar,
): {
  readonly left: number;
  readonly top: number;
  readonly opacity: number;
} => ({
  left: star.midX,
  top: star.midY,
  opacity: star.peak,
});

export interface GravityLife {
  readonly lap: number;

  readonly landing: boolean;
}

export const gravityBorn: GravityLife = { lap: 0, landing: false };

export const gravityLifeOf = (
  lives: HashMap.HashMap<string, GravityLife>,
  key: string,
): GravityLife => Option.getOrElse(HashMap.get(lives, key), () => gravityBorn);

export const gravityAdvanced = (life: GravityLife): GravityLife =>
  life.landing
    ? { lap: life.lap + 1, landing: false }
    : { lap: life.lap, landing: true };

export const gravitySameBox = (
  a: Option.Option<GravityBox>,
  b: Option.Option<GravityBox>,
): boolean =>
  Option.match(a, {
    onNone: () => Option.isNone(b),
    onSome: (held) =>
      Option.exists(
        b,
        (next) => held.width === next.width && held.height === next.height,
      ),
  });
