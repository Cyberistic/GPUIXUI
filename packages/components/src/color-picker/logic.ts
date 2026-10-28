/**
 * The colour model behind `ColorPicker`: HSV in, hex out, and the WCAG readout.
 *
 * Hex is the only grammar. `@gpuix/native@0.11.0` paints a colour string, but
 * the picker's value has to survive a round trip through a control and a store,
 * and a colour function (`rgb()`, `hsl()`, `oklch()`) is a second grammar to
 * decode, format and keep in step. A hex value is one form: uppercase
 * `#RRGGBB`, with two alpha digits when the colour is not opaque.
 *
 * Shorthand is expanded at the boundary, because it is input rather than a
 * value: `#f0a` commits `#FF00AA`, and `#f0a8` commits `#FF00AA88`.
 */

import { contrastRatio } from "@gpuixui/tokens";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

/** Hue in degrees, saturation and value from 0 to 1, alpha from 0 to 1. */
export class Hsva extends Schema.Class<Hsva>("Hsva")({
  h: Schema.Number,
  s: Schema.Number,
  v: Schema.Number,
  a: Schema.Number,
}) {}

/** A colour the picker can paint: an opaque hex byte triple. */
export class OpaqueRgb extends Schema.Class<OpaqueRgb>("OpaqueRgb")({
  r: Schema.Number,
  g: Schema.Number,
  b: Schema.Number,
}) {}

/** The WCAG grade a contrast ratio earns. */
export type Grade = "AAA" | "AA" | "AA large" | "Fails";

/** The colour the picker starts from when the caller gave none. */
export const DEFAULT_COLOUR = "#000000";

/** The name a picker publishes when the caller's label says nothing. */
export const DEFAULT_COLOR_PICKER_LABEL = "Color picker";

/** The hex grammar, after the leading `#` is dropped and the text lowercased. */
const HEX_DIGITS = /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits = 0): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** A channel from 0 to 1 as the byte the runtime paints. */
const byteOf = (channel: number): number => Math.round(clamp(channel) * 255);

/** A channel from 0 to 1 as two uppercase hex digits. */
const hexByte = (channel: number): string =>
  byteOf(channel).toString(16).padStart(2, "0").toUpperCase();

const hexOf = ({ r, g, b }: OpaqueRgb): string =>
  `#${hexByte(r)}${hexByte(g)}${hexByte(b)}`;

/** HSV as sRGB channels from 0 to 1. */
export const hsvToRgb = ({ h, s, v }: Hsva): OpaqueRgb => {
  const channel = (n: number): number => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return new OpaqueRgb({ r: channel(5), g: channel(3), b: channel(1) });
};

/**
 * sRGB channels as HSV.
 *
 * A grey has no hue, so the caller's `hue` stands: a picker that reset it would
 * jump a drag through the middle of the area to red.
 */
export const rgbToHsva = (
  { r, g, b }: OpaqueRgb,
  alpha: number,
  hue = 0,
): Hsva => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const distance = max - min;
  let h = hue;
  if (distance > 1e-6) {
    if (max === r) h = 60 * (((g - b) / distance) % 6);
    else if (max === g) h = 60 * ((b - r) / distance + 2);
    else h = 60 * ((r - g) / distance + 4);
    if (h < 0) h += 360;
  }
  return new Hsva({ h, s: max === 0 ? 0 : distance / max, v: max, a: alpha });
};

/** The colour as uppercase hex, with alpha digits when it is not opaque. */
export const toHex = (hsva: Hsva): string =>
  `${hexOf(hsvToRgb(hsva))}${hsva.a < 0.999 ? hexByte(hsva.a) : ""}`;

/** The colour with its alpha dropped. */
export const opaqueHex = (hsva: Hsva): string => hexOf(hsvToRgb(hsva));

/** Read `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`; absence for anything else. */
export const parseColor = (input: string, hue = 0): Option.Option<Hsva> => {
  const digits = pipe(Str.trim(input), Str.replace(/^#/, ""), Str.toLowerCase);
  if (!HEX_DIGITS.test(digits)) return Option.none();
  const expanded =
    digits.length <= 4
      ? pipe(
          Str.split("")(digits),
          Arr.map((digit) => `${digit}${digit}`),
          Arr.join(""),
        )
      : digits;
  const at = (index: number): number =>
    Number.parseInt(expanded.slice(index, index + 2), 16) / 255;
  const rgb = new OpaqueRgb({ r: at(0), g: at(2), b: at(4) });
  return Option.some(rgbToHsva(rgb, expanded.length === 8 ? at(6) : 1, hue));
};

/** Whether two written colours describe the same value. */
export const sameColor = (left: string, right: string): boolean =>
  pipe(
    Option.all([parseColor(left), parseColor(right)]),
    Option.exists(([a, b]) => toHex(a) === toHex(b)),
  );

/** The colour with `amount` of it mixed into `background`. */
export const composite = (hsva: Hsva, background: Hsva): OpaqueRgb => {
  const fg = hsvToRgb(hsva);
  const bg = hsvToRgb(background);
  const mix = (front: number, back: number): number =>
    front * hsva.a + back * (1 - hsva.a);
  return new OpaqueRgb({
    r: mix(fg.r, bg.r),
    g: mix(fg.g, bg.g),
    b: mix(fg.b, bg.b),
  });
};

/**
 * The WCAG ratio of the colour, composited over `background`, against it.
 *
 * `None` when the background is not a colour the picker can read: a ratio needs
 * two opaque fills, and inventing the missing one would report a number about a
 * surface nobody named.
 */
export const contrast = (
  hsva: Hsva,
  background: string,
): Option.Option<number> =>
  pipe(
    parseColor(background),
    Option.flatMap((parsed) =>
      Option.fromNullishOr(
        contrastRatio(hexOf(composite(hsva, parsed)), hexOf(hsvToRgb(parsed))),
      ),
    ),
  );

/** The grade a ratio earns. */
export const grade = (ratio: number): Grade =>
  ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "Fails";

/** The draft a stored value carries: the text as written, or absence. */
export const storedDraft = (value: unknown): Option.Option<string> =>
  P.isString(value) ? Option.some(value) : Option.none();

/**
 * The swatch list a stored value carries: its text entries, or absence.
 *
 * A palette is saved data as often as a literal, so only a list is a list, and
 * an entry that is not a non-blank colour is dropped rather than painted as an
 * unnamed cell. An empty list stays empty: it is the caller's own choice.
 */
export const storedSwatches = (
  value: unknown,
): Option.Option<ReadonlyArray<string>> =>
  Arr.isArray(value)
    ? Option.some(
        pipe(
          value,
          Arr.filter(P.isString),
          Arr.filter((entry) => Str.isNonEmpty(Str.trim(entry))),
        ),
      )
    : Option.none();

/** The visually different stops a six-segment hue rail paints, in order. */
export const HUE_STOPS = [
  "#FF0000",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#0000FF",
  "#FF00FF",
  "#FF0000",
] as const;

/** The fraction a hue sits at on the rail. */
export const hueFraction = (hue: number): number => round(clamp(hue / 360), 4);
