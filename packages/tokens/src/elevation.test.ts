/**
 * Guards the defect fixed in plan 018: GPUix paints exactly one shadow per
 * element and its `BoxShadow` has five fields, but the tokens shipped a level
 * that could hold several shadows ("painted in order") and an `inset` field the
 * runtime ignores. A level with two shadows renders as one, and an `inset` ring
 * renders as nothing — both silently.
 */

import { describe, expect, it } from "vitest";
import { darkElevation, elevationShadow, lightElevation } from "./elevation.js";
import { darkTheme, highContrastDarkTheme, lightTheme } from "./theme.js";

/** The five fields the installed runtime's `BoxShadow` has, and nothing else. */
const runtimeFields = [
  "blurRadius",
  "color",
  "offsetX",
  "offsetY",
  "spreadRadius",
];

const levels = ["sm", "md", "lg", "overlay"] as const;

const color = /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;

const shipped = [
  ["light", lightElevation],
  ["dark", darkElevation],
  ["light theme", lightTheme.elevation],
  ["dark theme", darkTheme.elevation],
  ["high-contrast dark theme", highContrastDarkTheme.elevation],
] as const;

describe("elevation levels", () => {
  it("never carries more than the one shadow the runtime paints", () => {
    shipped.forEach(([label, elevation]) => {
      levels.forEach((level) => {
        expect(
          elevation[level].length,
          `${label} ${level}`,
        ).toBeLessThanOrEqual(1);
      });
    });
  });

  it("uses exactly the runtime's shadow fields", () => {
    shipped.forEach(([label, elevation]) => {
      levels.forEach((level) => {
        elevation[level].forEach((shadow, index) => {
          expect(
            Object.keys(shadow).toSorted(),
            `${label} ${level} ${index}`,
          ).toEqual(runtimeFields);
        });
      });
    });
  });

  it("paints a colour the runtime can parse", () => {
    shipped.forEach(([label, elevation]) => {
      levels.forEach((level) => {
        elevation[level].forEach((shadow) => {
          expect(shadow.color, `${label} ${level}`).toMatch(color);
        });
      });
    });
  });

  it("keeps the overlay level reserved and empty", () => {
    expect(lightElevation.overlay).toEqual([]);
    expect(darkElevation.overlay).toEqual([]);
  });

  it("paints a different shadow in light and dark", () => {
    expect(lightElevation.md).not.toEqual(darkElevation.md);
    expect(lightElevation.md[0]?.color).not.toBe(darkElevation.md[0]?.color);
  });
});

describe("elevationShadow", () => {
  it("resolves a level to the one shadow that paints", () => {
    levels.slice(0, 3).forEach((level) => {
      expect(elevationShadow(lightTheme, level)).toBe(
        lightTheme.elevation[level][0],
      );
      expect(elevationShadow(darkTheme, level)).toBe(
        darkTheme.elevation[level][0],
      );
    });
  });

  it("is undefined for the reserved overlay level", () => {
    expect(elevationShadow(lightTheme, "overlay")).toBeUndefined();
    expect(elevationShadow(darkTheme, "overlay")).toBeUndefined();
  });

  it("follows a high-contrast theme's elevation", () => {
    expect(elevationShadow(highContrastDarkTheme, "lg")).toBe(
      highContrastDarkTheme.elevation.lg[0],
    );
  });
});
