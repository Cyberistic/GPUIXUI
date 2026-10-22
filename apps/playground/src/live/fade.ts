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
 * Reading that frame against **wall time** does not work: a paint on a software
 * renderer can block longer than the 320 ms tween, so a "read at 107 ms" races
 * the frame it names. The renderer's automation surface exposes the clock the
 * motion states are computed from, so the probe freezes it, advances it by an
 * exact number of milliseconds and captures the frame at that progress:
 *
 * - at a third of the level the pixel is a **mix** of the surface and the page
 *   behind it, so the fade is painted rather than skipped;
 * - past the level the pixel is the surface's **own colour**, so the fade ends
 *   where the seam says it does;
 * - under a reduced preference the same frozen clock already paints the
 *   surface's own colour, so the journey, not the resting frame, is what the
 *   timing removes.
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

/** How far the frozen clock is advanced for the partial frame: a third in. */
export const FADE_PARTIAL_MS = Math.round(FADE_DURATION_MS / 3);

/**
 * How far the frozen clock is advanced for the resting frame: past the level.
 *
 * The tween's last frame is scheduled for the level's own duration, so a read
 * at exactly it can still carry the frame before the resting one; the extra
 * frame clears it.
 */
export const FADE_REST_MS = FADE_DURATION_MS + 80;

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
 * paint at every height, clear of the ring at the edge and of any child. The
 * settled-frame check would fail on a child's colour if this stopped being true,
 * and `fade.test.ts` holds the point inside the box it is given.
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

/** Whether a sampled pixel is the unpainted page, alpha included. */
export const isBacking = (sample: Pixels.Rgba, backing: Pixels.Rgba): boolean =>
  isSurface(sample, backing);
