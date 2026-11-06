import { pipe } from "effect";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { colourAt, differs } from "./frame.js";

export { colourAt, differs };

export const BOX_PAINT_IDS = {
  solid: "boxpaint-solid",
  dashed: "boxpaint-dashed",
  corners: "boxpaint-corners",
  sides: "boxpaint-sides",
  gradient: "boxpaint-gradient",
} as const;

export const BOX_PAINT_BORDER = "#FF3B30";

export const BOX_PAINT_FILL = "#34C759";

export const BOX_PAINT_STOPS = ["#FF3B30", "#0A84FF"] as const;

export const BOX_PAINT_WIDTH = 160;
export const BOX_PAINT_HEIGHT = 60;

export const BOX_PAINT_BORDER_WIDTH = 2;

export interface PaintBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PaintPoint {
  readonly x: number;
  readonly y: number;
}

export const pointAcross = (
  box: PaintBox,
  fraction: number,
  y: number,
): PaintPoint => ({
  x: box.x + box.width * fraction,
  y,
});

export const isColour = (sample: Pixels.Rgba, hex: string): boolean =>
  pipe(
    Option.fromNullishOr(Pixels.hexToRgba(hex)),
    Option.exists((colour) => !differs(sample, colour)),
  );

export const countPaint = (
  frame: Pixels.Pixels,
  box: PaintBox,
  scale: number,
  hex: string,
): Option.Option<number> =>
  pipe(
    Option.all([
      Option.fromNullishOr(
        Pixels.crop(
          frame,
          new Pixels.PixelRegion({
            x: Math.round(box.x * scale),
            y: Math.round(box.y * scale),
            width: Math.round(box.width * scale),
            height: Math.round(box.height * scale),
          }),
        ),
      ),
      Option.fromNullishOr(Pixels.hexToRgba(hex)),
    ]),
    Option.map(([region, colour]) => Pixels.countColour(region, colour)),
  );
