/**
 * The `syntax-palette` probe's fixtures: the source a code host highlights and
 * the arithmetic that reads a palette out of a captured frame.
 *
 * The token package ships `syntaxColors(theme)` and `nativeTextTheme` hands it
 * to a `<code>` host, but a palette reaching the host object is a source read.
 * What a probe can prove is that the **painted glyphs** are those colours — and
 * that a host handed no palette paints the runtime's own, because that fallback
 * is the defect the token group closes.
 *
 * A capture is exact (the token colours land on a glyph's solid core), so the
 * read is a pixel count inside the block's own box. The runtime's default
 * keyword is derived from the pinned release's `theme.rs` and is only held to a
 * tolerance: it is an OKLCH value converted by the runtime, not a hex the
 * package authored.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** The language the probe's source is highlighted as. */
export const SYNTAX_LANGUAGE = "ts";

/**
 * The source every block paints. Each line opens with the keyword `const`, so
 * one token type is painted four times and the palette's `keyword` is read off
 * a run rather than a single glyph.
 */
export const SYNTAX_SOURCE = Arr.join(
  [
    "const total = 41;",
    'const label = "ready";',
    "const ready = true;",
    "const again = total;",
  ],
  "\n",
);

/** The token the probe reads; every line in {@link SYNTAX_SOURCE} starts with it. */
export const SYNTAX_TOKEN = "const";

/** The light palette's keyword, as the catalogue prints it. */
export const LIGHT_KEYWORD = "#3B2C8F";

/** The dark palette's keyword, as the catalogue prints it. */
export const DARK_KEYWORD = "#A7A9FF";

/**
 * The keyword the runtime's built-in dark theme paints when a host is handed no
 * palette, read from the pinned `@gpuix/native@0.11.0` and confirmed in a frame:
 * `graph_tone(oklch(0.673, 0.182, 276.935))` in `theme.rs`, where `graph_tone`
 * multiplies the **Hsla** saturation by 0.72 after the OKLCH conversion (so it
 * is not a chroma scale). The probe reads it as `rgb(143, 150, 237)`.
 */
export const RUNTIME_KEYWORD = "#8F96ED";

/**
 * How far a runtime-painted pixel may sit from {@link RUNTIME_KEYWORD}.
 *
 * A byte of rounding belongs to the runtime's OKLCH-to-framebuffer path; the
 * shipped palettes are hex the runtime parses directly and are read exactly.
 * The gap to either shipped keyword is far wider than this, so a palette that
 * leaked into the control still fails.
 */
export const RUNTIME_KEYWORD_TOLERANCE = 2;

/** The three blocks and the caption, by test id. */
export const SYNTAX_IDS = {
  caption: "syntax-caption",
  light: "syntax-light",
  dark: "syntax-dark",
  runtime: "syntax-runtime",
} as const;

/** A logical box, as the runtime's layout report gives it. */
export interface InkBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The capture pixels a logical box covers. */
export const pixelRegion = (box: InkBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });

const channelsNear = (
  frame: Pixels.Pixels,
  at: number,
  colour: Pixels.Rgba,
  tolerance: number,
): boolean =>
  Math.abs((frame.data[at] ?? 0) - colour.r) <= tolerance &&
  Math.abs((frame.data[at + 1] ?? 0) - colour.g) <= tolerance &&
  Math.abs((frame.data[at + 2] ?? 0) - colour.b) <= tolerance &&
  Math.abs((frame.data[at + 3] ?? 0) - colour.a) <= tolerance;

/**
 * How many pixels inside `box` paint `hex` within `tolerance` per channel.
 *
 * `None` is reported rather than `0` when the box lies outside the capture or
 * the colour cannot be parsed: the count of a crop that was never read is not
 * evidence that an ink is absent.
 */
export const countInk = (
  frame: Pixels.Pixels,
  box: InkBox,
  scale: number,
  hex: string,
  tolerance = 0,
): Option.Option<number> =>
  pipe(
    Option.all([
      Option.fromNullishOr(Pixels.crop(frame, pixelRegion(box, scale))),
      Option.fromNullishOr(Pixels.hexToRgba(hex)),
    ]),
    Option.map(([region, colour]) =>
      Arr.reduce(Arr.range(0, region.data.length / 4 - 1), 0, (count, pixel) =>
        channelsNear(region, pixel * 4, colour, tolerance) ? count + 1 : count,
      ),
    ),
  );

/**
 * How many pixels inside `box` differ from the fill `hex`, i.e. how much ink a
 * block painted at all.
 *
 * The companion to {@link countInk}: a block that paints its source in some
 * colour has ink even when the colour being counted is absent.
 */
export const countInkOn = (
  frame: Pixels.Pixels,
  box: InkBox,
  scale: number,
  hex: string,
  tolerance = COLOUR_GAP,
): Option.Option<number> =>
  pipe(
    Option.all([
      Option.fromNullishOr(Pixels.crop(frame, pixelRegion(box, scale))),
      Option.fromNullishOr(Pixels.hexToRgba(hex)),
    ]),
    Option.map(([region, fill]) =>
      Arr.reduce(Arr.range(0, region.data.length / 4 - 1), 0, (count, pixel) =>
        channelsNear(region, pixel * 4, fill, tolerance) ? count : count + 1,
      ),
    ),
  );

/**
 * The fewest pixels a keyword run paints.
 *
 * Four lines of five glyphs at the block's type size leave far more solid core
 * pixels than this, while an antialiasing edge or a colour that leaked from a
 * neighbouring role leaves fewer; the floor is what keeps "some pixel happened
 * to match" from reading as "the palette painted".
 */
export const SYNTAX_INK_FLOOR = 20;

/** How far a pixel may sit from a fill and still be that fill. */
export const COLOUR_GAP = 8;

/** Whether a measured count is a real run of ink rather than a stray pixel. */
export const isPainted = (count: number): boolean => count > SYNTAX_INK_FLOOR;
