import type { LinearGradientBackground } from "@gpuix/react";
import * as Option from "effect/Option";

export interface ScrollSample {
  readonly offsetY: number;

  readonly viewportHeight: number;

  readonly contentHeight: number;
}

export interface ScrollMetrics {
  readonly progress: number;

  readonly offsetY: number;

  readonly scrollable: boolean;

  readonly atStart: boolean;

  readonly atEnd: boolean;
}

export type ScrollEdge = "top" | "bottom";

const finite = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

export const scrollMetrics = (sample: ScrollSample): ScrollMetrics => {
  const viewport = Math.max(0, finite(sample.viewportHeight, 0));
  const content = Math.max(0, finite(sample.contentHeight, 0));
  const offset = Math.min(0, finite(sample.offsetY, 0));
  const overflow = Math.max(0, content - viewport);

  const scrollable = overflow > 1;
  const travelled = scrollable ? Math.max(0, Math.min(overflow, -offset)) : 0;

  return {
    progress: scrollable ? travelled / overflow : 0,

    offsetY: travelled === 0 ? 0 : -travelled,
    scrollable,
    atStart: !scrollable || -offset <= 1,
    atEnd: !scrollable || -offset >= overflow - 1,
  };
};

export interface EdgeFadeColors {
  readonly solid: string;

  readonly clear: string;
}

export const edgeGradient = (
  edge: ScrollEdge,
  colors: EdgeFadeColors,
): LinearGradientBackground => ({
  type: "linear-gradient",
  angle: edge === "top" ? 180 : 0,
  stops: [
    { color: colors.solid, position: 0 },
    { color: colors.clear, position: 1 },
  ],
});

export const scrollSize = (
  value: Option.Option<number>,
  fallback: number,
): number =>
  Option.match(value, {
    onNone: () => fallback,
    onSome: (size) =>
      Number.isFinite(size) && size > 0 ? Math.round(size) : fallback,
  });
