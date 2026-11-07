import type { Theme } from "@gpuixui/tokens";

export interface Hsva {
  readonly h: number;
  readonly s: number;
  readonly v: number;
  readonly a: number;
}

export const swatchRoles = [
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive",
  "foreground",
] as const;

export type SwatchRole = (typeof swatchRoles)[number];

export interface Swatch {
  readonly role: string;
  readonly value: string;
}

export const defaultSwatches = (theme: Theme): ReadonlyArray<Swatch> =>
  swatchRoles.map((role) => ({
    role,
    value: theme.colors[role].toUpperCase(),
  }));

export const brandSwatches: ReadonlyArray<Swatch> = [
  { role: "ink", value: "#0F172A" },
  { role: "ocean", value: "#2563EB" },
  { role: "teal", value: "#0D9488" },
  { role: "amber", value: "#D97706" },
];

const HEX = /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

const hexByte = (channel: number): string =>
  Math.round(clamp(channel) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

export const hsvToRgb = ({ h, s, v }: Hsva) => {
  const channel = (n: number): number => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: channel(5), g: channel(3), b: channel(1) };
};

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

export const toHex = (hsva: Hsva): string => {
  const { r, g, b } = hsvToRgb(hsva);
  return `#${hexByte(r)}${hexByte(g)}${hexByte(b)}${
    hsva.a < 0.999 ? hexByte(hsva.a) : ""
  }`;
};

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

export const sameColour = (left: string, right: string): boolean => {
  const a = parseHex(left);
  const b = parseHex(right);
  return a !== undefined && b !== undefined && toHex(a) === toHex(b);
};

export const opaqueHex = (hsva: Hsva): string => toHex({ ...hsva, a: 1 });

export const composite = (hsva: Hsva, background: Hsva) => {
  const fg = hsvToRgb(hsva);
  const bg = hsvToRgb(background);
  return {
    r: fg.r * hsva.a + bg.r * (1 - hsva.a),
    g: fg.g * hsva.a + bg.g * (1 - hsva.a),
    b: fg.b * hsva.a + bg.b * (1 - hsva.a),
  };
};

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

export const contrast = (
  hsva: Hsva,
  background: string,
): number | undefined => {
  const bg = parseHex(background);
  if (bg === undefined) return undefined;

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

export const grade = (ratio: number): string =>
  ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "Fails";

export const areaLayers: ReadonlyArray<string> = [
  "linear-gradient(to right, #FFFFFF, #FFFFFF00)",
  "linear-gradient(to top, #000000, #00000000)",
];

export const hueStops = [
  "#FF0000",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#0000FF",
  "#FF00FF",
  "#FF0000",
] as const;

export const hueSegment = (index: number): string =>
  `linear-gradient(to right, ${hueStops[index] ?? "#FF0000"}, ${hueStops[index + 1] ?? "#FF0000"})`;

export const alphaRamp = (hsva: Hsva): string =>
  `linear-gradient(to right, ${opaqueHex(hsva)}00, ${opaqueHex(hsva)})`;

export interface Committed {
  readonly value: string;
  readonly draft: string;
  readonly changed: boolean;
}

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

export const choose = (swatch: string, value: string, hue = 0): Committed => {
  const next = parseHex(swatch, hue);
  const hex = next === undefined ? swatch : toHex(next);
  return { value: hex, draft: hex, changed: !sameColour(hex, value) };
};

export const chosenRole = (
  swatches: ReadonlyArray<Swatch>,
  value: string,
): string | undefined =>
  swatches.find((swatch) => sameColour(swatch.value, value))?.role;

export const railFraction = (
  pointer: number,
  box: { readonly left: number; readonly width: number },
): number => (box.width <= 0 ? 0 : clamp((pointer - box.left) / box.width));

export const areaFractions = (
  pointer: { readonly clientX: number; readonly clientY: number },
  box: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  },
): { readonly saturation: number; readonly brightness: number } => ({
  saturation:
    box.width <= 0 ? 0 : clamp((pointer.clientX - box.left) / box.width),
  brightness:
    box.height <= 0 ? 0 : clamp(1 - (pointer.clientY - box.top) / box.height),
});

export const hueAt = (fraction: number): number => {
  const clamped = clamp(fraction);
  if (clamped >= 1) return 0;
  return Math.min(359, Math.round(clamped * 360));
};
