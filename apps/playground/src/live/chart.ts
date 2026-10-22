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

/**
 * The translucent plot: a series drawn over the mark beneath it, the question a
 * stacked or overlapping chart asks of the buffer. The base mark is opaque and
 * covers the left third; the over-mark covers the left two thirds at half alpha
 * and the last third opaque, so one frame answers three questions — what a
 * half-alpha pixel reads over another mark, what it reads over the card, and
 * that an opaque pixel is still its own colour.
 */
export const ALPHA_BASE = rgb(0xff, 0x3b, 0x30);

/** The over-mark's colour, painted at `ALPHA_SHARE` and then opaquely. */
export const ALPHA_OVER = rgb(0x0a, 0x84, 0xff);

/** The share a stacked series carries; half is the one a chart layers with. */
export const ALPHA_SHARE = 0x80;

/** Where each layer paints, in buffer pixels counted from the left edge. */
export const alphaBands = {
  base: { left: 0, right: 20 },
  translucent: { left: 0, right: 40 },
  opaque: { left: 40, right: PLOT.width },
} as const;

/** A horizontal span of buffer pixels. */
export interface Band {
  readonly left: number;
  readonly right: number;
}

/** One layer of the translucent plot: the span it covers, its colour and alpha. */
interface BandPaint {
  readonly band: Band;
  readonly colour: Rgb;
  readonly alpha: number;
}

/** A buffer painting each layer inside its band, transparent everywhere else. */
const bandedPixels = (layers: ReadonlyArray<BandPaint>): Uint8Array =>
  Uint8Array.from(
    Arr.flatten(
      Arr.makeBy(PLOT.width * PLOT.height, (at) => {
        const x = at % PLOT.width;
        return pipe(
          Arr.findFirst(
            layers,
            (layer) => x >= layer.band.left && x < layer.band.right,
          ),
          Option.match({
            onNone: (): ReadonlyArray<number> => [0, 0, 0, 0],
            onSome: (layer) => [
              layer.colour.r,
              layer.colour.g,
              layer.colour.b,
              layer.alpha,
            ],
          }),
        );
      }),
    ),
  );

/** The opaque mark the translucent series is drawn over. */
export const alphaBasePixels = (): Uint8Array =>
  bandedPixels([{ band: alphaBands.base, colour: ALPHA_BASE, alpha: 0xff }]);

/** The layer over it: half alpha over the base, opaque at the right. */
export const alphaOverPixels = (): Uint8Array =>
  bandedPixels([
    { band: alphaBands.translucent, colour: ALPHA_OVER, alpha: ALPHA_SHARE },
    { band: alphaBands.opaque, colour: ALPHA_OVER, alpha: 0xff },
  ]);

/**
 * A point inside each region the translucent plot measures, in buffer pixels:
 * over the opaque mark, over the card alone, and the opaque reference.
 */
export const ALPHA_POINTS = {
  overBase: { x: 10, y: 20 },
  overBacking: { x: 30, y: 20 },
  opaque: { x: 50, y: 20 },
} as const;

/**
 * The colour a straight-alpha `over` at `alpha` reads when it composites onto
 * `under`. The API documents straight alpha, so this is the prediction the
 * probe holds a real frame to.
 */
export const compositeOver = (over: Rgb, under: Rgb, alpha: number): Rgb => {
  const share = (value: number): number => Math.round(value);
  return {
    r: share((over.r * alpha + under.r * (0xff - alpha)) / 0xff),
    g: share((over.g * alpha + under.g * (0xff - alpha)) / 0xff),
    b: share((over.b * alpha + under.b * (0xff - alpha)) / 0xff),
  };
};

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
