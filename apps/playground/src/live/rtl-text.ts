/**
 * Whether a window shapes and mirrors a right-to-left string on its own.
 *
 * The runtime publishes no direction input, so the library documents layout
 * direction as the app's (one direction-aware helper, physical overlays). That
 * leaves the other half: does the platform still *shape* Arabic and lay a
 * Hebrew run out from the right, or does an Arabic word paint as isolated
 * letters in logical order? The capability record names the question as
 * unmeasured, and a consumer shipping Arabic or Hebrew needs the answer before
 * it decides how much of its text handling to own.
 *
 * A window reports no style, so both answers are read from a capture:
 *
 * - **Direction** is where a trailing capital `T` lands. A right-to-left
 *   paragraph puts it at the **left** edge, while an English run puts it on the
 *   right; the crossbar it alone carries in the top rows of the line says which
 *   end it reached. A Latin sample is the control, because its order is not in
 *   question; the Hebrew sample keeps only short letters beside it so the
 *   crossbar is the one thing at the top of the line; and the same Hebrew run
 *   behind a leading Latin letter has an LTR base direction, so the crossbar
 *   must move to the other end if the platform really reads the text's
 *   direction rather than right-aligning a box.
 * - **Shaping** is the advance width of one Arabic word against the same four
 *   letters separated by zero-width non-joiners. A shaper that joins the
 *   letters lays the two strings out at different widths; a painter that draws
 *   each letter on its own cannot.
 */
import { pipe } from "effect";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** The size the samples paint at, large enough for whole pixels of ink. */
export const RTL_FONT_SIZE = 32;

/** The points at each end of a run the crossbar is looked for in. */
export const RTL_EDGE = 10;

/**
 * The samples.
 *
 * `latin`, `hebrew` and `hebrewLtr` put a capital `T` last in a run of short
 * letters, so the end it reaches is the one thing their layouts disagree about.
 * `hebrewLtr` is the same Hebrew run with an `a` first, which makes the
 * paragraph's base direction left-to-right; the Arabic pair shares every code
 * point except the non-joiners, because a pair that differed in content would
 * measure the font, not the layout.
 */
export const RTL_SAMPLES = {
  latin: "nnT",
  hebrew: "ייT",
  hebrewLtr: "aייT",
  arabicJoined: "سلام",
  arabicSeparated: "س\u200Cل\u200Cا\u200Cم",
} as const;

/** Where the probe reads the fixture. */
export const RTL_IDS = {
  caption: "rtl-caption",
  latin: "rtl-latin",
  hebrew: "rtl-hebrew",
  hebrewLtr: "rtl-hebrew-ltr",
  arabicJoined: "rtl-arabic-joined",
  arabicSeparated: "rtl-arabic-separated",
} as const;

/** Which end of a run carries the capital `T`'s crossbar. */
export type CrossbarSide = "left" | "right" | "unresolved";

/** The direction a run was laid out in. */
export type RunDirection = "rtl" | "ltr" | "unresolved";

/** The rows under a line's top that only a crossbar reaches. */
export const RTL_TOP_ROWS = 3;

/**
 * How much more ink a crossbar must paint than a letter's edge before an end
 * is named.
 *
 * A `T`'s crossbar spans a dozen points in the top rows while a short letter's
 * stem paints a couple, so twice the count is inside the signal and outside
 * any antialiasing difference.
 */
export const RTL_CROSSBAR_FLOOR = 2;

/** What one run paints in the top rows at each end of its ink box. */
export interface EndInk {
  /** Ink in the left band's top rows, in device pixels. */
  readonly left: number;
  /** The same in the right band. */
  readonly right: number;
  /** The run's painted width in logical points. */
  readonly width: number;
}

/**
 * The end of a run that carries the `T`'s crossbar.
 *
 * `unresolved` when both ends paint the top rows alike: a run with no marker,
 * or one where the crossbar did not separate from the letters, cannot say
 * which way it was laid out.
 */
export const crossbarSide = (ink: EndInk): CrossbarSide =>
  ink.left === 0 && ink.right === 0
    ? "unresolved"
    : ink.left * RTL_CROSSBAR_FLOOR <= ink.right
      ? "right"
      : ink.right * RTL_CROSSBAR_FLOOR <= ink.left
        ? "left"
        : "unresolved";

/**
 * The direction a run with a trailing capital `T` was laid out in.
 *
 * A right-to-left paragraph puts the last logical character at the visual
 * left; where the crossbar is at neither edge, layout direction is not what
 * the paint shows.
 */
export const directionOf = (ink: EndInk): RunDirection =>
  crossbarSide(ink) === "left"
    ? "rtl"
    : crossbarSide(ink) === "right"
      ? "ltr"
      : "unresolved";

/** The advance widths the two Arabic strings were laid out at. */
export interface ShapingRead {
  readonly joined: number;
  readonly separated: number;
  /** `separated - joined`: a positive number means joining narrowed the run. */
  readonly delta: number;
}

/** The shaping reading of two run widths. */
export const shapingOf = (joined: number, separated: number): ShapingRead => ({
  joined,
  separated,
  delta: separated - joined,
});

/**
 * Whether the non-joiners changed the layout at all.
 *
 * A half point is below a device pixel at 1× but well above the rounding two
 * identical layouts can differ by, so the same width means the shaper did not
 * read the join controls.
 */
export const shaped = (read: ShapingRead): boolean =>
  Math.abs(read.delta) >= 0.5;

/** The capture pixels a logical box covers. */
const regionOf = (
  box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  scale: number,
): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });

/**
 * What a run paints in the top rows at each end, or `None` when the region is
 * outside the capture or carries none of the ink.
 *
 * `None` rather than an empty reading: a sample that did not paint (a font the
 * host is missing, a box that moved) must not read as "the marker is at
 * neither end".
 */
export const readEndInk = (
  frame: Pixels.Pixels,
  region: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  scale: number,
  hex: string,
  edge = RTL_EDGE,
): Option.Option<EndInk> =>
  pipe(
    Option.all([
      Option.fromNullishOr(Pixels.crop(frame, regionOf(region, scale))),
      Option.fromNullishOr(Pixels.hexToRgba(hex)),
    ]),
    Option.flatMap(([crop, ink]) => {
      const inked = Option.fromNullishOr(Pixels.boundsOfColour(crop, ink));
      return Option.map(inked, (bounds) => {
        const width = Math.max(
          1,
          Math.min(Math.round(edge * scale), bounds.width),
        );
        const rows = Math.min(bounds.height, RTL_TOP_ROWS * scale);
        const band = (from: number) =>
          pipe(
            Option.fromNullishOr(
              Pixels.crop(
                crop,
                new Pixels.PixelRegion({
                  x: from,
                  y: bounds.y,
                  width,
                  height: rows,
                }),
              ),
            ),
            Option.map((part) => Pixels.countColour(part, ink)),
            Option.getOrElse(() => 0),
          );
        return {
          left: band(bounds.x),
          right: band(bounds.x + bounds.width - width),
          width: bounds.width / scale,
        };
      });
    }),
  );
