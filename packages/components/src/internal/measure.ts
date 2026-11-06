import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";

export interface MeasuredBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const measurable = (value: number | undefined): Option.Option<number> =>
  Option.filter(Option.fromNullishOr(value), Number.isFinite);

export const measuredBox = (event: EventPayload): Option.Option<MeasuredBox> =>
  Option.all({
    x: measurable(event.x),
    y: measurable(event.y),
    width: measurable(event.width),
    height: measurable(event.height),
  });

export const measuredHeight = (event: EventPayload): Option.Option<number> =>
  measurable(event.height);

export interface MeasuredPoint {
  readonly x: number;
  readonly y: number;
}

export const measuredPoint = (
  event: EventPayload,
): Option.Option<MeasuredPoint> =>
  Option.all({
    x: measurable(event.x),
    y: measurable(event.y),
  });
