/**
 * The entry fade the presence seam paints, as the arithmetic a live probe reads
 * out of a captured frame.
 *
 * `packages/components/src/internal/presence.tsx` fades every overlay from
 * `opacity: 0` to its resting frame over the motion level's duration, and the
 * runtime's style report cannot see a paint value — so the only proof is the
 * frame itself. The probe paints the page white and opens the shipped `Dialog`
 * over it; the sampled point sits inside the content surface's own padding,
 * where nothing but the surface paints.
 *
 * Three readings bracket the claim instead of timing one frame:
 *
 * - partway through the level the pixel is a **mix** of the surface and the page
 *   behind it, so the fade is painted rather than skipped;
 * - past the level the pixel is the surface's **own colour**, so the fade ends
 *   where the seam says it does;
 * - under a reduced preference partway through the level the pixel is already
 *   the surface's own colour, so the journey, not the resting frame, is what
 *   the timing removes.
 *
 * A fade that is too short fails the first, one that runs long fails the second,
 * and a preference that is ignored fails the third.
 */
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import type { Point } from "./frame.js";

/** The level an overlay that owns the window enters at (`dialog.tsx`). */
export const FADE_LEVEL = "slow";

/**
 * That level's duration in milliseconds.
 *
 * The motion table is the one owner of the number; this fixture cannot import
 * it (a probe must not take a dependency for one constant), so `fade.test.ts`
 * reads `motionLevels.slow` and the dialog's level out of their sources and
 * fails when either moves.
 */
export const FADE_DURATION_MS = 320;

/** When the fade is read for a partial frame: a third of the way through. */
export const FADE_PARTIAL_MS = Math.round(FADE_DURATION_MS / 3);

/** The slack a capture is allowed past its target before the read is late. */
export const FADE_CAPTURE_SLACK_MS = 80;

/**
 * How far past the level the settled read happens.
 *
 * Two frames and one capture: the tween's last frame is scheduled for the
 * level's own duration, so a read exactly at it can still see the frame before
 * the resting one.
 */
export const FADE_SETTLE_MARGIN_MS = 140;

/** The page the probe paints behind the surface: no theme role, so no drift. */
export const FADE_BACKING = "#FFFFFF";

/** {@link FADE_BACKING} as the frame reports it. */
export const FADE_BACKING_RGBA = new Pixels.Rgba({
  r: 0xff,
  g: 0xff,
  b: 0xff,
  a: 255,
});

/**
 * How far inside the surface's left edge the point sits.
 *
 * The content recipe's padding is 24px, so 12px is inside the surface's own
 * paint at every height, clear of the ring at the edge and of any child.
 * `fade.test.ts` reads the compiled recipe and fails when the padding drops to
 * this inset.
 */
export const FADE_SAMPLE_INSET = 12;

/** A painted box, as the runtime's layout report gives it. */
export interface FadeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The logical point a frame is sampled at: inside the surface's left padding. */
export const fadeSample = (box: FadeBox): Point => ({
  x: box.x + FADE_SAMPLE_INSET,
  y: box.y + box.height / 2,
});

/** The colour the surface rests on, read from the palette the runner mounts. */
export const surfaceFadeColour = (
  popover: string,
): Option.Option<Pixels.Rgba> =>
  Option.fromNullishOr(Pixels.hexToRgba(popover));

/**
 * Whether a sampled pixel is a partial composite of `surface` over `backing`.
 *
 * Every channel must be strictly inside the two endpoint values, with `slack`
 * levels kept clear at each end: a pixel that is the page (not yet painted) or
 * the surface (already at rest) is not a fade, and a rounding-level difference
 * is not a measurably mixed one.
 */
export const isFading = (
  sample: Pixels.Rgba,
  backing: Pixels.Rgba,
  surface: Pixels.Rgba,
  slack = 4,
): boolean => {
  const between = (value: number, from: number, to: number): boolean => {
    const low = Math.min(from, to);
    const high = Math.max(from, to);
    return (
      high - low > slack * 2 && value > low + slack && value < high - slack
    );
  };
  return (
    sample.a === surface.a &&
    between(sample.r, backing.r, surface.r) &&
    between(sample.g, backing.g, surface.g) &&
    between(sample.b, backing.b, surface.b)
  );
};

/** Whether a sampled pixel is the surface's own colour, alpha included. */
export const isSurface = (sample: Pixels.Rgba, surface: Pixels.Rgba): boolean =>
  sample.r === surface.r &&
  sample.g === surface.g &&
  sample.b === surface.b &&
  sample.a === surface.a;

/** When a reading of the fade is taken, as a window past the press. */
export interface FadeRead {
  /** The millisecond the read is due at. */
  readonly atMs: number;
  /** How early or late the read may be and still be inside its window. */
  readonly tolerance: number;
}

/**
 * When each reading of the fade happens.
 *
 * The partial read's window ends before the level does, or it would measure a
 * resting surface; the settled read's window starts at the level, or it would
 * measure the tween. `fade.test.ts` holds both windows to the level in both
 * directions, so a capture that is early or late is a failed check rather than
 * an empty measurement.
 */
export const fadeRead = (kind: "partial" | "settled"): FadeRead =>
  kind === "partial"
    ? { atMs: FADE_PARTIAL_MS, tolerance: FADE_CAPTURE_SLACK_MS }
    : {
        atMs: FADE_DURATION_MS + FADE_SETTLE_MARGIN_MS,
        tolerance: FADE_SETTLE_MARGIN_MS,
      };
