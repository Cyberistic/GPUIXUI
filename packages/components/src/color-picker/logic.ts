import { contrastRatio } from "@gpuixui/tokens";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

export class Hsva extends Schema.Class<Hsva>("Hsva")({
  h: Schema.Number,
  s: Schema.Number,
  v: Schema.Number,
  a: Schema.Number,
}) {}

export class OpaqueRgb extends Schema.Class<OpaqueRgb>("OpaqueRgb")({
  r: Schema.Number,
  g: Schema.Number,
  b: Schema.Number,
}) {}

export type Grade = "AAA" | "AA" | "AA large" | "Fails";

export const DEFAULT_COLOUR = "#000000";

export const DEFAULT_COLOR_PICKER_LABEL = "Color picker";

const HEX_DIGITS = /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number, digits = 0): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const byteOf = (channel: number): number => Math.round(clamp(channel) * 255);

const hexByte = (channel: number): string =>
  byteOf(channel).toString(16).padStart(2, "0").toUpperCase();

const hexOf = ({ r, g, b }: OpaqueRgb): string =>
  `#${hexByte(r)}${hexByte(g)}${hexByte(b)}`;

export const hsvToRgb = ({ h, s, v }: Hsva): OpaqueRgb => {
  const channel = (n: number): number => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return new OpaqueRgb({ r: channel(5), g: channel(3), b: channel(1) });
};

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

export const toHex = (hsva: Hsva): string =>
  `${hexOf(hsvToRgb(hsva))}${hsva.a < 0.999 ? hexByte(hsva.a) : ""}`;

export const opaqueHex = (hsva: Hsva): string => hexOf(hsvToRgb(hsva));

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

export const sameColor = (left: string, right: string): boolean =>
  pipe(
    Option.all([parseColor(left), parseColor(right)]),
    Option.exists(([a, b]) => toHex(a) === toHex(b)),
  );

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

export const grade = (ratio: number): Grade =>
  ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "Fails";

export const storedDraft = (value: unknown): Option.Option<string> =>
  P.isString(value) ? Option.some(value) : Option.none();

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

export const HUE_STOPS = [
  "#FF0000",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#0000FF",
  "#FF00FF",
  "#FF0000",
] as const;

export const hueFraction = (hue: number): number => round(clamp(hue / 360), 4);
