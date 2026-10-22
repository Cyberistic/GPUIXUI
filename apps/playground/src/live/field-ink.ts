/**
 * What a window paints inside a field, as the arithmetic a live probe reads out
 * of a captured frame.
 *
 * Two inks are decided by the runtime rather than by `StyleDesc`:
 *
 * - an empty `<input>`'s **hint** is a fixed `#8F8F8F`
 *   (`custom_elements/input.rs` at the pinned `@gpuix/native@0.11.0`), so the
 *   `placeholder` role `nativeTextTheme` hands over as `textFaint` never
 *   reaches it;
 * - a **value** paints `style.color`, not the theme object's `text`, so a host
 *   given only `nativeTextTheme` paints the platform default — black — on
 *   whatever fill the theme chose. The library's fields set `color` from their
 *   recipe, which is what makes them readable; the token seam alone does not.
 *
 * The probe therefore paints four fields and reads each box in the frame: the
 * host's own hint, the workaround the fields ship (an empty host with no
 * placeholder and a themed `<text>` over it), a value typed into a host that
 * was given only the seam, and the same value in a field whose `color` is the
 * seam's ink.
 *
 * Counting inside a field's own box keeps a role painted elsewhere on the page
 * from standing in for the field's ink. The native text engine antialiases its
 * glyphs, so a value is read as the **peak** luminance in the box rather than an
 * exact colour count: the host's own hint and a `<text>` do have solid cores,
 * which is why those two are counted exactly.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** The hint every probe field asks for. */
export const HINT_TEXT = "Search projects";

/** The value typed into each field, one keystroke at a time. */
export const HINT_TYPED = "gpuix";

/**
 * The ink the runtime gives an empty host's hint, whatever theme it is handed.
 *
 * Read from the pinned release's source; the probe is what turns it into a
 * measurement.
 */
export const RUNTIME_HINT_HEX = "#8F8F8F";

/**
 * How close the brightest glyph pixel must land to the seam's ink.
 *
 * A native value is antialiased and its core reads a few levels under the pure
 * colour (measured: `238, 241, 245` paints a peak of `234, 237, 241`), so an
 * exact count is impossible; the dark alternative — the platform's black —
 * lands tens of levels below, far outside this window.
 */
export const INK_PEAK_TOLERANCE = 12;

/** A field whose ink is not the seam's ink cannot reach this luminance. */
export const INK_PEAK_FLOOR = 120;

/** The five fields and the readout, by test id. */
export const FIELD_INK_IDS = {
  host: "fieldink-host",
  painted: "fieldink-painted",
  plain: "fieldink-plain",
  seamed: "fieldink-seamed",
  shipped: "fieldink-shipped",
  readout: "fieldink-readout",
} as const;

/** A painted box, as the runtime's layout report gives it. */
export interface InkBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A field's box as the capture's own pixel region.
 *
 * `inset` is in logical points and trims the border the field draws, so a peak
 * read is the ink and not the frame around it.
 */
export const inkRegion = (
  box: InkBox,
  scale: number,
  inset = 0,
): Pixels.PixelRegion => {
  const trim = Math.round(inset * scale);
  return new Pixels.PixelRegion({
    x: Math.round(box.x * scale) + trim,
    y: Math.round(box.y * scale) + trim,
    width: Math.round(box.width * scale) - trim * 2,
    height: Math.round(box.height * scale) - trim * 2,
  });
};

/**
 * How many pixels paint exactly `hex` inside `box`, or `None` when the region
 * paints nothing or the colour cannot be parsed.
 *
 * `None` is reported rather than `0`: an empty crop would let a locator that
 * moved pass as "this ink is absent".
 */
export const countInk = (
  frame: Pixels.Pixels,
  box: InkBox,
  scale: number,
  hex: string,
): Option.Option<number> =>
  pipe(
    Option.all([
      Option.fromNullishOr(Pixels.crop(frame, inkRegion(box, scale))),
      Option.fromNullishOr(Pixels.hexToRgba(hex)),
    ]),
    Option.map(([region, colour]) => Pixels.countColour(region, colour)),
  );

/** What one field's box paints, in the inks the probe distinguishes. */
export interface FieldInk {
  /** Pixels of the runtime's fixed hint colour. */
  readonly runtime: Option.Option<number>;
  /** Pixels of the theme's `placeholder` role. */
  readonly themed: Option.Option<number>;
}

/** Counts both hint inks in one field's box. */
export const fieldInk = (
  frame: Pixels.Pixels,
  box: InkBox,
  scale: number,
  themePlaceholder: string,
): FieldInk => ({
  runtime: countInk(frame, box, scale, RUNTIME_HINT_HEX),
  themed: countInk(frame, box, scale, themePlaceholder),
});

/** Whether any counted ink is painted at all. */
export const hasInk = (count: Option.Option<number>): boolean =>
  Option.exists(count, (value) => value > 0);

/** The luminance of an RGB triple, the scale the peak ink is read on. */
export const luminance = (red: number, green: number, blue: number): number =>
  0.2126 * red + 0.7152 * green + 0.0722 * blue;

/** The luminance of a colour the palette names, or `None` for an unparseable one. */
export const luminanceOf = (hex: string): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(Pixels.hexToRgba(hex)),
    Option.map((colour) => luminance(colour.r, colour.g, colour.b)),
  );

/**
 * How many pixels paint darker than the fill `hex`, or `None` when the region
 * or the colour cannot be read.
 *
 * A value painted in the platform's black has no exact colour to count (the
 * native engine antialiases it into its fill), but every glyph pixel is darker
 * than the fill it sits on — which is what tells "ink this field cannot read"
 * apart from "no ink at all".
 */
export const countDarker = (
  frame: Pixels.Pixels,
  box: InkBox,
  scale: number,
  fillHex: string,
): Option.Option<number> =>
  pipe(
    Option.all([
      Option.fromNullishOr(Pixels.crop(frame, inkRegion(box, scale, 1))),
      Option.fromNullishOr(Pixels.hexToRgba(fillHex)),
    ]),
    Option.map(([region, fill]) => {
      const floor = luminance(fill.r, fill.g, fill.b) - 5;
      return Arr.reduce(
        Arr.range(0, region.data.length / 4 - 1),
        0,
        (count, pixel) =>
          luminance(
            region.data[pixel * 4] ?? 0,
            region.data[pixel * 4 + 1] ?? 0,
            region.data[pixel * 4 + 2] ?? 0,
          ) < floor
            ? count + 1
            : count,
      );
    }),
  );

/**
 * The brightest pixel inside a field's box, border excluded.
 *
 * A native value's glyph core is the brightest thing a field paints above its
 * fill; the fill, the border and the hint all sit below it in a dark theme, and
 * `None` reports a box that is not in the capture rather than a peak of `0`.
 */
export const peakInk = (
  frame: Pixels.Pixels,
  box: InkBox,
  scale: number,
): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(Pixels.crop(frame, inkRegion(box, scale, 1))),
    Option.map((region) =>
      Arr.reduce(Arr.range(0, region.data.length / 4 - 1), 0, (peak, pixel) =>
        Math.max(
          peak,
          luminance(
            region.data[pixel * 4] ?? 0,
            region.data[pixel * 4 + 1] ?? 0,
            region.data[pixel * 4 + 2] ?? 0,
          ),
        ),
      ),
    ),
  );
