/**
 * Guards the defect fixed in plan 067: the package defined `PlatformName`,
 * `ThemeMode` and `ThemeContrast` but shipped no narrowing function, so every
 * consumer retyped the members — `apps/docs` hand-wrote the platform table and
 * its guard in `src/platform/platform.ts`. Plan 068 closed the same gap for the
 * two remaining unions: a persisted density and a tone from a payload were
 * retyped or cast because `isDensityName` was private and `isStatusTone` did not
 * exist. Plan 096 closed the same gap for the last union: a stored component
 * size had to be retyped as `"sm" | "md" | "lg"` because `ControlSize` shipped
 * with neither an index nor a guard. A persisted choice arrives as `unknown`;
 * the union owner must provide the guard, and adding a member must not require
 * editing another package.
 */
import { describe, expect, it } from "vitest";
import {
  controlSizes,
  densityNames,
  densityPresets,
  getTheme,
  highContrastDarkTheme,
  highContrastThemes,
  isControlSize,
  isDensityName,
  isPlatformName,
  isStatusTone,
  isThemeContrast,
  isThemeMode,
  lightTheme,
  platformNames,
  statusTone,
  statusTones,
  themeContrasts,
  themeModes,
  themes,
} from "./index.js";
import { shippedThemes } from "./shipped-themes.js";
import {
  resolveControlSize,
  resolveStatusTone,
  themeFromStoredChoice,
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
    shippedThemes.forEach(({ theme }) =>
      expect(isThemeMode(theme.mode), theme.name).toBe(true),
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
    themeContrasts.forEach((contrast) =>
      expect(isThemeContrast(contrast), contrast).toBe(true),
    );
  });

  it("rejects casing, aliases and non-strings", () => {
    ["", "Default", "High", "high-contrast", "aaa", ...nonStrings].forEach(
      (value) => expect(isThemeContrast(value), String(value)).toBe(false),
    );
  });
});

describe("theme indexes", () => {
  it("lists every mode and contrast the package ships", () => {
    expect(Object.keys(themes)).toEqual([...themeModes]);
    expect(Object.keys(highContrastThemes)).toEqual([...themeModes]);
    themeModes.forEach((mode) =>
      themeContrasts.forEach((contrast) =>
        expect(getTheme(mode, contrast).contrast, `${mode} ${contrast}`).toBe(
          contrast,
        ),
      ),
    );
  });

  it("gives every mode both contrast variants", () => {
    themeModes.forEach((mode) =>
      themeContrasts.forEach((contrast) => {
        const theme = getTheme(mode, contrast);
        expect(theme.mode, `${mode} ${contrast}`).toBe(mode);
        expect(theme.contrast, `${mode} ${contrast}`).toBe(contrast);
      }),
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

describe("isControlSize", () => {
  it("accepts every size the package ships", () => {
    expect(controlSizes).toEqual(["sm", "md", "lg"]);
    controlSizes.forEach((size) =>
      expect(isControlSize(size), size).toBe(true),
    );
  });

  it("rejects casing, whitespace, aliases and non-strings", () => {
    ["", "SM", "Md", "medium", "large", "md ", "xsmall", ...nonStrings].forEach(
      (value) => expect(isControlSize(value), String(value)).toBe(false),
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

  it("resolves a stored size to a shipped one", () => {
    expect(resolveControlSize("lg")).toBe("lg");
    expect(resolveControlSize("large")).toBe("md");
  });

  it("resolves a stored mode and contrast to a shipped theme", () => {
    expect(themeFromStoredChoice({ mode: "dark", contrast: "high" })).toBe(
      highContrastDarkTheme,
    );
    expect(themeFromStoredChoice({ mode: "dark", contrast: "high" }).mode).toBe(
      "dark",
    );
    expect(themeFromStoredChoice({ mode: "sepia", contrast: "ultra" })).toBe(
      lightTheme,
    );
  });
});
