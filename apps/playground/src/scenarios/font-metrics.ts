/**
 * The pure half of the typeface probe (plan `771`).
 *
 * The bug being guarded: the platform type styles are proven only by the
 * **authored** style report, so a runtime that shaped every run with the default
 * face would pass the whole suite while macOS / Linux / Windows type looked
 * identical. These helpers turn the frame's highlight washes into advances and
 * state the four relations the probe asserts; the fixture guard refuses a
 * "missing" family that a host might actually have.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Smoke } from "@gpuixui/testing";

/** The size every fixture run is painted at. */
export const FONT_SIZE = 16;
/** Eight narrow glyphs: proportional faces advance them far less than `W`. */
export const NARROW_RUN = "iiiiiiii";
/** Eight wide glyphs: equal to `NARROW_RUN` in a monospaced face. */
export const WIDE_RUN = "WWWWWWWW";
/** The mixed phrase compared across faces. */
export const PHRASE_RUN = "GPUixUI 0123";
/** A family no supported platform ships. */
export const MISSING_FAMILY = "GPUIXUI Missing Face";

/**
 * The first wash rect's width for every painted run of `text`, in paint order.
 *
 * A match with no rect is dropped: the adapter already drops a malformed wash,
 * and an empty quad list must not become `NaN` inside a comparison.
 */
export const runWidths = (
  highlights: ReadonlyArray<Smoke.HighlightMatch>,
  text: string,
): ReadonlyArray<number> =>
  Arr.getSomes(
    Arr.map(highlights, (match) =>
      match.text === text
        ? Option.map(Arr.head(match.rects), (rect) => rect.width)
        : Option.none(),
    ),
  );

/** True when every advance is within `tolerance` of the first (never for none). */
export const uniform = (
  widths: ReadonlyArray<number>,
  tolerance: number,
): boolean =>
  pipe(
    Arr.head(widths),
    Option.match({
      onNone: () => false,
      onSome: (first) =>
        Arr.every(widths, (width) => Math.abs(width - first) <= tolerance),
    }),
  );

/** True when the wide run advances at least `minimum` past the narrow one. */
export const proportional = (
  narrow: number,
  wide: number,
  minimum: number,
): boolean => wide > narrow + minimum;

/** True when two advances differ by more than `minimum`. */
export const differs = (
  left: number,
  right: number,
  minimum: number,
): boolean => Math.abs(left - right) > minimum;

/** True when two advances agree within `tolerance`. */
export const same = (left: number, right: number, tolerance: number): boolean =>
  Math.abs(left - right) <= tolerance;

/** The missing-family fixture must not name a family a host can resolve. */
export const missingFamilyIsForeign = (platformFamily: string): boolean =>
  MISSING_FAMILY !== platformFamily;
