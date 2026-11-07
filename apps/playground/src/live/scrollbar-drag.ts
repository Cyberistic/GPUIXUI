import * as Option from "effect/Option";
import { thumbOf, type ThumbBox } from "./scrollbar.js";

export const DRAG_IDS = {
  probe: "scrollbar-drag-probe",
  scroller: "scrollbar-drag",
  content: "scrollbar-drag-content",
  handle: "scrollbar-drag-handle",
  readout: "scrollbar-drag-readout",
} as const;

export const DRAG_VIEWPORT = { width: 200, height: 160 } as const;

export const DRAG_CONTENT = 700;

export const DRAG_FILL = "#1E2A38";

export const DRAG_TINT = "#00E0C6";

export const DRAG_THICKNESS = 12;

export const DRAG_THUMB: ThumbBox = Option.getOrElse(
  thumbOf(DRAG_VIEWPORT.height, DRAG_CONTENT, 0),
  () => ({ start: 0, length: 0 }),
);

export const DRAG_BY = 40;

export const DRAG_GRAB = {
  x: DRAG_VIEWPORT.width / 2 - DRAG_THICKNESS / 2,
  y: DRAG_THUMB.start + DRAG_THUMB.length / 2 - DRAG_VIEWPORT.height / 2,
} as const;

export const DRAG_TRACK_GRAB = {
  x: DRAG_GRAB.x,
  y: DRAG_VIEWPORT.height / 2 - 40,
} as const;

export const DRAG_WHEEL = -100;

export const dragThumbAfter = (offset: number): ThumbBox =>
  Option.getOrElse(thumbOf(DRAG_VIEWPORT.height, DRAG_CONTENT, offset), () => ({
    start: 0,
    length: 0,
  }));

export const DRAG_BAND = {
  x: DRAG_VIEWPORT.width - DRAG_THICKNESS,
  y: 0,
  width: DRAG_THICKNESS,
  height: DRAG_VIEWPORT.height,
} as const;

export const DRAG_CHECKS = 1 + 1 + 1 + 3 + 3 + 3 + 2 + 2 + 2 + 3;
