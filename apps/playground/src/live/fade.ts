import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import type { Point } from "./frame.js";

export const FADE_LEVEL = "slow";

export const FADE_DURATION_MS = 320;

export const FADE_PARTIAL_MS = Math.round(FADE_DURATION_MS / 3);

export const FADE_REST_MS = FADE_DURATION_MS + 80;

export const FADE_CAPTURE_ATTEMPTS = 6;

export const FADE_BACKING = "#FFFFFF";

export const FADE_BACKING_RGBA = new Pixels.Rgba({
  r: 0xff,
  g: 0xff,
  b: 0xff,
  a: 255,
});

export const FADE_SAMPLE_INSET = 12;

export interface FadeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const fadeSample = (box: FadeBox): Point => ({
  x: box.x + FADE_SAMPLE_INSET,
  y: box.y + box.height / 2,
});

export const surfaceFadeColour = (
  popover: string,
): Option.Option<Pixels.Rgba> =>
  Option.fromNullishOr(Pixels.hexToRgba(popover));

export const isFading = (
  sample: Pixels.Rgba,
  backing: Pixels.Rgba,
  surface: Pixels.Rgba,
  slack = 4,
): boolean => {
  const between = (value: number, from: number, to: number): boolean => {
    const low = Math.min(from, to);
    const high = Math.max(from, to);
    return (
      high - low > slack * 2 && value > low + slack && value < high - slack
    );
  };
  return (
    sample.a === surface.a &&
    between(sample.r, backing.r, surface.r) &&
    between(sample.g, backing.g, surface.g) &&
    between(sample.b, backing.b, surface.b)
  );
};

export const isSurface = (sample: Pixels.Rgba, surface: Pixels.Rgba): boolean =>
  sample.r === surface.r &&
  sample.g === surface.g &&
  sample.b === surface.b &&
  sample.a === surface.a;

export const isBacking = (sample: Pixels.Rgba, backing: Pixels.Rgba): boolean =>
  isSurface(sample, backing);
