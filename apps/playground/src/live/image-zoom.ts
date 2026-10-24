/**
 * The `image-zoom` probe's fixture: a picture with three marked spots, the box
 * a picture paints in its frame, and the invariants a magnifier keeps.
 *
 * `ImageZoom` shipped with a behaviour suite in the offscreen renderer, which
 * reads the box the runtime was handed but never the pixels it painted. Two
 * claims therefore rested on another probe: that an `<img>` host **scales its
 * buffer into the box it is given** (measured for a chart buffer by
 * `chart-raster`, not for a picture in a frame), and that the pan leaves the
 * spot under the pointer where the reader found it. The probe mounts the
 * component in a window and reads both out of a capture.
 *
 * The bitmap is a synthetic picture — one background and three marked spots —
 * so every pixel the probe samples is a point the fixture names. Its bytes are
 * embedded and `image-zoom.test.ts` decodes them, so the marks the probe reads
 * cannot drift from the picture it mounts.
 *
 * The arithmetic here is expressed as **invariants over a measured box**, not as
 * the component's own zoom formula: the probe reads the box the runtime painted
 * and asks whether it magnifies, covers its frame and keeps the pointed spot
 * under the pointer. A second copy of the formula would agree with itself.
 * Kept native-free, as every fixture is.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** The picture's own size in pixels: the frame's rest box, so it paints 1:1. */
export const ZOOM_IMAGE = { width: 240, height: 160 } as const;

/** The magnification the probe asks for, the component's own default. */
export const ZOOM_SCALE = 1.6;

/** A colour as the fixture declares it: the channels and the hex a page prints. */
export interface ZoomColour {
  readonly hex: string;
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** An RGBA value the capture sampler compares with. */
export const rgbaOf = (colour: ZoomColour): Pixels.Rgba =>
  new Pixels.Rgba({ r: colour.r, g: colour.g, b: colour.b, a: 0xff });

/** The picture's background: one flat tone, so a mark is the only ink on it. */
export const ZOOM_BACKGROUND: ZoomColour = {
  hex: "#2B3240",
  r: 0x2b,
  g: 0x32,
  b: 0x40,
};

/** A rectangle in the picture's own coordinates. */
export interface ZoomRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One marked spot the probe reads: where it is and what it paints. */
export interface ZoomMark {
  readonly name: ZoomMarkName;
  readonly box: ZoomRect;
  readonly colour: ZoomColour;
}

/** The three marks a probe names. */
export type ZoomMarkName = "edge" | "mark" | "far";

/**
 * The three marks, by name.
 *
 * `mark` sits under the first hover point, so the spot the pointer points at is
 * a colour no background can imitate. `edge` is near the picture's corner and
 * `far` is right of centre: both are inside the resting frame and outside the
 * magnified window, so a capture that still holds them has not magnified.
 */
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

/** The marks in documentation order, for a sweep. */
export const zoomMarks = (): ReadonlyArray<ZoomMark> => [
  ZOOM_MARKS.edge,
  ZOOM_MARKS.mark,
  ZOOM_MARKS.far,
];

/** A marked spot by name, so a probe never indexes the list by position. */
export const zoomMark = (name: ZoomMarkName): ZoomMark => ZOOM_MARKS[name];

/** A point, in the picture's or the frame's own coordinates. */
export interface ZoomPoint {
  readonly x: number;
  readonly y: number;
}

/** A mark's centre: the point a sample aims at. */
export const markCentre = (mark: ZoomMark): ZoomPoint => ({
  x: mark.box.x + mark.box.width / 2,
  y: mark.box.y + mark.box.height / 2,
});

/**
 * The two points the probe hovers, in the frame's own coordinates.
 *
 * `mark` is the centre of the amber mark; `other` is empty background to the
 * right, far enough that the magnified window leaves the amber mark out. The
 * unit suite holds `mark` to {@link markCentre}, so a mark that moves takes the
 * point the probe hovers with it.
 */
export const ZOOM_HOVERS = {
  mark: { x: 60, y: 120 },
  other: { x: 200, y: 120 },
} as const;

/**
 * The embedded picture: 240×160 RGBA, the background with three 16×16 marks.
 *
 * Generated once from the fixture's own declarations; `image-zoom.test.ts`
 * decodes these bytes back to `ZOOM_BACKGROUND` and every mark, so a probe
 * cannot sample a colour the picture no longer carries.
 */
export const ZOOM_PICTURE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAACgCAYAAAAy2+FlAAACOklEQVR4nO3boRECQRBFwfOEgsNg8URDJARDEqRABmQBCWBgqdp6dy3a/xFPzrI/nF5A0zJ7APA7AUOYgCFMwBD2MeDj/TJk9lGwFQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwBAmYAgTMIQJGMI89EOYgCFMwBAmYAgTMIQJGMIEDGEChjABQ5iAIUzAECZgCBMwhAkYwgQMYQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwBAmYAgTMIQJGMIEDGEChjABQ5iAIUzAECZgCBMwhAkYwgQMYQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwBAmYAgTMIQJGMIEDGEChjABQ5iAIUzAECZgCBMwhAkYwgQMYQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwGQ9ztchs/f/g4DJErCACROwgAkTsIAJE7CACROwgAkTsIAJE7CACROwgAkTsIAJE7CACROwgAkTsIAJE7CACROwgAkTsIAhbXUBP2+7IbP3wzcELGDCBCxgwgQsYMIELGDCBCxgwgQsYMIELGDCBCxgwgQsYMIELGDCBCxgwgQsYMIELGDCBCxgwgQsYMJWFzBsiYAhTMAQJmAIEzCECRjCBAxhAoYwAUOYgCFMwBAmYAgTMIQJGMIEDGEChjABQ5iAIUzAECZgCBMwhAkYwgQMYQKGMAFDmIAhTMAQJmAIEzCECRjCBAxhAoawN5nJaE3nuaFEAAAAAElFTkSuQmCC";

/** The `testId`s the view and the steps share. */
export const ZOOM_IDS = {
  probe: "image-zoom-probe",
  frame: "image-zoom-frame",
  /**
   * The picture's id, as the shipped component publishes it.
   *
   * `image-zoom.test.ts` reads the component's source and fails if it renames
   * the element, so a probe cannot sample an id the component stopped painting.
   */
  picture: "image-zoom-image",
  away: "image-zoom-away",
  readout: "image-zoom-readout",
} as const;

/**
 * The box the picture paints, in the frame's own coordinates.
 *
 * The probe subtracts the frame's painted origin from the picture's bounds, so
 * every invariant below is about the relationship between the two boxes and
 * never about where the window happened to put them.
 */
export interface ZoomBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A painted bounds pair as a frame-local picture box. */
export const zoomBoxIn = (
  picture: { readonly x: number; readonly y: number } & ZoomRect,
  frame: { readonly x: number; readonly y: number },
): ZoomBox => ({
  left: picture.x - frame.x,
  top: picture.y - frame.y,
  width: picture.width,
  height: picture.height,
});

/** Whether two painted boxes are the same box, to one point. */
export const sameBox = (
  left: { readonly x: number; readonly y: number } & ZoomRect,
  right: { readonly x: number; readonly y: number } & ZoomRect,
): boolean =>
  Math.abs(left.x - right.x) <= 1 &&
  Math.abs(left.y - right.y) <= 1 &&
  Math.abs(left.width - right.width) <= 1 &&
  Math.abs(left.height - right.height) <= 1;

/** Whether two boxes are the same paint, to half a pixel. */
export const sameZoomBox = (left: ZoomBox, right: ZoomBox): boolean =>
  Math.abs(left.left - right.left) <= 0.5 &&
  Math.abs(left.top - right.top) <= 0.5 &&
  Math.abs(left.width - right.width) <= 0.5 &&
  Math.abs(left.height - right.height) <= 0.5;

/** A frame's declared size, which is also the picture's resting box. */
export const ZOOM_FRAME = {
  width: ZOOM_IMAGE.width,
  height: ZOOM_IMAGE.height,
} as const;

/**
 * Whether the box magnifies the picture by the factor it was asked for.
 *
 * The one claim a magnifier cannot be without: a box that is not larger than
 * the frame paints the picture no bigger, however far it travels.
 */
export const magnified = (box: ZoomBox, scale = ZOOM_SCALE): boolean =>
  Math.abs(box.width - ZOOM_FRAME.width * scale) <= 1 &&
  Math.abs(box.height - ZOOM_FRAME.height * scale) <= 1;

/**
 * Whether the picture covers the frame it is clipped by.
 *
 * The runtime paints no edge over a magnified child, so a box that fails to
 * cover its frame is the page showing through the frame's own edge.
 */
export const covers = (box: ZoomBox): boolean =>
  box.left <= 0.5 &&
  box.top <= 0.5 &&
  box.left + box.width >= ZOOM_FRAME.width - 0.5 &&
  box.top + box.height >= ZOOM_FRAME.height - 0.5;

/** The share of the picture a frame point lands on, `0…1` on each axis. */
const shareOf = (offset: number, size: number): number =>
  size > 0 ? offset / size : 0.5;

/**
 * The picture point a frame point shows.
 *
 * The mapping is the whole zoom: the runtime scales the buffer into the box, so
 * a frame point shows whatever picture point the box puts under it. Points
 * outside the box map outside the picture, which {@link pictureColour} refuses.
 */
export const picturePoint = (point: ZoomPoint, box: ZoomBox): ZoomPoint => ({
  x: ((point.x - box.left) * ZOOM_IMAGE.width) / box.width,
  y: ((point.y - box.top) * ZOOM_IMAGE.height) / box.height,
});

/**
 * The frame point a picture point paints at: the inverse of
 * {@link picturePoint}.
 *
 * The probe aims a sample at a **picture** spot (a mark) rather than at a frame
 * coordinate, so the capture is read where the box the runtime reported says
 * that spot must be.
 */
export const framePointOf = (point: ZoomPoint, box: ZoomBox): ZoomPoint => ({
  x: box.left + (point.x * box.width) / ZOOM_IMAGE.width,
  y: box.top + (point.y * box.height) / ZOOM_IMAGE.height,
});

/**
 * Whether `point` still shows the picture spot it showed at rest.
 *
 * The magnifier's promise in one predicate: the pointer's share of the frame is
 * the share of the picture painted under it. A box that grew without panning
 * fails on every off-centre point, and a box that panned to an edge fails on the
 * other axis.
 */
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

/**
 * The colour the picture itself carries at a point of its own coordinates.
 *
 * `None` outside the picture: a box that panned past the edge would otherwise
 * have a sample predicted for a spot that does not exist, and the sample would
 * be reported as a wrong colour rather than as a picture that left its frame.
 */
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

/**
 * The colour a frame point must paint for the box the runtime reported.
 *
 * The prediction follows the **measured** box, so it is not a second copy of
 * the zoom arithmetic: it answers "given the box the runtime painted, does the
 * host put the picture's own pixels in it".
 */
export const expectedPaint = (
  point: ZoomPoint,
  box: ZoomBox,
): Option.Option<Pixels.Rgba> => pictureColour(picturePoint(point, box));

/** What the probe's readout prints, so every check reads one line. */
export const zoomReadout = (state: {
  readonly point: ZoomPoint;
  readonly moves: number;
  readonly leaves: number;
}): string =>
  `point=${Math.round(state.point.x)},${Math.round(state.point.y)} ` +
  `moves=${state.moves} leaves=${state.leaves}`;

/**
 * The checks the probe asserts, so its documentation cannot drift.
 *
 * The four painted-box reads, the two sizes, the four hover deliveries, the
 * resting box and its six pixel samples, the five box invariants, the four
 * magnified samples and the square-corner reading, the two mark extents and
 * their ratio, the second hover's four checks, the panned capture's six
 * samples, and the three checks the return to rest carries add fifty-four.
 */
export const ZOOM_CHECKS = 54;
