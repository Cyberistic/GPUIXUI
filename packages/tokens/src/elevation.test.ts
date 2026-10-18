/**
 * Guards the defect fixed in plan 018: GPUix paints exactly one shadow per
 * element and its `BoxShadow` has five fields, but the tokens shipped a level
 * that could hold several shadows ("painted in order") and an `inset` field the
 * runtime ignores. A level with two shadows renders as one, and an `inset` ring
 * renders as nothing — both silently.
 *
 * Plan 085 split the stored level from the painted shadow: a level is geometry
 * plus an alpha, and `elevationShadow` composes it with the theme's `shadow`
 * tint. These guards hold both halves to the runtime's shape.
 */

import { describe, expect, it } from "vitest";
import {
  darkElevation,
  elevationLevels,
  elevationShadow,
  highContrastDarkElevation,
  lightElevation,
  type ElevationShape,
} from "./elevation.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
} from "./theme.js";

/** The five fields the installed runtime's `BoxShadow` has, and nothing else. */
const runtimeFields = [
  "blurRadius",
  "color",
  "offsetX",
  "offsetY",
  "spreadRadius",
];

/** The five fields a stored level holds: geometry plus the tint opacity. */
const shapeFields = [
  "alpha",
  "blurRadius",
  "offsetX",
  "offsetY",
  "spreadRadius",
];

const levels = elevationLevels;

const color = /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;

const shipped = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["high-contrast light", highContrastLightTheme],
  ["high-contrast dark", highContrastDarkTheme],
] as const;

const shapes = [
  ["light", lightElevation],
  ["dark", darkElevation],
  ["high-contrast dark", highContrastDarkElevation],
] as const;

describe("elevation levels", () => {
  it("names every level the interface carries, in order", () => {
    expect([...elevationLevels].toSorted()).toEqual(
      Object.keys(lightElevation).toSorted(),
    );
  });

  it("never carries more than the one shadow the runtime paints", () => {
    shipped.forEach(([label, theme]) => {
      levels.forEach((level) => {
        expect(
          theme.elevation[level].length,
          `${label} ${level}`,
        ).toBeLessThanOrEqual(1);
      });
    });
  });

  it("stores geometry and opacity, never a ready-made colour", () => {
    shapes.forEach(([label, elevation]) => {
      levels.forEach((level) => {
        elevation[level].forEach((shape: ElevationShape, index) => {
          expect(
            Object.keys(shape).toSorted(),
            `${label} ${level} ${index}`,
          ).toEqual(shapeFields);
        });
      });
    });
  });

  it("resolves to exactly the runtime's shadow fields", () => {
    shipped.forEach(([label, theme]) => {
      levels.forEach((level) => {
        const shadow = elevationShadow(theme, level);
        if (shadow === undefined) {
          return;
        }
        expect(Object.keys(shadow).toSorted(), `${label} ${level}`).toEqual(
          runtimeFields,
        );
      });
    });
  });

  it("paints a colour the runtime can parse", () => {
    shipped.forEach(([label, theme]) => {
      levels.forEach((level) => {
        const shadow = elevationShadow(theme, level);
        if (shadow === undefined) {
          return;
        }
        expect(shadow.color, `${label} ${level}`).toMatch(color);
      });
    });
  });

  it("keeps the overlay level reserved and empty", () => {
    shipped.forEach(([label, theme]) => {
      expect(theme.elevation.overlay, label).toEqual([]);
    });
  });

  it("paints a different shadow in light and dark", () => {
    expect(elevationShadow(lightTheme, "md")).not.toEqual(
      elevationShadow(darkTheme, "md"),
    );
  });
});

describe("elevationShadow", () => {
  it("resolves a level to the one shadow that paints", () => {
    levels.slice(0, 3).forEach((level) => {
      expect(elevationShadow(lightTheme, level)).toBeDefined();
      expect(elevationShadow(darkTheme, level)).toBeDefined();
    });
  });

  it("is undefined for the reserved overlay level", () => {
    expect(elevationShadow(lightTheme, "overlay")).toBeUndefined();
    expect(elevationShadow(darkTheme, "overlay")).toBeUndefined();
  });

  it("follows a high-contrast theme's tint", () => {
    expect(elevationShadow(highContrastDarkTheme, "lg")?.color).toBe(
      "#FFFFFF2E",
    );
    expect(elevationShadow(highContrastLightTheme, "lg")?.color).toBe(
      "#00000029",
    );
  });
});
