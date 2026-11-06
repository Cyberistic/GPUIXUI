import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const RIPPLE_IDS = {
  probe: "ripple-probe",
  action: "ripple-action",
  readout: "ripple-readout",
} as const;

export const RIPPLE_ACTION = { width: 240, height: 160 } as const;

export const RIPPLE_PRESS = {
  first: { across: 0.35, down: 0.5 },
  second: { across: 0.75, down: 0.5 },
} as const;

export const RIPPLE_STEP_MS = 25;

export const RIPPLE_STEPS = 20;

export const RIPPLE_SMALL_MIN = 40;
export const RIPPLE_SMALL_MAX = 150;

export const RIPPLE_CLIP_GAP = 8;

export const RIPPLE_CORNER_INSET = 0.1;

export const RIPPLE_OUTSIDE = 8;

export const RIPPLE_INSIDE = 4;

export const RIPPLE_MIN_SPAN = 32;

export const RIPPLE_SHARE_AGREEMENT = 0.02;

export const RIPPLE_SHARE_MIN = 0.01;
export const RIPPLE_SHARE_MAX = 0.12;

export const RIPPLE_FADE_STEP = 0.004;

export interface RippleBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface RippleFraction {
  readonly across: number;
  readonly down: number;
}

export interface RipplePoint {
  readonly x: number;
  readonly y: number;
}

export const pressOffset = (fraction: RippleFraction): RipplePoint => ({
  x: RIPPLE_ACTION.width * fraction.across,
  y: RIPPLE_ACTION.height * fraction.down,
});

export const pressPoint = (
  action: RippleBox,
  fraction: RippleFraction,
): RipplePoint => ({
  x: action.x + action.width * fraction.across,
  y: action.y + action.height * fraction.down,
});

export const discCentre = (disc: RippleBox): RipplePoint => ({
  x: disc.x + disc.width / 2,
  y: disc.y + disc.height / 2,
});

export const cornerPoints = (
  disc: RippleBox,
  inset: number = RIPPLE_CORNER_INSET,
): ReadonlyArray<RipplePoint> => {
  const inX = disc.width * inset;
  const inY = disc.height * inset;
  return [
    { x: disc.x + inX, y: disc.y + inY },
    { x: disc.x + disc.width - inX, y: disc.y + inY },
    { x: disc.x + inX, y: disc.y + disc.height - inY },
    { x: disc.x + disc.width - inX, y: disc.y + disc.height - inY },
  ];
};

export const insideActionPoint = (
  action: RippleBox,
  y: number,
): RipplePoint => ({ x: action.x + RIPPLE_INSIDE, y });

export const outsideActionPoint = (
  action: RippleBox,
  y: number,
): RipplePoint => ({ x: action.x - RIPPLE_OUTSIDE, y });

export const isSmallFrame = (disc: RippleBox): boolean =>
  disc.width >= RIPPLE_SMALL_MIN &&
  disc.width <= RIPPLE_SMALL_MAX &&
  disc.height >= RIPPLE_SMALL_MIN &&
  disc.height <= RIPPLE_SMALL_MAX;

export const passesLeftEdge = (action: RippleBox, disc: RippleBox): boolean =>
  disc.x <= action.x - RIPPLE_CLIP_GAP;

export const washShare = (
  observed: Rgb,
  fill: Rgb,
  ink: Rgb,
): Option.Option<number> => {
  const shares = Arr.getSomes(
    Arr.map(["r", "g", "b"] as const, (channel) => {
      const span = ink[channel] - fill[channel];
      return Math.abs(span) < RIPPLE_MIN_SPAN
        ? Option.none<number>()
        : Option.some((observed[channel] - fill[channel]) / span);
    }),
  );
  if (Arr.length(shares) < 2) return Option.none();
  const spread =
    Arr.reduce(shares, -Infinity, (highest, share) =>
      Math.max(highest, share),
    ) -
    Arr.reduce(shares, Infinity, (lowest, share) => Math.min(lowest, share));
  if (spread > RIPPLE_SHARE_AGREEMENT) return Option.none();
  const total = Arr.reduce(shares, 0, (sum, share) => sum + share);
  return Option.some(total / Arr.length(shares));
};

export const isWash = (share: number): boolean =>
  share > RIPPLE_SHARE_MIN && share <= RIPPLE_SHARE_MAX;

export const isFainter = (later: number, earlier: number): boolean =>
  later <= earlier - RIPPLE_FADE_STEP;

export const rippleReadout = (presses: number): string => `presses=${presses}`;

export const RIPPLE_CHECKS = 51;
