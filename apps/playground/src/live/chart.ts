import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { pipe } from "effect";
import { hexOf, type Rgb } from "./content.js";

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

export const PLOT = { width: 60, height: 40 } as const;

export const PLOT_SIZE = { width: 120, height: 80 } as const;

const BAR_LEFT = 3;
const BAR_PITCH = 20;
const BAR_WIDTH = 14;
const BAR_TOP = 10;

export const SERIES = [
  rgb(0x2e, 0xcc, 0x71),
  rgb(0x34, 0x98, 0xdb),
  rgb(0xe7, 0x4c, 0x3c),
] as const;

export const REPLACEMENT = [
  rgb(0x9b, 0x59, 0xb6),
  rgb(0xf1, 0xc4, 0x0f),
  rgb(0x16, 0xa0, 0x85),
] as const;

export const VECTOR = [
  rgb(0xb1, 0x4a, 0xff),
  rgb(0x00, 0xa8, 0x93),
  rgb(0xff, 0x8a, 0x00),
] as const;

export const PLOT_BACKING = rgb(0x14, 0x22, 0x3a);

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

export const BAR_PIXEL = { x: BAR_LEFT + 6, y: BAR_TOP + 10 } as const;

export const MARGIN_PIXEL = {
  x: BAR_LEFT + BAR_WIDTH + 2,
  y: BAR_TOP + 10,
} as const;

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

export const PLOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${PLOT.width}" height="${PLOT.height}" viewBox="0 0 ${PLOT.width} ${PLOT.height}">${Arr.join(
  Arr.map(VECTOR, (colour, index) => {
    const band = barBand(index);
    return `<rect x="${band.left}" y="${BAR_TOP}" width="${BAR_WIDTH}" height="${PLOT.height - BAR_TOP}" fill="${hexOf(colour)}"/>`;
  }),
  "",
)}</svg>`;

export const ALPHA_BASE = rgb(0xff, 0x3b, 0x30);

export const ALPHA_OVER = rgb(0x0a, 0x84, 0xff);

export const ALPHA_SHARE = 0x80;

export const alphaBands = {
  base: { left: 0, right: 20 },
  translucent: { left: 0, right: 40 },
  opaque: { left: 40, right: PLOT.width },
} as const;

export interface Band {
  readonly left: number;
  readonly right: number;
}

interface BandPaint {
  readonly band: Band;
  readonly colour: Rgb;
  readonly alpha: number;
}

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

export const alphaBasePixels = (): Uint8Array =>
  bandedPixels([{ band: alphaBands.base, colour: ALPHA_BASE, alpha: 0xff }]);

export const alphaOverPixels = (): Uint8Array =>
  bandedPixels([
    { band: alphaBands.translucent, colour: ALPHA_OVER, alpha: ALPHA_SHARE },
    { band: alphaBands.opaque, colour: ALPHA_OVER, alpha: 0xff },
  ]);

export const ALPHA_POINTS = {
  overBase: { x: 10, y: 20 },
  overBacking: { x: 30, y: 20 },
  opaque: { x: 50, y: 20 },
} as const;

export const compositeOver = (over: Rgb, under: Rgb, alpha: number): Rgb => {
  const share = (value: number): number => Math.round(value);
  return {
    r: share((over.r * alpha + under.r * (0xff - alpha)) / 0xff),
    g: share((over.g * alpha + under.g * (0xff - alpha)) / 0xff),
    b: share((over.b * alpha + under.b * (0xff - alpha)) / 0xff),
  };
};

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const pointIn = (
  box: Box,
  pixel: { readonly x: number; readonly y: number },
): { x: number; y: number } => ({
  x: box.x + ((pixel.x + 0.5) / PLOT.width) * box.width,
  y: box.y + ((pixel.y + 0.5) / PLOT.height) * box.height,
});
