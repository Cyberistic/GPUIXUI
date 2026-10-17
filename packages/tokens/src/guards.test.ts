/**
 * Guards the defect fixed in plan 067: the package defined `PlatformName`,
 * `ThemeMode` and `ThemeContrast` but shipped no narrowing function, so every
 * consumer retyped the members — `apps/docs` hand-wrote the platform table and
 * its guard in `src/platform/platform.ts`. Plan 068 closed the same gap for the
 * two remaining unions: a persisted density and a tone from a payload were
 * retyped or cast because `isDensityName` was private and `isStatusTone` did not
 * exist. A persisted choice arrives as `unknown`; the union owner must provide
 * the guard, and adding a member must not require editing another package.
 */
import { describe, expect, it } from "vitest";
import {
  densityNames,
  densityPresets,
  highContrastThemes,
  isDensityName,
  isPlatformName,
  isStatusTone,
  isThemeContrast,
  isThemeMode,
  lightTheme,
  platformNames,
  statusTone,
  statusTones,
  themes,
} from "./index.js";
import {
  resolveStatusTone,
  themeWithDensity,
} from "./persisted-choices.example.js";

const nonStrings: ReadonlyArray<unknown> = [null, undefined, 0, {}, [], true];

describe("isPlatformName", () => {
  it("accepts every shipped platform, including default", () => {
    expect(platformNames).toHaveLength(4);
    platformNames.forEach((name) =>
      expect(isPlatformName(name), name).toBe(true),
    );
  });

  it("rejects anything the library does not ship", () => {
    ["", "macOS", "win", "win32 ", "DARWIN", "browser", ...nonStrings].forEach(
      (value) => expect(isPlatformName(value), String(value)).toBe(false),
    );
  });
});

describe("isThemeMode", () => {
  it("accepts the mode of every shipped theme", () => {
    Object.keys(themes).forEach((mode) =>
      expect(isThemeMode(mode), mode).toBe(true),
    );
    Object.keys(highContrastThemes).forEach((mode) =>
      expect(isThemeMode(mode), mode).toBe(true),
    );
  });

  it("rejects casing, whitespace and non-strings", () => {
    ["", "Light", "light ", "dark-mode", "high", ...nonStrings].forEach(
      (value) => expect(isThemeMode(value), String(value)).toBe(false),
    );
  });
});

describe("isThemeContrast", () => {
  it("accepts both contrast variants getTheme resolves", () => {
    expect(isThemeContrast("default")).toBe(true);
    expect(isThemeContrast("high")).toBe(true);
  });

  it("rejects casing, aliases and non-strings", () => {
    ["", "Default", "High", "high-contrast", "aaa", ...nonStrings].forEach(
      (value) => expect(isThemeContrast(value), String(value)).toBe(false),
    );
  });
});

describe("isDensityName", () => {
  it("accepts every preset the package ships", () => {
    expect(densityNames).toEqual(Object.keys(densityPresets));
    densityNames.forEach((name) =>
      expect(isDensityName(name), name).toBe(true),
    );
  });

  it("rejects casing, whitespace, aliases and non-strings", () => {
    ["", "Compact", "dense", "compact ", "spacious-ish", ...nonStrings].forEach(
      (value) => expect(isDensityName(value), String(value)).toBe(false),
    );
  });
});

describe("isStatusTone", () => {
  it("accepts every status family the package ships", () => {
    statusTones.forEach((tone) => expect(isStatusTone(tone), tone).toBe(true));
  });

  it("rejects casing, whitespace, aliases and non-strings", () => {
    ["", "Info", "error", "danger", "warning ", ...nonStrings].forEach(
      (value) => expect(isStatusTone(value), String(value)).toBe(false),
    );
  });
});

describe("persisted choices", () => {
  it("applies a stored density to a theme", () => {
    expect(themeWithDensity(lightTheme, "compact").density).toEqual(
      densityPresets.compact,
    );
  });

  it("keeps the base density for a value the library no longer ships", () => {
    expect(themeWithDensity(lightTheme, "dense").density).toEqual(
      lightTheme.density,
    );
  });

  it("resolves a payload tone to a real soft surface", () => {
    const tone = resolveStatusTone("warning");
    expect(statusTone(lightTheme, tone).background).toBe(
      lightTheme.colors.warningSoft,
    );
    expect(resolveStatusTone("error")).toBe("info");
  });
});
