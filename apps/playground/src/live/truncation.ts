/**
 * What a window paints for a line it cannot fit.
 *
 * Every table cell, tab label, tree row and list title keeps its text on one
 * line with `whiteSpace: "nowrap"`, and the capability record called truncation
 * supported because `StyleDesc` declares `textOverflow` and `lineClamp` — no
 * probe had painted one. The question a component needs answered is not whether
 * the field exists but what reaches the frame: does a clipped run stop at its
 * box, is the last glyph cut mid-shape or replaced by an ellipsis, does
 * `ellipsis-start` keep the tail, and does `lineClamp` shorten a paragraph
 * without the box following it.
 *
 * A window reports no style, so every answer is read out of a capture. Glyph ink
 * is counted exactly, because a `<text>` has solid cores (the reason `field-ink`
 * counts a hint exactly). A clipped capital stem reaches the top half of its
 * line where an ellipsis's dots sit on the baseline, so the two ends of a run are
 * told apart by where their ink sits vertically rather than by guessing at the
 * glyph.
 */
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** The width every measured box asks for. */
export const TRUNCATION_WIDTH = 200;

/**
 * The run the one-line boxes hold.
 *
 * Capitals on purpose: a stem spans the whole line, so "this end is a whole
 * glyph" is a statement about the top of the line rather than about a letter's
 * shape.
 */
export const TRUNCATION_LABEL = "GPUIXUI TRUNCATES THIS VERY LONG LABEL";

/**
 * The paragraph the clamp boxes hold: three body-size lines in a 200-point box,
 * so `lineClamp: 2` has one line to cut.
 */
export const TRUNCATION_PROSE =
  "A label longer than its column is shortened instead of wrapped, and a " +
  "paragraph is cut at the line its reader was promised.";

/** How far a read region reaches past its box, so a run that escapes is seen. */
export const TRUNCATION_BLEED = 120;

/** The lines a clamped paragraph is asked for. */
export const TRUNCATION_CLAMP_LINES = 2;

/** The points at each end of a run that decide "whole glyph" from "ellipsis". */
export const TRUNCATION_EDGE = 12;

/** Where the window's checks read the fixture. */
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

/** A painted box, as the runtime's layout report gives it. */
export interface InkBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** What one run paints, in logical points from its region's top-left. */
export interface TruncationRead {
  /** Painted lines, counted as runs of ink rows. */
  readonly lines: number;
  /** The right edge of the ink, which tells a clipped run from one that escapes. */
  readonly right: number;
  /** Ink pixels in the upper half of the lowest line, in its first `edge` points. */
  readonly headUpper: number;
  /** The same, in its last `edge` points. */
  readonly tailUpper: number;
}

/** The capture pixels a logical box covers. */
const regionOf = (box: InkBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });

/** Whether the pixel at (`x`, `y`) paints `ink` exactly. */
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

/** Whether row `y` carries any of the ink. */
const rowPaints = (
  frame: Pixels.Pixels,
  y: number,
  ink: Pixels.Rgba,
): boolean =>
  Arr.some(Arr.range(0, frame.width - 1), (x) => paints(frame, x, y, ink));

/** One answer per row: does that row carry the ink? */
const inkRows = (
  frame: Pixels.Pixels,
  ink: Pixels.Rgba,
): ReadonlyArray<boolean> =>
  Arr.map(Arr.range(0, frame.height - 1), (y) => rowPaints(frame, y, ink));

/** The number of ink runs down the row map: one per painted line. */
const linesIn = (rows: ReadonlyArray<boolean>): number =>
  Arr.reduce(rows, { lines: 0, previous: false }, (state, on) => ({
    lines: state.lines + (on && !state.previous ? 1 : 0),
    previous: on,
  })).lines;

/**
 * The first ink row of the lowest painted line.
 *
 * The blank leading above that line is the highest blank row in the rows it
 * occupies plus everything above it, so the line starts on the row after it.
 */
const lowestLineTop = (rows: ReadonlyArray<boolean>, bottom: number): number =>
  Arr.reduce(Arr.range(0, bottom), -1, (blank, row) =>
    rows[row] === true ? blank : row,
  ) + 1;

/** How many ink pixels a rectangle holds; `0` for one that hangs off the crop. */
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

/**
 * What a run paints inside `region`, or `None` when the region is outside the
 * capture or carries none of the ink.
 *
 * `None` rather than `0`: a region that moved or a colour the palette no longer
 * names would otherwise read as "this run was truncated to nothing".
 */
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
