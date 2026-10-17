/**
 * Guards the WCAG contrast floors of every semantic text/surface pair in both
 * themes. A palette edit that makes text unreadable fails here rather than
 * shipping.
 */
import { describe, expect, it } from "vitest";
import { darkColors, lightColors, type ThemeColors } from "./color.js";

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

type Pair = readonly [keyof ThemeColors, keyof ThemeColors, number];

const pairs: readonly Pair[] = [
  ["foreground", "background", 7],
  ["foreground", "card", 7],
  ["cardForeground", "card", 7],
  ["popoverForeground", "popover", 7],
  ["mutedForeground", "muted", 4.5],
  ["secondaryForeground", "secondary", 4.5],
  ["primaryForeground", "primary", 4.5],
  ["destructiveForeground", "destructive", 4.5],
  ["successForeground", "success", 4.5],
  ["warningForeground", "warning", 4.5],
  ["accentForeground", "accent", 4.5],
  ["selectedForeground", "selected", 4.5],
  ["placeholder", "input", 4.5],
  ["borderStrong", "background", 3],
  ["ring", "background", 3],
];

const themes = [
  ["light", lightColors],
  ["dark", darkColors],
] as const;

describe("semantic colour contrast", () => {
  themes.forEach(([mode, colors]) => {
    pairs.forEach(([foreground, background, minimum]) => {
      it(`${mode}: ${foreground} on ${background} meets ${minimum}:1`, () => {
        expect(
          contrast(colors[foreground], colors[background]),
          `${mode} ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(minimum);
      });
    });
  });
});

describe("colour roles", () => {
  it("uses a colour grammar GPUix can paint", () => {
    const grammar = /^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8})$/;
    themes.forEach(([mode, colors]) => {
      Object.entries(colors).forEach(([role, value]) => {
        expect(value, `${mode}.${role}`).toMatch(grammar);
      });
    });
  });

  it("defines the same roles in both themes", () => {
    expect(Object.keys(lightColors).sort()).toEqual(
      Object.keys(darkColors).sort(),
    );
  });

  it("is not a copy of the light theme", () => {
    expect(lightColors.background).not.toBe(darkColors.background);
    expect(lightColors.foreground).not.toBe(darkColors.foreground);
    expect(lightColors.primary).not.toBe(darkColors.primary);
  });
});
