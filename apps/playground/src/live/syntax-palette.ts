import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export const SYNTAX_LANGUAGE = "ts";

export const SYNTAX_SOURCE = Arr.join(
  [
    "const total = 41;",
    'const label = "ready";',
    "const ready = true;",
    "const again = total;",
  ],
  "\n",
);

export const SYNTAX_TOKEN = "const";

export const LIGHT_KEYWORD = "#3B2C8F";

export const DARK_KEYWORD = "#A7A9FF";

export const RUNTIME_KEYWORD = "#8F96ED";

export const RUNTIME_KEYWORD_TOLERANCE = 2;

export const SYNTAX_IDS = {
  caption: "syntax-caption",
  light: "syntax-light",
  dark: "syntax-dark",
  runtime: "syntax-runtime",
} as const;

export interface InkBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

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

export const SYNTAX_INK_FLOOR = 20;

export const COLOUR_GAP = 8;

export const isPainted = (count: number): boolean => count > SYNTAX_INK_FLOOR;
