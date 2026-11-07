import type { EventPayload, MotionStyle } from "@gpuix/react";
import * as Option from "effect/Option";
import { measuredPoint, type MeasuredBox } from "@gpuixui/components/authoring";

export interface RipplePoint {
  readonly x: number;
  readonly y: number;
}

export interface RippleFrames {
  readonly initial: MotionStyle;
  readonly animate: MotionStyle;
}

export const rippleOpacity = 0.28;

export const ripplePoint = (
  event: EventPayload,
  box: MeasuredBox,
): RipplePoint =>
  measuredPoint(event).pipe(
    Option.map((point) => ({ x: point.x - box.x, y: point.y - box.y })),
    Option.getOrElse(() => ({ x: box.width / 2, y: box.height / 2 })),
  );

export const rippleReach = (point: RipplePoint, box: MeasuredBox): number =>
  Math.ceil(
    Math.max(
      Math.hypot(point.x, point.y),
      Math.hypot(point.x - box.width, point.y),
      Math.hypot(point.x, point.y - box.height),
      Math.hypot(point.x - box.width, point.y - box.height),
    ),
  );

export const rippleFrames = (
  point: RipplePoint,
  reach: number,
): RippleFrames => ({
  initial: {
    width: 0,
    height: 0,
    left: point.x,
    top: point.y,
    borderRadius: 0,
    opacity: rippleOpacity,
  },
  animate: {
    width: reach * 2,
    height: reach * 2,
    left: point.x - reach,
    top: point.y - reach,
    borderRadius: reach,
    opacity: 0,
  },
});
