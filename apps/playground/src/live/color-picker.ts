import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

export const SWATCH_ROLES = [
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive",
  "foreground",
] as const;

export type SwatchRole = (typeof SWATCH_ROLES)[number];

export const COLOR_PICKER_IDS = {
  probe: "color-picker-probe",
  readout: "color-picker-readout",
  enabled: "cp",
  disabled: "dp",
  before: "dp-before",
  after: "dp-after",
} as const;

export const INITIAL_ROLE: SwatchRole = "primary";

export const PRESSED_ROLE: SwatchRole = "accent";

export const TYPED_DRAFT = "f0a";

export const TYPED_COLOUR = "#FF00AA";

export const INVALID_DRAFT = "zz";

export const AREA_POINT = { x: 0.25, y: 0.25 } as const;

export const AREA_SATURATION = 0.25;
export const AREA_VALUE = 0.75;

export const partId = (
  testId: string,
  part:
    | "panel"
    | "swatch"
    | "area"
    | "hue"
    | "alpha"
    | "hex"
    | "error"
    | "preset",
): string => `${testId}-${part}`;

export const presetId = (testId: string, index: number): string =>
  `${partId(testId, "preset")}-${index}`;

export interface ColorPickerState {
  readonly value: string;

  readonly changes: number;

  readonly refused: number;
}

export const colorPickerReadout = (state: ColorPickerState): string =>
  `value=${state.value} changes=${state.changes} refused=${state.refused}`;

export const swatchColour = (
  colours: Readonly<Record<SwatchRole, string>>,
  role: SwatchRole,
): string => (colours[role] ?? "").toUpperCase();

const hueOf = (hex: string): number => {
  const digits = hex.replace(/^#/, "");
  const channel = (index: number): number =>
    Number.parseInt(digits.slice(index, index + 2), 16) / 255;
  const r = channel(0);
  const g = channel(2);
  const b = channel(4);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const distance = max - min;
  if (distance === 0) return 0;
  const h =
    max === r
      ? 60 * (((g - b) / distance) % 6)
      : max === g
        ? 60 * ((b - r) / distance + 2)
        : 60 * ((r - g) / distance + 4);
  return h < 0 ? h + 360 : h;
};

export const areaColour = (hex: string): string => {
  const h = hueOf(hex);
  const s = AREA_SATURATION;
  const v = AREA_VALUE;
  const channel = (n: number): number => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const byte = (value: number): string =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${byte(channel(5))}${byte(channel(3))}${byte(channel(1))}`;
};

export const areaOf = (
  hex: string,
): { readonly s: number; readonly v: number } => {
  const digits = hex.replace(/^#/, "");
  const channel = (index: number): number =>
    Number.parseInt(digits.slice(index, index + 2), 16) / 255;
  const max = Math.max(channel(0), channel(2), channel(4));
  const min = Math.min(channel(0), channel(2), channel(4));
  return { s: max === 0 ? 0 : (max - min) / max, v: max };
};

export interface PaintedBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const pointIn = (
  box: PaintedBox,
  share: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } => ({
  x: Math.round(box.width * share.x),
  y: Math.round(box.height * share.y),
});

export const boxRegion = (box: PaintedBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.max(1, Math.round(box.width * scale)),
    height: Math.max(1, Math.round(box.height * scale)),
  });

export const inkIn = (
  frame: Pixels.Pixels,
  region: Pixels.PixelRegion,
  ink: Pixels.Rgba,
): number =>
  Option.match(Option.fromNullishOr(Pixels.crop(frame, region)), {
    onNone: () => -1,
    onSome: (crop) => Pixels.countColour(crop, ink),
  });

export const COLOR_PICKER_CHECKS = 15;
