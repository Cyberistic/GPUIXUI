import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export const VERTICAL_SLIDER_HEIGHT = 200;

export const VERTICAL_FRACTION = 0.25;

export const VERTICAL_SLIDER_IDS = {
  probe: "vslider-probe",
  slider: "vslider",
  rail: "vslider-rail",
  readout: "vslider-readout",
  range: "vrangeslider",
  rangeRail: "vrangeslider-rail",
  rangeReadout: "vrangeslider-readout",
} as const;

export interface VerticalBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const thumbCentreAt = (rail: VerticalBox, fraction: number): number =>
  rail.y + (1 - fraction) * rail.height;

const regionOf = (box: VerticalBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });

export const inkBounds = (
  frame: Pixels.Pixels,
  region: VerticalBox,
  scale: number,
  colour: string,
): Option.Option<VerticalBox> =>
  Option.flatMap(Option.fromNullishOr(Pixels.hexToRgba(colour)), (ink) =>
    Option.flatMap(
      Option.fromNullishOr(Pixels.crop(frame, regionOf(region, scale))),
      (crop) =>
        Option.map(
          Option.fromNullishOr(Pixels.boundsOfColour(crop, ink)),
          (bounds) => ({
            x: region.x + bounds.x / scale,
            y: region.y + bounds.y / scale,
            width: bounds.width / scale,
            height: bounds.height / scale,
          }),
        ),
    ),
  );

export const thumbCentreY = (
  frame: Pixels.Pixels,
  region: VerticalBox,
  scale: number,
  colour: string,
): Option.Option<number> =>
  Option.map(
    inkBounds(frame, region, scale, colour),
    (ink) => ink.y + ink.height / 2,
  );
