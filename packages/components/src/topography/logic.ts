/**
 * The contour field a `Topography` paints, as one generated path.
 *
 * A contour line is a horizontal run that wanders: each line is sampled across
 * the box at a fixed step and displaced by two seeded sine waves, one long and
 * one shorter, so no two lines trace the same shape. The phase comes from the
 * field's seed, not from a random sequence, so the same seed paints the same
 * map on every mount.
 *
 * The arithmetic is pure. A spacing, amplitude or stroke the renderer could not
 * paint falls back to the house value; a box that would need more lines than the
 * cap allows grows the spacing rather than dropping lines; and an amplitude of
 * zero is honoured, because a field of straight rules is a legitimate pattern.
 */

import * as Arr from "effect/Array";
import { seededUnit, tenth } from "../internal/scatter.js";
import {
  paintableBox,
  svgPatternMarkup,
  type PatternBox,
} from "../internal/svg-pattern.js";

/** The house distance between two contour lines, in pixels. */
export const topographySpacing = 32;

/** The closest and widest spacing a caller may ask for, in pixels. */
export const topographyMinSpacing = 12;
export const topographyMaxSpacing = 120;

/** The house displacement of a line from its base, in pixels. */
export const topographyAmplitude = 8;

/** The largest displacement that still reads as a contour rather than a scribble. */
export const topographyMaxAmplitude = 60;

/** The house stroke weight, in pixels. */
export const topographyStroke = 1;

/** The widest stroke that still reads as line art rather than a fill. */
export const topographyMaxStroke = 6;

/** The most contour lines one field paints, each a subpath. */
export const topographyMaxLines = 80;

/** The seed a field falls back to. */
export const topographySeed = 1;

/** The long wave's length, as a multiple of the line spacing. */
const wavelengthShare = 7;

/** The shorter wave that roughens the long one, and its share. */
const rippleShare = 0.47;
const rippleWeight = 0.32;

/** The finest horizontal sampling, in pixels. */
const minStep = 10;

/** The most sampled points one line may spend, so a wide box stays bounded. */
const maxSteps = 160;

/** {@link TopographyFieldOptions.spacing} as the field can paint it. */
export const topographySpacingOf = (spacing: number): number =>
  Number.isFinite(spacing) && spacing > 0
    ? Math.min(Math.max(spacing, topographyMinSpacing), topographyMaxSpacing)
    : topographySpacing;

/** {@link TopographyFieldOptions.amplitude} as the field can paint it. */
export const topographyAmplitudeOf = (amplitude: number): number =>
  Number.isFinite(amplitude) && amplitude >= 0
    ? Math.min(amplitude, topographyMaxAmplitude)
    : topographyAmplitude;

/** {@link TopographyFieldOptions.stroke} as the field can paint it. */
export const topographyStrokeOf = (stroke: number): number =>
  Number.isFinite(stroke) && stroke > 0
    ? Math.min(Math.max(stroke, 0.5), topographyMaxStroke)
    : topographyStroke;

/** {@link TopographyFieldOptions.seed} as the field can paint it. */
export const topographySeedOf = (seed: number): number =>
  Number.isFinite(seed) ? seed : topographySeed;

/** One field's inputs: the box it fills, and the authored shape. */
export interface TopographyFieldOptions extends PatternBox {
  readonly spacing: number;
  readonly amplitude: number;
  readonly stroke: number;
  readonly seed: number;
}

/** The generated field: its markup, and what it drew. */
export interface TopographyField {
  readonly markup: string;
  readonly lines: number;
  /** The spacing actually drawn, which may exceed the caller's to honour the cap. */
  readonly spacing: number;
}

/** One line's height at `x`, in the box's coordinates. */
const lineAt = (
  x: number,
  base: number,
  amplitude: number,
  wavelength: number,
  phase: number,
  ripple: number,
): number => {
  const long = Math.sin((x / wavelength) * Math.PI * 2 + phase);
  const short = Math.sin(
    (x / (wavelength * rippleShare)) * Math.PI * 2 + ripple,
  );
  return tenth(
    base + amplitude * ((1 - rippleWeight) * long + rippleWeight * short),
  );
};

/**
 * The contour lines for one measured box.
 *
 * A box with no paint returns no markup, so a field that has not been laid out
 * yet paints nothing rather than a degenerate run at the origin.
 */
export const topographyField = ({
  width,
  height,
  spacing,
  amplitude,
  stroke,
  seed,
}: TopographyFieldOptions): TopographyField => {
  const house = topographySpacingOf(spacing);
  if (!paintableBox({ width, height })) {
    return { markup: "", lines: 0, spacing: house };
  }

  // Grow the spacing until the box needs no more lines than the cap allows.
  const drawn = Math.max(house, height / (topographyMaxLines - 1));
  const count = Math.ceil(height / drawn) + 1;
  const displacement = topographyAmplitudeOf(amplitude);
  const wavelength = drawn * wavelengthShare;
  const step = Math.max(minStep, Math.ceil(width / maxSteps));
  const steps = Math.ceil(width / step);
  const layoutSeed = topographySeedOf(seed);

  const paths = Arr.map(Arr.range(0, count - 1), (line) => {
    const base = line * drawn;
    const phase = seededUnit(layoutSeed, line, 0) * Math.PI * 2;
    const ripple = seededUnit(layoutSeed, line, 1) * Math.PI * 2;
    const points = Arr.map(Arr.range(0, steps), (index) => {
      const x = Math.min(index * step, width);
      const command = index === 0 ? "M" : "L";
      return `${command} ${tenth(x)} ${lineAt(x, base, displacement, wavelength, phase, ripple)}`;
    });
    return Arr.join(points, " ");
  });

  return {
    markup: svgPatternMarkup(
      { width, height },
      Arr.join(paths, " "),
      topographyStrokeOf(stroke),
    ),
    lines: Arr.length(paths),
    spacing: drawn,
  };
};
