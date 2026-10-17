/**
 * Guards the defect fixed in plan 321: `extendTheme` spread each override group
 * over the base, so an explicitly `undefined` value — type-legal because this
 * repo does not enable `exactOptionalPropertyTypes`, and produced naturally by a
 * partial config spread — overwrote the base value instead of being omitted.
 * A colour role, a type field, a motion timing, a density metric or an elevation
 * level became `undefined` silently, and an undefined elevation level made
 * `elevationShadow` throw. Reverting `mergeDefined` to a shallow spread makes
 * every inheritance assertion below fail and the elevation case crash.
 */
import { describe, expect, it } from "vitest";
import {
  controlHeight,
  darkTheme,
  elevationShadow,
  extendTheme,
  getTheme,
  lightTheme,
} from "./index.js";

describe("theme merges treat an explicit undefined as omitted", () => {
  it("keeps a colour role while applying the defined sibling", () => {
    const themed = extendTheme(lightTheme, {
      colors: { primary: undefined, background: "#FDFDFD" },
    });
    expect(themed.colors.primary).toBe(lightTheme.colors.primary);
    expect(themed.colors.background).toBe("#FDFDFD");

    const dark = extendTheme(darkTheme, { colors: { card: undefined } });
    expect(dark.colors.card).toBe(darkTheme.colors.card);
  });

  it("keeps a text role's omitted fields", () => {
    const themed = extendTheme(lightTheme, {
      typography: { body: { fontSize: undefined, fontWeight: 700 } },
    });
    expect(themed.typography.body.fontSize).toBe(
      lightTheme.typography.body.fontSize,
    );
    expect(themed.typography.body.lineHeight).toBe(
      lightTheme.typography.body.lineHeight,
    );
    expect(themed.typography.body.fontWeight).toBe(700);
  });

  it("keeps the omitted font family", () => {
    const themed = extendTheme(lightTheme, {
      typography: { sans: undefined, mono: "Iosevka" },
    });
    expect(themed.typography.sans).toBe(lightTheme.typography.sans);
    expect(themed.typography.mono).toBe("Iosevka");
  });

  it("keeps omitted timings and easings", () => {
    const themed = extendTheme(lightTheme, {
      motion: {
        fast: undefined,
        slow: 400,
        ease: { enter: undefined, exit: "linear" },
      },
    });
    expect(themed.motion.fast).toBe(lightTheme.motion.fast);
    expect(themed.motion.normal).toBe(lightTheme.motion.normal);
    expect(themed.motion.slow).toBe(400);
    expect(themed.motion.ease.enter).toBe(lightTheme.motion.ease.enter);
    expect(themed.motion.ease.exit).toBe("linear");
  });

  it("keeps omitted density metrics and the preset name", () => {
    const themed = extendTheme(lightTheme, {
      density: {
        rowHeight: undefined,
        controlHeight: { md: undefined, lg: 38 },
      },
    });
    expect(themed.density.rowHeight).toBe(lightTheme.density.rowHeight);
    expect(themed.density.name).toBe(lightTheme.density.name);
    expect(controlHeight(themed, "sm")).toBe(controlHeight(lightTheme, "sm"));
    expect(controlHeight(themed, "md")).toBe(controlHeight(lightTheme, "md"));
    expect(controlHeight(themed, "lg")).toBe(38);
  });

  it("keeps an omitted elevation level and its shadow", () => {
    const themed = extendTheme(lightTheme, {
      elevation: { md: undefined, overlay: undefined },
    });
    expect(themed.elevation.md).toBe(lightTheme.elevation.md);
    expect(themed.elevation.overlay).toEqual([]);
    expect(elevationShadow(themed, "md")).toEqual(
      elevationShadow(lightTheme, "md"),
    );
  });

  it("keeps an omitted step in every flat scale", () => {
    const themed = extendTheme(lightTheme, {
      spacing: { md: undefined },
      radius: { lg: undefined },
      borderWidth: { thin: undefined },
      iconSize: { md: undefined },
      avatarSize: { md: undefined },
    });
    expect(themed.spacing).toEqual(lightTheme.spacing);
    expect(themed.radius).toEqual(lightTheme.radius);
    expect(themed.borderWidth).toEqual(lightTheme.borderWidth);
    expect(themed.iconSize).toEqual(lightTheme.iconSize);
    expect(themed.avatarSize).toEqual(lightTheme.avatarSize);
  });

  it("keeps the base name and contrast declaration", () => {
    const themed = extendTheme(lightTheme, {
      name: undefined,
      contrast: undefined,
    });
    expect(themed.name).toBe(lightTheme.name);
    expect(themed.contrast).toBe(lightTheme.contrast);
  });

  it("does not mutate the base through an undefined override", () => {
    const before = structuredClone(lightTheme);
    extendTheme(lightTheme, {
      colors: { primary: undefined },
      typography: { body: { fontSize: undefined } },
      motion: { fast: undefined },
      density: { rowHeight: undefined },
      elevation: { md: undefined },
    });
    expect(lightTheme).toEqual(before);
  });

  it("still applies a defined override", () => {
    const themed = extendTheme(getTheme("dark"), {
      colors: { primary: "#123456" },
      density: { rowHeight: 44 },
    });
    expect(themed.colors.primary).toBe("#123456");
    expect(themed.density.rowHeight).toBe(44);
  });
});
