import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { maxOffset, thumbBox, type ThumbBox } from "./scrollbar.js";

export const BOTH_IDS = {
  probe: "scrollbar-both-probe",
  scroller: "scrollbar-both",
  content: "scrollbar-both-content",
  short: "scrollbar-both-short",
  shortContent: "scrollbar-both-short-content",
} as const;

export const BOTH_VIEWPORT = { width: 160, height: 120 } as const;

export const BOTH_FILL = "#1E2A38";

export const BOTH_TINT = "#00E0C6";

export const BOTH_THICKNESS = 10;

export const BOTH_CONTENT = { width: 480, height: 400 } as const;

export const BOTH_SHORT_CONTENT = { width: 100, height: 90 } as const;

export const BOTH_AXES = ["vertical", "horizontal"] as const;
export type BothAxis = (typeof BOTH_AXES)[number];

export interface BothBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const bothViewport = (axis: BothAxis): number =>
  axis === "horizontal" ? BOTH_VIEWPORT.width : BOTH_VIEWPORT.height;

export const bothTrack = (axis: BothAxis): number =>
  bothViewport(axis) - BOTH_THICKNESS;

export const bothExtent = (axis: BothAxis): number =>
  axis === "horizontal" ? BOTH_CONTENT.width : BOTH_CONTENT.height;

export const bothScroll = (axis: BothAxis): number =>
  maxOffset(bothExtent(axis), bothViewport(axis));

export interface BothThumb {
  readonly axis: BothAxis;
  readonly track: number;
  readonly content: number;

  readonly box: BothBox;
}

export const bothThumbOf = (
  axis: BothAxis,
  offset = 0,
): Option.Option<BothThumb> => {
  const track = bothTrack(axis);
  const content = bothExtent(axis);
  return Option.map(thumbBox(track, bothScroll(axis), offset), (thumb) => ({
    axis,
    track,
    content,
    box:
      axis === "horizontal"
        ? {
            x: thumb.start,
            y: BOTH_VIEWPORT.height - BOTH_THICKNESS,
            width: thumb.length,
            height: BOTH_THICKNESS,
          }
        : {
            x: BOTH_VIEWPORT.width - BOTH_THICKNESS,
            y: thumb.start,
            width: BOTH_THICKNESS,
            height: thumb.length,
          },
  }));
};

export const bothBandOf = (axis: BothAxis): BothBox =>
  axis === "horizontal"
    ? {
        x: 0,
        y: BOTH_VIEWPORT.height - BOTH_THICKNESS,
        width: BOTH_VIEWPORT.width - BOTH_THICKNESS,
        height: BOTH_THICKNESS,
      }
    : {
        x: BOTH_VIEWPORT.width - BOTH_THICKNESS,
        y: 0,
        width: BOTH_THICKNESS,
        height: BOTH_VIEWPORT.height - BOTH_THICKNESS,
      };

export const BOTH_THUMBS: ReadonlyArray<BothThumb> = Arr.getSomes(
  Arr.map(BOTH_AXES, (axis) => bothThumbOf(axis)),
);

export interface BothStop {
  readonly axis: BothAxis;

  readonly deltaX: number;
  readonly deltaY: number;
  readonly label: string;

  readonly offset: { readonly x: number; readonly y: number };

  readonly thumb: ThumbBox;
}

export const BOTH_WHEEL_BY = 100;

export const BOTH_VERTICAL_CLAMP = -maxOffset(
  BOTH_CONTENT.height,
  BOTH_VIEWPORT.height,
);

const stopAt = (
  axis: BothAxis,
  deltaX: number,
  deltaY: number,
  offset: { readonly x: number; readonly y: number },
  label: string,
): Option.Option<BothStop> => {
  const scrolled = axis === "horizontal" ? offset.x : offset.y;
  return Option.map(
    thumbBox(bothTrack(axis), bothScroll(axis), scrolled),
    (thumb) => ({ axis, deltaX, deltaY, label, offset, thumb }),
  );
};

export const BOTH_STOPS: ReadonlyArray<BothStop> = Arr.getSomes([
  stopAt(
    "vertical",
    0,
    -BOTH_WHEEL_BY,
    { x: 0, y: -BOTH_WHEEL_BY },
    "one wheel down",
  ),
  stopAt(
    "vertical",
    0,
    -100_000,
    { x: 0, y: BOTH_VERTICAL_CLAMP },
    "a wheel past the end",
  ),
  stopAt(
    "horizontal",
    -BOTH_WHEEL_BY,
    0,
    { x: -BOTH_WHEEL_BY, y: BOTH_VERTICAL_CLAMP },
    "one wheel right",
  ),
]);

export const BOTH_CHECKS =
  1 + 3 + 2 + BOTH_THUMBS.length * 4 + 2 + 1 + BOTH_STOPS.length * 6;
