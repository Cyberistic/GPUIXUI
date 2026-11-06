import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export const ZOOM_IMAGE = { width: 240, height: 160 } as const;

export const ZOOM_SCALE = 1.6;

export interface ZoomColour {
  readonly hex: string;
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export const rgbaOf = (colour: ZoomColour): Pixels.Rgba =>
  new Pixels.Rgba({ r: colour.r, g: colour.g, b: colour.b, a: 0xff });

export const ZOOM_BACKGROUND: ZoomColour = {
  hex: "#2B3240",
  r: 0x2b,
  g: 0x32,
  b: 0x40,
};

export interface ZoomRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ZoomMark {
  readonly name: ZoomMarkName;
  readonly box: ZoomRect;
  readonly colour: ZoomColour;
}

export type ZoomMarkName = "edge" | "mark" | "far";

export const ZOOM_MARKS = {
  edge: {
    name: "edge",
    box: { x: 5, y: 5, width: 16, height: 16 },
    colour: { hex: "#37C871", r: 0x37, g: 0xc8, b: 0x71 },
  },
  mark: {
    name: "mark",
    box: { x: 52, y: 112, width: 16, height: 16 },
    colour: { hex: "#E8B30B", r: 0xe8, g: 0xb3, b: 0x0b },
  },
  far: {
    name: "far",
    box: { x: 175, y: 95, width: 16, height: 16 },
    colour: { hex: "#D94B8F", r: 0xd9, g: 0x4b, b: 0x8f },
  },
} as const satisfies Record<ZoomMarkName, ZoomMark>;

export const zoomMarks = (): ReadonlyArray<ZoomMark> => [
  ZOOM_MARKS.edge,
  ZOOM_MARKS.mark,
  ZOOM_MARKS.far,
];

export const zoomMark = (name: ZoomMarkName): ZoomMark => ZOOM_MARKS[name];

export interface ZoomPoint {
  readonly x: number;
  readonly y: number;
}

export const markCentre = (mark: ZoomMark): ZoomPoint => ({
  x: mark.box.x + mark.box.width / 2,
  y: mark.box.y + mark.box.height / 2,
});

export const ZOOM_HOVERS = {
  mark: { x: 60, y: 120 },
  other: { x: 200, y: 120 },
} as const;

export const ZOOM_PICTURE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAACgCAYAAAAy2+FlAAACOklEQVR4nO3boRECQRBFwfOEgsNg8URDJARDEqRABmQBCWBgqdp6dy3a/xFPzrI/nF5A0zJ7APA7AUOYgCFMwBD2MeDj/TJk9lGwFQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwBAmYAgTMIQJGMI89EOYgCFMwBAmYAgTMIQJGMIEDGEChjABQ5iAIUzAECZgCBMwhAkYwgQMYQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwBAmYAgTMIQJGMIEDGEChjABQ5iAIUzAECZgCBMwhAkYwgQMYQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwBAmYAgTMIQJGMIEDGEChjABQ5iAIUzAECZgCBMwhAkYwgQMYQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwGQ9ztchs/f/g4DJErCACROwgAkTsIAJE7CACROwgAkTsIAJE7CACROwgAkTsIAJE7CACROwgAkTsIAJE7CACROwgAkTsIAhbXUBP2+7IbP3wzcELGDCBCxgwgQsYMIELGDCBCxgwgQsYMIELGDCBCxgwgQsYMIELGDCBCxgwgQsYMIELGDCBCxgwgQsYMJWFzBsiYAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwBAmYAgTMIQJGMIEDGEChjABQ5iAIUzAECZgCBMwhAkYwgQMYQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoawN5nJaE3nuaFEAAAAAElFTkSuQmCC";

export const ZOOM_IDS = {
  probe: "image-zoom-probe",
  frame: "image-zoom-frame",

  picture: "image-zoom-image",
  away: "image-zoom-away",
  readout: "image-zoom-readout",
} as const;

export interface ZoomBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export const zoomBoxIn = (
  picture: { readonly x: number; readonly y: number } & ZoomRect,
  frame: { readonly x: number; readonly y: number },
): ZoomBox => ({
  left: picture.x - frame.x,
  top: picture.y - frame.y,
  width: picture.width,
  height: picture.height,
});

export const sameBox = (
  left: { readonly x: number; readonly y: number } & ZoomRect,
  right: { readonly x: number; readonly y: number } & ZoomRect,
): boolean =>
  Math.abs(left.x - right.x) <= 1 &&
  Math.abs(left.y - right.y) <= 1 &&
  Math.abs(left.width - right.width) <= 1 &&
  Math.abs(left.height - right.height) <= 1;

export const sameZoomBox = (left: ZoomBox, right: ZoomBox): boolean =>
  Math.abs(left.left - right.left) <= 0.5 &&
  Math.abs(left.top - right.top) <= 0.5 &&
  Math.abs(left.width - right.width) <= 0.5 &&
  Math.abs(left.height - right.height) <= 0.5;

export const ZOOM_FRAME = {
  width: ZOOM_IMAGE.width,
  height: ZOOM_IMAGE.height,
} as const;

export const magnified = (box: ZoomBox, scale = ZOOM_SCALE): boolean =>
  Math.abs(box.width - ZOOM_FRAME.width * scale) <= 1 &&
  Math.abs(box.height - ZOOM_FRAME.height * scale) <= 1;

export const covers = (box: ZoomBox): boolean =>
  box.left <= 0.5 &&
  box.top <= 0.5 &&
  box.left + box.width >= ZOOM_FRAME.width - 0.5 &&
  box.top + box.height >= ZOOM_FRAME.height - 0.5;

const shareOf = (offset: number, size: number): number =>
  size > 0 ? offset / size : 0.5;

export const picturePoint = (point: ZoomPoint, box: ZoomBox): ZoomPoint => ({
  x: ((point.x - box.left) * ZOOM_IMAGE.width) / box.width,
  y: ((point.y - box.top) * ZOOM_IMAGE.height) / box.height,
});

export const framePointOf = (point: ZoomPoint, box: ZoomBox): ZoomPoint => ({
  x: box.left + (point.x * box.width) / ZOOM_IMAGE.width,
  y: box.top + (point.y * box.height) / ZOOM_IMAGE.height,
});

export const pinned = (box: ZoomBox, point: ZoomPoint): boolean =>
  Math.abs(
    shareOf(point.x - box.left, box.width) - shareOf(point.x, ZOOM_FRAME.width),
  ) <= 0.005 &&
  Math.abs(
    shareOf(point.y - box.top, box.height) -
      shareOf(point.y, ZOOM_FRAME.height),
  ) <= 0.005;

const withinBox = (point: ZoomPoint, box: ZoomRect): boolean =>
  point.x >= box.x &&
  point.x < box.x + box.width &&
  point.y >= box.y &&
  point.y < box.y + box.height;

export const pictureColour = (point: ZoomPoint): Option.Option<Pixels.Rgba> => {
  if (
    point.x < 0 ||
    point.y < 0 ||
    point.x >= ZOOM_IMAGE.width ||
    point.y >= ZOOM_IMAGE.height
  ) {
    return Option.none();
  }
  return Option.some(
    rgbaOf(
      Option.getOrElse(
        Option.map(
          Arr.findFirst(zoomMarks(), (mark) => withinBox(point, mark.box)),
          (mark) => mark.colour,
        ),
        () => ZOOM_BACKGROUND,
      ),
    ),
  );
};

export const expectedPaint = (
  point: ZoomPoint,
  box: ZoomBox,
): Option.Option<Pixels.Rgba> => pictureColour(picturePoint(point, box));

export const zoomReadout = (state: {
  readonly point: ZoomPoint;
  readonly moves: number;
  readonly leaves: number;
}): string =>
  `point=${Math.round(state.point.x)},${Math.round(state.point.y)} ` +
  `moves=${state.moves} leaves=${state.leaves}`;

export const ZOOM_CHECKS = 54;
