/**
 * The fixture for the `chart-raster` probe: a plot the app draws itself.
 *
 * A chart has no host element and no drawing surface — `<canvas>` paints
 * nothing and `<svg source>` is rasterised into **one** tinted mask — so the
 * only per-pixel route the runtime publishes is `ImgInstance.setImagePixels`.
 * Whether a chart can be more than a stack of one-colour masks therefore rests
 * on four questions the probe asks of a real frame: does a buffer keep each
 * pixel's own colour, does a transparent pixel composite onto what is behind
 * it, does a second buffer replace the first, and does `setImage`'s own SVG
 * decoder paint markup in the fills it names.
 *
 * The plot is three bars because a chart's defining feature is that more than
 * one colour appears in it: one band of columns per series, so a frame can be
 * counted per colour rather than read at one lucky pixel.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { pipe } from "effect";
import { hexOf, type Rgb } from "./content.js";

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

/** The plot in buffer pixels; the element draws it at twice this in points. */
export const PLOT = { width: 60, height: 40 } as const;

/** The plot's CSS size: a chart at a readable size, not a 60×40 thumbnail. */
export const PLOT_SIZE = { width: 120, height: 80 } as const;

const BAR_LEFT = 3;
const BAR_PITCH = 20;
const BAR_WIDTH = 14;
const BAR_TOP = 10;

/** The three series, in the order their bars are drawn. */
export const SERIES = [
  rgb(0x2e, 0xcc, 0x71),
  rgb(0x34, 0x98, 0xdb),
  rgb(0xe7, 0x4c, 0x3c),
] as const;

/**
 * The second frame's palette. Disjoint from `SERIES` on purpose: "the update
 * painted" is only provable if the frame the reader is left with cannot be the
 * first buffer.
 */
export const REPLACEMENT = [
  rgb(0x9b, 0x59, 0xb6),
  rgb(0xf1, 0xc4, 0x0f),
  rgb(0x16, 0xa0, 0x85),
] as const;

/** The colours the SVG-bytes fixture paints, distinct from both buffers. */
export const VECTOR = [
  rgb(0xb1, 0x4a, 0xff),
  rgb(0x00, 0xa8, 0x93),
  rgb(0xff, 0x8a, 0x00),
] as const;

/**
 * The fill behind the plot. No theme carries it, so a margin pixel reading this
 * colour is the element's transparency and not the page's own background.
 */
export const PLOT_BACKING = rgb(0x14, 0x22, 0x3a);

/** The columns one series' bar occupies, counted from the plot's left edge. */
export const barBand = (index: number): { left: number; right: number } => ({
  left: BAR_LEFT + index * BAR_PITCH,
  right: BAR_LEFT + index * BAR_PITCH + BAR_WIDTH,
});

const barOwner = (
  series: ReadonlyArray<Rgb>,
  x: number,
): Option.Option<number> =>
  Arr.findFirst(
    Arr.makeBy(series.length, (index) => index),
    (index) => x >= barBand(index).left && x < barBand(index).right,
  );

/** The colour one buffer pixel carries, or `None` for the transparent margin. */
const paintAt = (
  series: ReadonlyArray<Rgb>,
  x: number,
  y: number,
): Option.Option<Rgb> =>
  y < BAR_TOP
    ? Option.none()
    : pipe(
        barOwner(series, x),
        Option.flatMap((index) => Arr.get(series, index)),
      );

/** A pixel inside the first bar's body. */
export const BAR_PIXEL = { x: BAR_LEFT + 6, y: BAR_TOP + 10 } as const;

/** A pixel of the margin between the first and second bar. */
export const MARGIN_PIXEL = {
  x: BAR_LEFT + BAR_WIDTH + 2,
  y: BAR_TOP + 10,
} as const;

/**
 * The plot as straight-RGBA bytes, the argument `setImagePixels` takes.
 *
 * A margin pixel is `0, 0, 0, 0` rather than a colour: a chart that paints its
 * own background cannot show that the element composites onto the card behind
 * it, which is what a chart in a themed surface has to do.
 */
export const plotPixels = (series: ReadonlyArray<Rgb>): Uint8Array =>
  Uint8Array.from(
    Arr.flatten(
      Arr.makeBy(PLOT.width * PLOT.height, (at) =>
        Option.match(
          paintAt(series, at % PLOT.width, Math.floor(at / PLOT.width)),
          {
            onNone: () => [0, 0, 0, 0],
            onSome: (colour) => [colour.r, colour.g, colour.b, 0xff],
          },
        ),
      ),
    ),
  );

/** The same plot as SVG markup, for the `setImage` decoder. */
export const PLOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${PLOT.width}" height="${PLOT.height}" viewBox="0 0 ${PLOT.width} ${PLOT.height}">${Arr.join(
  Arr.map(VECTOR, (colour, index) => {
    const band = barBand(index);
    return `<rect x="${band.left}" y="${BAR_TOP}" width="${BAR_WIDTH}" height="${PLOT.height - BAR_TOP}" fill="${hexOf(colour)}"/>`;
  }),
  "",
)}</svg>`;

/** A painted box in logical window points — `bounds()`'s shape, narrowed. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Where one buffer pixel lands inside the painted box, in logical points.
 *
 * The element scales the buffer to its box and the capture scales the window to
 * the display, so a sample is a fraction of the box rather than an offset: a
 * probe that added buffer pixels to the box's origin would read a 2× display's
 * frame as if it were the buffer.
 */
export const pointIn = (
  box: Box,
  pixel: { readonly x: number; readonly y: number },
): { x: number; y: number } => ({
  x: box.x + ((pixel.x + 0.5) / PLOT.width) * box.width,
  y: box.y + ((pixel.y + 0.5) / PLOT.height) * box.height,
});
