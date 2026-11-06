import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { Pixels } from "@gpuixui/testing";
import type { Point } from "./frame.js";

export const TOOLTIP_LEVEL = "fast";

export const TOOLTIP_ENTER_MS = 160;

export const TOOLTIP_PARTIAL_MS = Math.round(TOOLTIP_ENTER_MS / 8);

export const TOOLTIP_REST_MS = TOOLTIP_ENTER_MS + 80;

export const TOOLTIP_TRAVEL = 2;

export const TOOLTIP_SAMPLE_INSET = 3;

export interface TooltipBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const tooltipSample = (box: TooltipBox): Point => ({
  x: box.x - TOOLTIP_SAMPLE_INSET,
  y: box.y + box.height / 2,
});

const NO_BOX = "none";

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

export const formatTooltipBox = (box: Option.Option<TooltipBox>): string =>
  Option.match(box, {
    onNone: () => NO_BOX,
    onSome: ({ x, y, width, height }) =>
      [x, y, width, height].map((value) => Math.round(value)).join(","),
  });

export const INK_MARGIN = 60;

const brightness = (colour: Pixels.Rgba): number =>
  colour.r + colour.g + colour.b;

const brightestFirst: Order.Order<Pixels.Rgba> = Order.mapInput(
  Order.Number,
  (colour: Pixels.Rgba) => -brightness(colour),
);

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
