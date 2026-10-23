/**
 * The entry a tooltip paints, as the arithmetic a live probe reads out of a
 * captured frame.
 *
 * The shipped `Tooltip` enters on the presence seam's `fast` level: it fades
 * from `opacity: 0` to its resting frame while travelling `TOOLTIP_OFFSET`
 * points into place (`packages/primitives/src/components/Tooltip.tsx`). Neither
 * value is visible to a window's style report, so the probe paints a white strip
 * behind the trigger and reads the tip's own pixels and its own layout report on
 * the renderer's **motion clock** — freeze, advance by an exact offset, capture.
 *
 * The sampled point sits inside the content's left padding, where nothing but
 * the surface paints; the box's `y` is what the component's motion moves, so the
 * mount frame and the resting frame tell the travel apart.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { Pixels } from "@gpuixui/testing";
import type { Point } from "./frame.js";

/** The level a tip enters at (`surfaceTiming` in the primitives' presence seam). */
export const TOOLTIP_LEVEL = "fast";

/**
 * That level's duration in milliseconds.
 *
 * The motion table is the one owner of the number; this fixture cannot import
 * it (a probe must not take a dependency for one constant), so
 * `tooltip-fade.test.ts` reads `motionLevels.fast` out of its source and fails
 * when it moves.
 */
export const TOOLTIP_ENTER_MS = 160;

/**
 * How far the frozen clock is advanced for the partial frame: an eighth in.
 *
 * The enter eases out, so an eighth of the time is already about a third of the
 * travel — enough that the tip is visibly painted, and still almost two points
 * short of its resting place. That is the window the travel is read in: the
 * frame is a mix, yet it has not reached the top edge it will rest at.
 */
export const TOOLTIP_PARTIAL_MS = Math.round(TOOLTIP_ENTER_MS / 8);

/** How far the frozen clock is advanced for the resting frame: past the level. */
export const TOOLTIP_REST_MS = TOOLTIP_ENTER_MS + 80;

/**
 * How far the tip travels while it arrives, in points.
 *
 * `Tooltip.tsx` owns the number (`TOOLTIP_OFFSET`); the test reads it from the
 * source so the probe cannot teach a travel the component stopped painting.
 */
export const TOOLTIP_TRAVEL = 2;

/**
 * How far left of the content's edge the sample sits.
 *
 * The content box is where the tip's text starts, so sampling inside it lands on
 * a glyph. The surface's left padding is six points and its border one, so three
 * points left of the content is inside the fill and clear of both — and clear of
 * the text, which begins at the content edge.
 */
export const TOOLTIP_SAMPLE_INSET = 3;

/** A painted box, as the tooltip fixture's own layout report gives it. */
export interface TooltipBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The logical point a frame is sampled at: inside the surface's left padding. */
export const tooltipSample = (box: TooltipBox): Point => ({
  x: box.x - TOOLTIP_SAMPLE_INSET,
  y: box.y + box.height / 2,
});

/** The readout's "no box" spelling, which is what a closed tip publishes. */
const NO_BOX = "none";

/**
 * A tip box read back from the fixture's `tooltip-box` readout.
 *
 * `x,y,width,height` is the whole shape: a short, empty or non-finite report is
 * `None`, so a readout that stopped publishing cannot be read as a box at the
 * origin.
 */
export const parseTooltipBox = (value: string): Option.Option<TooltipBox> => {
  const fields = value.trim().split(",");
  if (fields.length !== 4) return Option.none();
  const numbers = fields.map((field) => Number(field));
  if (numbers.some((number) => !Number.isFinite(number))) return Option.none();
  const [x, y, width, height] = numbers;
  if (x === undefined || y === undefined) return Option.none();
  if (width === undefined || height === undefined) return Option.none();
  return width > 0 && height > 0
    ? Option.some({ x, y, width, height })
    : Option.none();
};

/** What a probe prints as a box, or {@link NO_BOX} while the tip is closed. */
export const formatTooltipBox = (box: Option.Option<TooltipBox>): string =>
  Option.match(box, {
    onNone: () => NO_BOX,
    onSome: ({ x, y, width, height }) =>
      [x, y, width, height].map((value) => Math.round(value)).join(","),
  });

/**
 * How much brighter than the surface a pixel must be to count as ink.
 *
 * Summed over three channels, so it is about twenty levels per channel: the
 * tip's text is far above its fill, while its border — a few levels above the
 * fill — is not ink.
 */
export const INK_MARGIN = 60;

/** The channel sum a brightness comparison reads. */
const brightness = (colour: Pixels.Rgba): number =>
  colour.r + colour.g + colour.b;

/** The brightest pixel first, so the head of a sorted row is its ink. */
const brightestFirst: Order.Order<Pixels.Rgba> = Order.mapInput(
  Order.Number,
  (colour: Pixels.Rgba) => -brightness(colour),
);

/** The content box's interior in device pixels, inset clear of its edge. */
const interior = (
  frame: Pixels.Pixels,
  box: TooltipBox,
  scale: number,
  inset = 2,
): {
  readonly columns: ReadonlyArray<number>;
  readonly rows: ReadonlyArray<number>;
} => ({
  columns: Arr.range(
    Math.max(0, Math.round((box.x + inset) * scale)),
    Math.min(frame.width - 1, Math.round((box.x + box.width - inset) * scale)),
  ),
  rows: Arr.range(
    Math.max(0, Math.round((box.y + inset) * scale)),
    Math.min(
      frame.height - 1,
      Math.round((box.y + box.height - inset) * scale),
    ),
  ),
});

/** The brightest pixel of a row, or `None` when the row is outside the frame. */
const rowPeak = (
  frame: Pixels.Pixels,
  columns: ReadonlyArray<number>,
  row: number,
): Option.Option<Pixels.Rgba> => {
  const pixels: ReadonlyArray<Pixels.Rgba> = Arr.getSomes(
    Arr.map(columns, (column) =>
      Option.fromNullishOr(Pixels.pixelAt(frame, column, row)),
    ),
  );
  return Arr.head(Arr.sort(pixels, brightestFirst));
};

/**
 * The first device row of the tip's own text, scanning its content box.
 *
 * A window reports no ink, so the text is found by brightness: the first row
 * whose brightest pixel clears the surface by {@link INK_MARGIN}. `None` means
 * the frame paints no text in that box — the mount frame's honest answer while
 * the tip is at opacity 0.
 */
export const inkTopRow = (
  frame: Pixels.Pixels,
  box: TooltipBox,
  scale: number,
  surface: Pixels.Rgba,
): Option.Option<number> => {
  const { columns, rows } = interior(frame, box, scale);
  const floor = brightness(surface) + INK_MARGIN;
  return Arr.findFirst(rows, (row) =>
    Option.match(rowPeak(frame, columns, row), {
      onNone: () => false,
      onSome: (peak) => brightness(peak) > floor,
    }),
  );
};

/** The brightest pixel inside the tip's content box: its text's own ink. */
export const inkPeak = (
  frame: Pixels.Pixels,
  box: TooltipBox,
  scale: number,
): Option.Option<Pixels.Rgba> => {
  const { columns, rows } = interior(frame, box, scale);
  const peaks: ReadonlyArray<Pixels.Rgba> = Arr.getSomes(
    Arr.map(rows, (row) => rowPeak(frame, columns, row)),
  );
  return Arr.head(Arr.sort(peaks, brightestFirst));
};
