/**
 * The `switch-lifecycle` fixture: the shipped `Switch`, the page it is measured
 * on, and the arithmetic a captured frame is read with.
 *
 * A switch's state is two paints and one **position**: the track's fill, the
 * knob's ink, and the knob's inset, which the runtime animates between the two
 * resting places. The package's suites read the resolved `StyleDesc` and the
 * motion clock off the render tree; only a frame says the fill reached the
 * glass and the knob really travelled — and the knob is a part the component
 * renders itself, with no `testId`, so a window can reach it only by its paint.
 *
 * The probe paints its own page rather than a theme role, because a thumb's ink
 * is a role the page may be: a checked switch's knob is `primaryForeground`,
 * which on the dark palette is the same bytes as `background`. A distinct
 * backing is what makes the knob's bounds a measurement of the knob.
 */
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** The `testId`s the view, the steps and the unit suite share. */
export const SWITCH_IDS = {
  probe: "switch-probe",
  field: "switch-field",
  readout: "switch-readout",
  disabled: "switch-disabled",
  disabledReadout: "switch-disabled-readout",
  platform: "switch-platform",
  platformReadout: "switch-platform-readout",
} as const;

/**
 * The page the two switches stand on.
 *
 * Not a role: it must differ from every ink the probe counts, so a knob that
 * shares `primaryForeground` with the palette's `background` is still the only
 * paint of its colour inside its band.
 */
export const SWITCH_PAGE = "#0B0D12";

/** The level the thumb slides at (`Switch.tsx`'s `motionTiming("fast")`). */
export const SWITCH_LEVEL = "fast";

/**
 * That level's duration in milliseconds.
 *
 * The motion table is the one owner of the number; this fixture cannot import
 * it, so `switch.test.ts` reads `motionLevels.fast` out of its source and fails
 * when it moves.
 */
export const SWITCH_SLIDE_MS = 160;

/**
 * The frozen-clock offset that reads the slide partway through.
 *
 * The slide eases `standard` (in-out), so half the level is half the travel —
 * the frame is neither end, which is what says the thumb is animated rather
 * than placed.
 */
export const SWITCH_HALF_MS = Math.round(SWITCH_SLIDE_MS / 2);

/** The frozen-clock offset that reads the thumb at rest: past the level. */
export const SWITCH_REST_MS = SWITCH_SLIDE_MS + 80;

/** A painted box in the window's logical points. */
export interface SwitchBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A paint's bounds plus how many pixels it covers. */
export interface SwitchPaint extends SwitchBox {
  readonly count: number;
}

/**
 * The part of `frame` one logical box covers, padded by `pad` points.
 *
 * The pad is for a paint drawn **outside** its box — the keyboard ring is an
 * `outline` at an offset — so a read of a focused control is not cut short.
 */
export const regionOf = (
  band: SwitchBox,
  scale: number,
  pad = 0,
): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round((band.x - pad) * scale),
    y: Math.round((band.y - pad) * scale),
    width: Math.round((band.width + pad * 2) * scale),
    height: Math.round((band.height + pad * 2) * scale),
  });

/**
 * The bounds `colour` paints inside `band`, in logical points, or `None` when
 * it paints nothing there.
 *
 * A bound, not a count: a knob's two resting places differ only by **where** it
 * is, so the measurement is the paint's own left edge.
 */
export const paintInBand = (
  frame: Pixels.Pixels,
  band: SwitchBox,
  colour: Pixels.Rgba,
  scale: number,
  pad = 0,
): Option.Option<SwitchPaint> => {
  const region = regionOf(band, scale, pad);
  // `crop` clamps to the frame, so the origin is the clamped one: a band near
  // an edge would otherwise map its paint to a point outside the window.
  const originX = Math.max(region.x, 0);
  const originY = Math.max(region.y, 0);
  return Option.flatMap(
    Option.fromNullishOr(Pixels.crop(frame, region)),
    (crop) => {
      const bounds = Option.fromNullishOr(Pixels.boundsOfColour(crop, colour));
      return Option.map(bounds, (paint) => ({
        x: originX / scale + paint.x / scale,
        y: originY / scale + paint.y / scale,
        width: paint.width / scale,
        height: paint.height / scale,
        count: Pixels.countColour(crop, colour),
      }));
    },
  );
};

/**
 * How far a thumb has travelled between two resting places.
 *
 * A thumb starts one inset inside the track's leading edge and ends the same
 * inset inside its trailing edge, so the distance it covers is the track less
 * the knob and both gaps. The source's authored inset is never assumed: the
 * gaps are the two frames' own measurements.
 */
export const leadingGap = (track: SwitchBox, thumb: SwitchBox): number =>
  thumb.x - track.x;

/** The space between the knob's trailing edge and the track's. */
export const trailingGap = (track: SwitchBox, thumb: SwitchBox): number =>
  track.x + track.width - (thumb.x + thumb.width);

/** How far left-to-right a thumb moved between two frames. */
export const thumbMoved = (before: SwitchBox, after: SwitchBox): number =>
  after.x - before.x;

/**
 * Whether a thumb sits at the track's leading edge.
 *
 * The authored inset is one to two points, so a knob anywhere in the first four
 * points is at the start; a knob that jumped to the far end fails.
 */
export const sitsAtTheStart = (track: SwitchBox, thumb: SwitchBox): boolean => {
  const gap = leadingGap(track, thumb);
  return gap >= 0 && gap <= 4;
};

/**
 * Whether a thumb rests at the far end, inset the way it started.
 *
 * The far inset is the same one the near end keeps, which is what makes the end
 * a resting place rather than "as far as the knob can go".
 */
export const sitsAtTheEnd = (
  track: SwitchBox,
  start: SwitchBox,
  end: SwitchBox,
): boolean => Math.abs(trailingGap(track, end) - leadingGap(track, start)) <= 1;

/** Whether `value` is strictly between `from` and `to`, `slack` clear of both. */
export const isBetween = (
  value: number,
  from: number,
  to: number,
  slack = 1.5,
): boolean =>
  value > Math.min(from, to) + slack && value < Math.max(from, to) - slack;

/** Whether `value` is the halfway point of `from` and `to`. */
export const nearMiddle = (
  value: number,
  from: number,
  to: number,
  tolerance = 2,
): boolean => Math.abs(value - (from + to) / 2) <= tolerance;

/** The readout a switch's own state prints. */
export const switchReadout = (checked: boolean, changes: number): string =>
  `checked=${checked} changes=${changes}`;
