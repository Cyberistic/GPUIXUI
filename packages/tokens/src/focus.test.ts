/**
 * Guards two defects fixed in plan 017.
 *
 * 1. GPUix 0.10.0 has no `outline*` properties and no `focusVisible` state, so a
 *    focus ring built from them paints nothing. The ring must be the one shape
 *    the runtime can draw without taking layout space: a zero-offset, zero-blur
 *    `boxShadow` with a spread.
 * 2. The spread must come from the theme's `borderWidth.strong`, never a
 *    literal, so a brand that changes the border scale gets the matching ring.
 */

import { describe, expect, it } from "vitest";
import { focusExample } from "./focus-ring.example.js";
import { focusRing } from "./styles.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  type Theme,
} from "./theme.js";

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["high-contrast light", highContrastLightTheme],
  ["high-contrast dark", highContrastDarkTheme],
];

const hex = /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;

describe("focusRing", () => {
  it("draws no layout space", () => {
    expect(Object.keys(focusRing(lightTheme))).toEqual(["boxShadow"]);
  });

  it("is a zero-offset, zero-blur ring spread by the border scale", () => {
    const { boxShadow } = focusRing(lightTheme);
    expect(boxShadow.offsetX).toBe(0);
    expect(boxShadow.offsetY).toBe(0);
    expect(boxShadow.blurRadius).toBe(0);
    expect(boxShadow.spreadRadius).toBe(lightTheme.borderWidth.strong);
    expect(boxShadow.spreadRadius).toBeGreaterThan(0);
  });

  it("takes the ring width from the theme, not a literal", () => {
    const wide = extendTheme(lightTheme, { borderWidth: { strong: 3 } });
    expect(focusRing(wide).boxShadow.spreadRadius).toBe(3);
    expect(focusRing(wide).boxShadow.spreadRadius).not.toBe(
      focusRing(lightTheme).boxShadow.spreadRadius,
    );
  });

  it("paints the ring role of every shipped theme", () => {
    themes.forEach(([label, theme]) => {
      const { boxShadow } = focusRing(theme);
      expect(boxShadow.color, label).toBe(theme.colors.ring);
      expect(boxShadow.color, label).toMatch(hex);
    });
  });

  it("differs between light and dark", () => {
    expect(focusRing(lightTheme).boxShadow.color).not.toBe(
      focusRing(darkTheme).boxShadow.color,
    );
  });
});

describe("focus example", () => {
  it("adds the ring only when the control is focused", () => {
    const { rest, focused } = focusExample(lightTheme);
    expect(rest).not.toHaveProperty("boxShadow");
    expect(focused).toEqual(focusRing(lightTheme));
  });
});
