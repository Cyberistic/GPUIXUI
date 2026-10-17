/**
 * Guards the defect fixed in plan 067: the package defined `PlatformName`,
 * `ThemeMode` and `ThemeContrast` but shipped no narrowing function, so every
 * consumer retyped the members — `apps/docs` hand-wrote the platform table and
 * its guard in `src/platform/platform.ts`. A persisted choice arrives as
 * `unknown`; the union owner must provide the guard, and adding a member must
 * not require editing another package.
 */
import { describe, expect, it } from "vitest";
import { isPlatformName, platformNames } from "./platform-types.js";
import {
  highContrastThemes,
  isThemeContrast,
  isThemeMode,
  themes,
} from "./theme.js";

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
