/**
 * A two-stop linear gradient as pure colour maths (plan `807`).
 *
 * `@gpuix/native@0.10.0` paints `StyleDesc.background` as a texture: two stops,
 * a CSS angle and an interpolation space. The frame is the evidence; this module
 * is the expectation it is compared against, written from the CSS Oklab
 * definition rather than from the runtime's shader, so a shader that ignores the
 * declared space cannot make its own check pass.
 *
 * The measured band is 2 channels on the sRGB path and 12 on the Oklab path (the
 * shader interpolates in half floats), so `channelDistance` exists for the
 * caller to state which band it means.
 */
import { Match } from "effect";
import type { Smoke } from "@gpuixui/testing";
import { Pixels } from "@gpuixui/testing";

export type GradientColourSpace = "srgb" | "oklab";

export interface GradientStop {
  readonly color: Pixels.Rgba;
  readonly position: number;
}

/** The runtime's `LinearGradientBackground`, with the colours decoded. */
export interface Gradient {
  readonly angle: number;
  readonly stops: readonly [GradientStop, GradientStop];
  readonly colorSpace?: GradientColourSpace;
}

/** Where `t` falls between the two stops, clamped to their flat bands. */
const progress = (stops: readonly [GradientStop, GradientStop], t: number) => {
  const [from, to] = stops;
  const span = to.position - from.position;
  if (span <= 0) return t < from.position ? 0 : 1;
  return Math.min(1, Math.max(0, (t - from.position) / span));
};

const mixChannel = (from: number, to: number, t: number): number =>
  Math.round(from + (to - from) * t);

const mix = (from: Pixels.Rgba, to: Pixels.Rgba, t: number): Pixels.Rgba =>
  new Pixels.Rgba({
    r: mixChannel(from.r, to.r, t),
    g: mixChannel(from.g, to.g, t),
    b: mixChannel(from.b, to.b, t),
    a: mixChannel(from.a, to.a, t),
  });

/** The sRGB-space mix at `t`, independent of the gradient's `colorSpace`. */
export const srgbAt = (gradient: Gradient, t: number): Pixels.Rgba =>
  mix(
    gradient.stops[0].color,
    gradient.stops[1].color,
    progress(gradient.stops, t),
  );

interface Oklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

const toLinear = (channel: number): number => {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const toSrgb = (linear: number): number => {
  const v = Math.min(1, Math.max(0, linear));
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
};

const toOklab = ({ r, g, b }: Pixels.Rgba): Oklab => {
  const red = toLinear(r);
  const green = toLinear(g);
  const blue = toLinear(b);
  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};

const fromOklab = ({ l, a, b }: Oklab): Pixels.Rgba => {
  const lmsL = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const lmsM = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const lmsS = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const red = 4.0767416621 * lmsL - 3.3077115913 * lmsM + 0.2309699292 * lmsS;
  const green =
    -1.2684380046 * lmsL + 2.6097574011 * lmsM - 0.3413193965 * lmsS;
  const blue = -0.0041960863 * lmsL - 0.7034186147 * lmsM + 1.707614701 * lmsS;
  return new Pixels.Rgba({
    r: Math.round(toSrgb(red) * 255),
    g: Math.round(toSrgb(green) * 255),
    b: Math.round(toSrgb(blue) * 255),
    a: 255,
  });
};

/** The CSS-Oklab mix at `t`. Opaque stops only, as the fixtures are. */
export const oklabAt = (gradient: Gradient, t: number): Pixels.Rgba => {
  const [from, to] = gradient.stops;
  const at = progress(gradient.stops, t);
  const left = toOklab(from.color);
  const right = toOklab(to.color);
  return fromOklab({
    l: left.l + (right.l - left.l) * at,
    a: left.a + (right.a - left.a) * at,
    b: left.b + (right.b - left.b) * at,
  });
};

/** The mix in the space the gradient declares. */
export const colourAt = (gradient: Gradient, t: number): Pixels.Rgba =>
  Match.value(gradient.colorSpace ?? "srgb").pipe(
    Match.when("oklab", () => oklabAt(gradient, t)),
    Match.when("srgb", () => srgbAt(gradient, t)),
    Match.exhaustive,
  );

/** The largest per-channel delta, which is what a colour band is stated in. */
export const channelDistance = (
  left: Pixels.Rgba,
  right: Pixels.Rgba,
): number =>
  Math.max(
    Math.abs(left.r - right.r),
    Math.abs(left.g - right.g),
    Math.abs(left.b - right.b),
    Math.abs(left.a - right.a),
  );

/** A point at fraction `t` across a box, on its middle line. */
export const pointAt = (
  box: Smoke.Bounds,
  t: number,
  axis: "x" | "y",
): { readonly x: number; readonly y: number } =>
  Match.value(axis).pipe(
    Match.when("x", () => ({
      x: box.x + box.width * t,
      y: box.y + box.height / 2,
    })),
    Match.when("y", () => ({
      x: box.x + box.width / 2,
      y: box.y + box.height * t,
    })),
    Match.exhaustive,
  );
