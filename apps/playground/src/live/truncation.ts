import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export const TRUNCATION_WIDTH = 200;

export const TRUNCATION_LABEL = "GPUIXUI TRUNCATES THIS VERY LONG LABEL";

export const TRUNCATION_PROSE =
  "A label longer than its column is shortened instead of wrapped, and a " +
  "paragraph is cut at the line its reader was promised.";

export const TRUNCATION_BLEED = 120;

export const TRUNCATION_CLAMP_LINES = 2;

export const TRUNCATION_EDGE = 12;

export const TRUNCATION_IDS = {
  plain: "truncation-plain",
  ellipsis: "truncation-ellipsis",
  start: "truncation-start",
  own: "truncation-own",
  shipped: "truncation-shipped",
  shippedClamp: "truncation-shipped-clamp",
  wrapped: "truncation-wrapped",
  clamp: "truncation-clamp",
  clampBox: "truncation-clamp-box",
  clampSized: "truncation-clamp-sized",
  bleed: "truncation-bleed",
  bleedText: "truncation-bleed-text",
} as const;

export interface InkBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TruncationRead {
  readonly lines: number;

  readonly right: number;

  readonly headUpper: number;

  readonly tailUpper: number;
}

const regionOf = (box: InkBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });

const paints = (
  frame: Pixels.Pixels,
  x: number,
  y: number,
  ink: Pixels.Rgba,
): boolean => {
  const at = (y * frame.width + x) * 4;
  return (
    frame.data[at] === ink.r &&
    frame.data[at + 1] === ink.g &&
    frame.data[at + 2] === ink.b &&
    frame.data[at + 3] === ink.a
  );
};

const rowPaints = (
  frame: Pixels.Pixels,
  y: number,
  ink: Pixels.Rgba,
): boolean =>
  Arr.some(Arr.range(0, frame.width - 1), (x) => paints(frame, x, y, ink));

const inkRows = (
  frame: Pixels.Pixels,
  ink: Pixels.Rgba,
): ReadonlyArray<boolean> =>
  Arr.map(Arr.range(0, frame.height - 1), (y) => rowPaints(frame, y, ink));

const linesIn = (rows: ReadonlyArray<boolean>): number =>
  Arr.reduce(rows, { lines: 0, previous: false }, (state, on) => ({
    lines: state.lines + (on && !state.previous ? 1 : 0),
    previous: on,
  })).lines;

const lowestLineTop = (rows: ReadonlyArray<boolean>, bottom: number): number =>
  Arr.reduce(Arr.range(0, bottom), -1, (blank, row) =>
    rows[row] === true ? blank : row,
  ) + 1;

const countIn = (
  frame: Pixels.Pixels,
  ink: Pixels.Rgba,
  columns: { readonly from: number; readonly to: number },
  rows: { readonly from: number; readonly to: number },
): number =>
  Arr.reduce(
    Arr.range(rows.from, rows.to),
    0,
    (count, y) =>
      count +
      Arr.reduce(Arr.range(columns.from, columns.to), 0, (inRow, x) =>
        x >= 0 && x < frame.width && paints(frame, x, y, ink)
          ? inRow + 1
          : inRow,
      ),
  );

export const readTruncation = (
  frame: Pixels.Pixels,
  region: InkBox,
  scale: number,
  hex: string,
  edge = TRUNCATION_EDGE,
): Option.Option<TruncationRead> =>
  pipe(
    Option.all([
      Option.fromNullishOr(Pixels.crop(frame, regionOf(region, scale))),
      Option.fromNullishOr(Pixels.hexToRgba(hex)),
    ]),
    Option.flatMap(([crop, ink]) => {
      const bounds = Option.fromNullishOr(Pixels.boundsOfColour(crop, ink));
      return Option.map(bounds, (box) => {
        const rows = inkRows(crop, ink);
        const bottom = box.y + box.height - 1;
        const top = lowestLineTop(rows, bottom);
        const middle = top + Math.floor((bottom - top) / 2);
        const width = Math.round(edge * scale);
        return {
          lines: linesIn(rows),
          right: (box.x + box.width) / scale,
          headUpper: countIn(
            crop,
            ink,
            { from: box.x, to: box.x + width },
            { from: top, to: middle },
          ),
          tailUpper: countIn(
            crop,
            ink,
            { from: box.x + box.width - width, to: box.x + box.width },
            { from: top, to: middle },
          ),
        };
      });
    }),
  );
