/**
 * The `color-picker-lifecycle` fixture: the two pickers the probe paints, the
 * readout its state prints, and the geometry a window's press is aimed with.
 *
 * `ColorPicker` makes three claims a renderer suite cannot check on its own:
 * the trigger opens a floating panel below itself, a press on the
 * saturation/value area commits the colour under the pointer, and a refused
 * draft paints the field's destructive edge without reaching the value. The
 * behaviour suite reads `aria-valuetext` and the callback; this fixture lets a
 * window read the paint.
 */
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** The six theme roles the picker offers, in the component's own order. */
export const SWATCH_ROLES = [
  "primary",
  "secondary",
  "accent",
  "muted",
  "destructive",
  "foreground",
] as const;

/** One preset role. */
export type SwatchRole = (typeof SWATCH_ROLES)[number];

/** The `testId`s the view, the steps and the guard share. */
export const COLOR_PICKER_IDS = {
  probe: "color-picker-probe",
  readout: "color-picker-readout",
  enabled: "cp",
  disabled: "dp",
  before: "dp-before",
  after: "dp-after",
} as const;

/** The preset the picker starts on: the theme's `primary` role. */
export const INITIAL_ROLE: SwatchRole = "primary";

/** The preset a press chooses. */
export const PRESSED_ROLE: SwatchRole = "accent";

/** What a reader types into the field (the `#` is optional input). */
export const TYPED_DRAFT = "f0a";

/** The value a typed draft commits. */
export const TYPED_COLOUR = "#FF00AA";

/** A draft the normal form refuses. */
export const INVALID_DRAFT = "zz";

/** Where the probe presses inside the area, as a share of each side. */
export const AREA_POINT = { x: 0.25, y: 0.25 } as const;

/** The saturation and value that point names. */
export const AREA_SATURATION = 0.25;
export const AREA_VALUE = 0.75;

/** A picker part's address beside its trigger. */
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

/** A preset's address, by index. */
export const presetId = (testId: string, index: number): string =>
  `${partId(testId, "preset")}-${index}`;

/** What the probe's readout prints. */
export interface ColorPickerState {
  /** The controlled value, in the component's normal form. */
  readonly value: string;
  /** How many values the enabled picker reported. */
  readonly changes: number;
  /** How many values the disabled picker reported (the refusal count). */
  readonly refused: number;
}

/** The readout: the value, the enabled picker's reports, the disabled one's. */
export const colorPickerReadout = (state: ColorPickerState): string =>
  `value=${state.value} changes=${state.changes} refused=${state.refused}`;

/** The colour a role paints, in the component's normal form. */
export const swatchColour = (
  colours: Readonly<Record<SwatchRole, string>>,
  role: SwatchRole,
): string => (colours[role] ?? "").toUpperCase();

/** The hue, in degrees, of an opaque hex colour. */
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

/** The HSV colour a hex names at the fixture's press point. */
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

/** The saturation and value a written hex names. */
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

/** A painted box, as the runtime's layout report gives it. */
export interface PaintedBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A press point inside `box`, in the element's own coordinates. */
export const pointIn = (
  box: PaintedBox,
  share: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } => ({
  x: Math.round(box.width * share.x),
  y: Math.round(box.height * share.y),
});

/** A box's whole rectangle in the capture's device pixels. */
export const boxRegion = (box: PaintedBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.max(1, Math.round(box.width * scale)),
    height: Math.max(1, Math.round(box.height * scale)),
  });

/** The ink a region of `frame` paints, or `-1` for a region off the frame. */
export const inkIn = (
  frame: Pixels.Pixels,
  region: Pixels.PixelRegion,
  ink: Pixels.Rgba,
): number =>
  Option.match(Option.fromNullishOr(Pixels.crop(frame, region)), {
    onNone: () => -1,
    onSome: (crop) => Pixels.countColour(crop, ink),
  });

/** The checks the probe asserts on a green run. */
export const COLOR_PICKER_CHECKS = 15;
