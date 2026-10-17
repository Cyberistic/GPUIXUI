/**
 * Guards the WCAG contrast floors of every semantic text/surface pair in every
 * shipped theme, including the high-contrast variants. A palette edit that makes
 * text unreadable fails here rather than shipping.
 */
import { describe, expect, it } from "vitest";
import {
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  type ThemeColors,
} from "./color.js";

const channel = (hex: string, at: number): number =>
  Number.parseInt(hex.slice(at, at + 2), 16) / 255;

const linear = (value: number): number =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const luminance = (color: string): number => {
  const hex = color.slice(1);
  const red = linear(channel(hex, 0));
  const green = linear(channel(hex, 2));
  const blue = linear(channel(hex, 4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrast = (foreground: string, background: string): number => {
  const high = Math.max(luminance(foreground), luminance(background));
  const low = Math.min(luminance(foreground), luminance(background));
  return (high + 0.05) / (low + 0.05);
};

/** The contrast floor a pair is held to, by the class of text it carries. */
type PairClass = "body" | "secondary" | "boundary";

type Pair = readonly [keyof ThemeColors, keyof ThemeColors, PairClass];

const pairs: readonly Pair[] = [
  ["foreground", "background", "body"],
  ["foreground", "card", "body"],
  ["cardForeground", "card", "body"],
  ["popoverForeground", "popover", "body"],
  ["mutedForeground", "muted", "secondary"],
  ["secondaryForeground", "secondary", "secondary"],
  ["primaryForeground", "primary", "secondary"],
  ["destructiveForeground", "destructive", "secondary"],
  ["successForeground", "success", "secondary"],
  ["warningForeground", "warning", "secondary"],
  ["accentForeground", "accent", "secondary"],
  ["selectedForeground", "selected", "secondary"],
  ["placeholder", "input", "secondary"],
  ["borderStrong", "background", "boundary"],
  ["borderStrong", "card", "boundary"],
  ["borderStrong", "input", "boundary"],
  ["ring", "background", "boundary"],
  ["ring", "card", "boundary"],
  ["ring", "popover", "boundary"],
];

interface ColourSet {
  readonly label: string;
  readonly colors: ThemeColors;
  readonly floors: Readonly<Record<PairClass, number>>;
}

const colourSets: readonly ColourSet[] = [
  {
    label: "light",
    colors: lightColors,
    floors: { body: 7, secondary: 4.5, boundary: 3 },
  },
  {
    label: "dark",
    colors: darkColors,
    floors: { body: 7, secondary: 4.5, boundary: 3 },
  },
  {
    label: "high-contrast light",
    colors: highContrastLightColors,
    floors: { body: 7, secondary: 7, boundary: 4.5 },
  },
  {
    label: "high-contrast dark",
    colors: highContrastDarkColors,
    floors: { body: 7, secondary: 7, boundary: 4.5 },
  },
];

describe("semantic colour contrast", () => {
  colourSets.forEach(({ label, colors, floors }) => {
    pairs.forEach(([foreground, background, pairClass]) => {
      it(`${label}: ${foreground} on ${background} meets ${floors[pairClass]}:1`, () => {
        expect(
          contrast(colors[foreground], colors[background]),
          `${label} ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floors[pairClass]);
      });
    });
  });
});

describe("high-contrast boundaries", () => {
  const sets = [
    ["high-contrast light", highContrastLightColors],
    ["high-contrast dark", highContrastDarkColors],
  ] as const;

  sets.forEach(([label, colors]) => {
    it(`${label}: decorative border on background meets 3:1`, () => {
      expect(contrast(colors.border, colors.background)).toBeGreaterThanOrEqual(
        3,
      );
    });
  });
});

describe("colour roles", () => {
  it("uses a colour grammar GPUix can paint", () => {
    const grammar = /^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8})$/;
    colourSets.forEach(({ label, colors }) => {
      Object.entries(colors).forEach(([role, value]) => {
        expect(value, `${label}.${role}`).toMatch(grammar);
      });
    });
  });

  it("defines the same roles in every theme", () => {
    const roles = new Set(Object.keys(lightColors));
    colourSets.forEach(({ label, colors }) => {
      expect(new Set(Object.keys(colors)), label).toEqual(roles);
    });
  });

  it("is not a copy of the light theme", () => {
    expect(lightColors.background).not.toBe(darkColors.background);
    expect(lightColors.foreground).not.toBe(darkColors.foreground);
    expect(lightColors.primary).not.toBe(darkColors.primary);
  });

  it("differs from the default theme it raises", () => {
    expect(highContrastLightColors.mutedForeground).not.toBe(
      lightColors.mutedForeground,
    );
    expect(highContrastLightColors.background).not.toBe(lightColors.background);
    expect(highContrastDarkColors.background).not.toBe(darkColors.background);
  });
});
