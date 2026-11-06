import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export const HINT_TEXT = "Search projects";

export const HINT_TYPED = "gpuix";

export const RUNTIME_HINT_HEX = "#8F8F8F";

export const INK_PEAK_TOLERANCE = 12;

export const INK_PEAK_FLOOR = 120;

export const FIELD_INK_IDS = {
  host: "fieldink-host",
  painted: "fieldink-painted",
  plain: "fieldink-plain",
  seamed: "fieldink-seamed",
  shipped: "fieldink-shipped",
  readout: "fieldink-readout",
} as const;

export interface InkBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

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

export interface FieldInk {
  readonly runtime: Option.Option<number>;

  readonly themed: Option.Option<number>;
}

export const fieldInk = (
  frame: Pixels.Pixels,
  box: InkBox,
  scale: number,
  themePlaceholder: string,
): FieldInk => ({
  runtime: countInk(frame, box, scale, RUNTIME_HINT_HEX),
  themed: countInk(frame, box, scale, themePlaceholder),
});

export const hasInk = (count: Option.Option<number>): boolean =>
  Option.exists(count, (value) => value > 0);

export const luminance = (red: number, green: number, blue: number): number =>
  0.2126 * red + 0.7152 * green + 0.0722 * blue;

export const luminanceOf = (hex: string): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(Pixels.hexToRgba(hex)),
    Option.map((colour) => luminance(colour.r, colour.g, colour.b)),
  );

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
