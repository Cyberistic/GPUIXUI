import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export const SWITCH_IDS = {
  probe: "switch-probe",
  field: "switch-field",
  readout: "switch-readout",
  disabled: "switch-disabled",
  disabledReadout: "switch-disabled-readout",
  platform: "switch-platform",
  platformReadout: "switch-platform-readout",
} as const;

export const SWITCH_PAGE = "#0B0D12";

export const SWITCH_LEVEL = "fast";

export const SWITCH_SLIDE_MS = 160;

export const SWITCH_HALF_MS = Math.round(SWITCH_SLIDE_MS / 2);

export const SWITCH_REST_MS = SWITCH_SLIDE_MS + 80;

export interface SwitchBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SwitchPaint extends SwitchBox {
  readonly count: number;
}

export const regionOf = (
  band: SwitchBox,
  scale: number,
  pad = 0,
): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round((band.x - pad) * scale),
    y: Math.round((band.y - pad) * scale),
    width: Math.round((band.width + pad * 2) * scale),
    height: Math.round((band.height + pad * 2) * scale),
  });

export const paintInBand = (
  frame: Pixels.Pixels,
  band: SwitchBox,
  colour: Pixels.Rgba,
  scale: number,
  pad = 0,
): Option.Option<SwitchPaint> => {
  const region = regionOf(band, scale, pad);

  const originX = Math.max(region.x, 0);
  const originY = Math.max(region.y, 0);
  return Option.flatMap(
    Option.fromNullishOr(Pixels.crop(frame, region)),
    (crop) => {
      const bounds = Option.fromNullishOr(Pixels.boundsOfColour(crop, colour));
      return Option.map(bounds, (paint) => ({
        x: originX / scale + paint.x / scale,
        y: originY / scale + paint.y / scale,
        width: paint.width / scale,
        height: paint.height / scale,
        count: Pixels.countColour(crop, colour),
      }));
    },
  );
};

export const leadingGap = (track: SwitchBox, thumb: SwitchBox): number =>
  thumb.x - track.x;

export const trailingGap = (track: SwitchBox, thumb: SwitchBox): number =>
  track.x + track.width - (thumb.x + thumb.width);

export const thumbMoved = (before: SwitchBox, after: SwitchBox): number =>
  after.x - before.x;

export const sitsAtTheStart = (track: SwitchBox, thumb: SwitchBox): boolean => {
  const gap = leadingGap(track, thumb);
  return gap >= 0 && gap <= 4;
};

export const sitsAtTheEnd = (
  track: SwitchBox,
  start: SwitchBox,
  end: SwitchBox,
): boolean => Math.abs(trailingGap(track, end) - leadingGap(track, start)) <= 1;

export const isBetween = (
  value: number,
  from: number,
  to: number,
  slack = 1.5,
): boolean =>
  value > Math.min(from, to) + slack && value < Math.max(from, to) - slack;

export const nearMiddle = (
  value: number,
  from: number,
  to: number,
  tolerance = 2,
): boolean => Math.abs(value - (from + to) / 2) <= tolerance;

export const switchReadout = (checked: boolean, changes: number): string =>
  `checked=${checked} changes=${changes}`;
