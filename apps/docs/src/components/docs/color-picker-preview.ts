/**
 * The color picker preview's model: the value grammar, the commit rule, and the
 * two-stop layers the runtime paints.
 *
 * The site cannot mount a GPUix component, so the drawing mirrors the shipped
 * picker with HTML and CSS. `color-picker-drawing.test.tsx` executes this
 * grammar beside the component's own (`color-picker/logic.ts`), so the two
 * cannot drift, and holds the style sheet to the component's recipes.
 */

import type { Theme } from "@gpuixui/tokens";

/** Hue in degrees, saturation and value from 0 to 1, alpha from 0 to 1. */
export interface Hsva {
  readonly h: number;
  readonly s: number;
  readonly v: number;
  readonly a: number;
}

/** The six theme roles the picker offers when a caller passes no presets. */
export const swatchRoles = [
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive",
  "foreground",
] as const;

/** A role from the theme's palette. */
export type SwatchRole = (typeof swatchRoles)[number];

/** One preset: the role it is named for and the colour it commits. */
export interface Swatch {
  readonly role: string;
  readonly value: string;
}

/** The picker's default presets, in the component's own order. */
export const defaultSwatches = (theme: Theme): ReadonlyArray<Swatch> =>
  swatchRoles.map((role) => ({
    role,
    value: theme.colors[role].toUpperCase(),
  }));

/** A caller's own palette, to show that `swatches` replaces the defaults. */
export const brandSwatches: ReadonlyArray<Swatch> = [
  { role: "ink", value: "#0F172A" },
  { role: "ocean", value: "#2563EB" },
  { role: "teal", value: "#0D9488" },
  { role: "amber", value: "#D97706" },
];

/** The hex grammar: `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`. */
const HEX = /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

/** A channel from 0 to 1 as two uppercase hex digits. */
const hexByte = (channel: number): string =>
  Math.round(clamp(channel) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

/** HSV as sRGB channels from 0 to 1. */
export const hsvToRgb = ({ h, s, v }: Hsva) => {
  const channel = (n: number): number => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: channel(5), g: channel(3), b: channel(1) };
};

/** sRGB as HSV, keeping `hue` for a grey. */
export const rgbToHsva = (
  r: number,
  g: number,
  b: number,
  a: number,
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
  return { h, s: max === 0 ? 0 : distance / max, v: max, a };
};

/** The colour as uppercase hex, with alpha digits when it is not opaque. */
export const toHex = (hsva: Hsva): string => {
  const { r, g, b } = hsvToRgb(hsva);
  return `#${hexByte(r)}${hexByte(g)}${hexByte(b)}${
    hsva.a < 0.999 ? hexByte(hsva.a) : ""
  }`;
};

/** Read a hex colour; `undefined` for anything else. */
export const parseHex = (input: string, hue = 0): Hsva | undefined => {
  const digits = input.trim().replace(/^#/, "").toLowerCase();
  if (!HEX.test(digits)) return undefined;
  const expanded =
    digits.length <= 4
      ? [...digits].map((digit) => `${digit}${digit}`).join("")
      : digits;
  const at = (index: number): number =>
    Number.parseInt(expanded.slice(index, index + 2), 16) / 255;
  return rgbToHsva(at(0), at(2), at(4), expanded.length === 8 ? at(6) : 1, hue);
};

/** Whether two written colours describe the same value. */
export const sameColour = (left: string, right: string): boolean => {
  const a = parseHex(left);
  const b = parseHex(right);
  return a !== undefined && b !== undefined && toHex(a) === toHex(b);
};

/** The opaque colour the picker samples with. */
export const opaqueHex = (hsva: Hsva): string => toHex({ ...hsva, a: 1 });

/** The colour with `amount` of it mixed over an opaque `background`. */
export const composite = (hsva: Hsva, background: Hsva) => {
  const fg = hsvToRgb(hsva);
  const bg = hsvToRgb(background);
  return {
    r: fg.r * hsva.a + bg.r * (1 - hsva.a),
    g: fg.g * hsva.a + bg.g * (1 - hsva.a),
    b: fg.b * hsva.a + bg.b * (1 - hsva.a),
  };
};

/** The WCAG relative luminance of an opaque channel triple. */
const luminance = ({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}): number => {
  const linear = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

/** The WCAG ratio of the colour, composited over `background`, against it. */
export const contrast = (
  hsva: Hsva,
  background: string,
): number | undefined => {
  const bg = parseHex(background);
  if (bg === undefined) return undefined;
  // The component measures the bytes it paints, so the drawing rounds the
  // composite to the same hex before measuring it.
  const mixedRgb = composite(hsva, bg);
  const mixed = luminance({
    r: Math.round(mixedRgb.r * 255) / 255,
    g: Math.round(mixedRgb.g * 255) / 255,
    b: Math.round(mixedRgb.b * 255) / 255,
  });
  const pageRgb = hsvToRgb(bg);
  const page = luminance({
    r: Math.round(pageRgb.r * 255) / 255,
    g: Math.round(pageRgb.g * 255) / 255,
    b: Math.round(pageRgb.b * 255) / 255,
  });
  return (Math.max(mixed, page) + 0.05) / (Math.min(mixed, page) + 0.05);
};

/** The grade a ratio earns. */
export const grade = (ratio: number): string =>
  ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "Fails";

/** The layer CSS a saturation/value area paints over its hue. */
export const areaLayers: ReadonlyArray<string> = [
  "linear-gradient(to right, #FFFFFF, #FFFFFF00)",
  "linear-gradient(to top, #000000, #00000000)",
];

/** The six ramps of the hue rail, left to right. */
export const hueStops = [
  "#FF0000",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#0000FF",
  "#FF00FF",
  "#FF0000",
] as const;

/** The ramp of one hue segment. */
export const hueSegment = (index: number): string =>
  `linear-gradient(to right, ${hueStops[index] ?? "#FF0000"}, ${hueStops[index + 1] ?? "#FF0000"})`;

/** The alpha rail: the colour at full alpha over a clear left end. */
export const alphaRamp = (hsva: Hsva): string =>
  `linear-gradient(to right, ${opaqueHex(hsva)}00, ${opaqueHex(hsva)})`;

/** The three values a commit or a preset press produces. */
export interface Committed {
  readonly value: string;
  readonly draft: string;
  readonly changed: boolean;
}

/** Commit a typed draft: a valid one is the value, an invalid one is discarded. */
export const commit = (draft: string, value: string, hue = 0): Committed => {
  const next = parseHex(draft, hue);
  return next === undefined
    ? { value, draft: value, changed: false }
    : {
        value: toHex(next),
        draft: toHex(next),
        changed: !sameColour(toHex(next), value),
      };
};

/** Press a preset: the colour is the value at once. */
export const choose = (swatch: string, value: string, hue = 0): Committed => {
  const next = parseHex(swatch, hue);
  const hex = next === undefined ? swatch : toHex(next);
  return { value: hex, draft: hex, changed: !sameColour(hex, value) };
};

/** The role of the preset the value names, or `undefined` for a custom colour. */
export const chosenRole = (
  swatches: ReadonlyArray<Swatch>,
  value: string,
): string | undefined =>
  swatches.find((swatch) => sameColour(swatch.value, value))?.role;

/** The readout the workflow prints under the picker. */
export const describe = (value: string, draft: string): string =>
  `value=${value} draft=${draft} ${parseHex(draft) === undefined ? "invalid" : "valid"}`;
