export const ELEVATION_IDS = {
  offset: "elevation-offset",
  blur: "elevation-blur",
  spread: "elevation-spread",
  inset: "elevation-inset",
  outset: "elevation-outset",
  stacked: "elevation-stacked",
  unreadable: "elevation-unreadable",
  resting: "elevation-resting",
  deepest: "elevation-deepest",
} as const;

export const ELEVATION_SHADOW = "#FF3B30";

export const ELEVATION_SECOND = "#0A84FF";

export const ELEVATION_FILL = "#E7E9EE";

export const ELEVATION_WIDTH = 120;
export const ELEVATION_HEIGHT = 48;

export const ELEVATION_ROW = 130;

export const ELEVATION_OFFSET = 16;

export const ELEVATION_BLUR = 24;
export const ELEVATION_SPREAD = 8;

export const ELEVATION_INSIDE = 4;

export const ELEVATION_NEAR = 8;

export const ELEVATION_FAR = 48;

export const ELEVATION_FADE_NEAR = 4;
export const ELEVATION_FADE_MID = 16;

export const ELEVATION_DEPTH = 20;

export const ELEVATION_RAISED = { width: 220, height: 120 } as const;

export const ELEVATION_UNREADABLE = "notacolour";

export interface ShadowBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const aroundBox = (
  box: ShadowBox,
  distance: number,
): {
  readonly above: number;
  readonly below: number;
  readonly left: number;
  readonly middleY: number;
  readonly middleX: number;
  readonly right: number;
} => ({
  above: box.y - distance,
  below: box.y + box.height + distance,
  left: box.x - distance,
  right: box.x + box.width + distance,
  middleX: box.x + box.width / 2,
  middleY: box.y + box.height / 2,
});
