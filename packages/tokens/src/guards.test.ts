import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { elevationLevels, isElevationLevel } from "./elevation.js";
import { isPlatformName, platformNames, platformStyles } from "./platforms.js";
import { isRetroName, retroNames, retroStyles } from "./retro.js";
import {
  avatarSize,
  avatarSizes,
  controlSizes,
  densityNames,
  densityPresets,
  iconSize,
  iconSizes,
  isAvatarSize,
  isControlSize,
  isDensityName,
  isIconSize,
  isRadiusStep,
  isSpacingStep,
  radius,
  radiusSteps,
  spacing,
  spacingSteps,
} from "./scale.js";
import { isStatusTone, statusTone, statusTones } from "./styles.js";
import {
  getTheme,
  highContrastThemes,
  isThemeContrast,
  isThemeMode,
  themeContrasts,
  themeModes,
  themes,
  type ThemeContrast,
  type ThemeMode,
} from "./theme.js";
import { isTextRole, textRoles, typography } from "./typography.js";
import {
  avatarSizeFromStoredChoice,
  controlSizeFromStoredChoice,
  densityFromStoredChoice,
  elevationFromStoredChoice,
  iconSizeFromStoredChoice,
  lookFromStoredChoice,
  platformFromStoredChoice,
  radiusStepFromStoredChoice,
  spacingStepFromStoredChoice,
  textRoleFromStoredChoice,
  themeFromStoredChoice,
  toneFromStoredChoice,
} from "./persisted-choices.example.js";

interface GuardCase {
  readonly name: string;
  readonly guard: (value: unknown) => boolean;
  readonly index: ReadonlyArray<unknown>;
}

const guardCases: ReadonlyArray<GuardCase> = [
  { name: "isPlatformName", guard: isPlatformName, index: platformNames },
  { name: "isThemeMode", guard: isThemeMode, index: themeModes },
  { name: "isThemeContrast", guard: isThemeContrast, index: themeContrasts },
  { name: "isDensityName", guard: isDensityName, index: densityNames },
  { name: "isControlSize", guard: isControlSize, index: controlSizes },
  { name: "isStatusTone", guard: isStatusTone, index: statusTones },
  { name: "isRetroName", guard: isRetroName, index: retroNames },
  { name: "isTextRole", guard: isTextRole, index: textRoles },
  { name: "isElevationLevel", guard: isElevationLevel, index: elevationLevels },
  { name: "isAvatarSize", guard: isAvatarSize, index: avatarSizes },
  { name: "isSpacingStep", guard: isSpacingStep, index: spacingSteps },
  { name: "isRadiusStep", guard: isRadiusStep, index: radiusSteps },
  { name: "isIconSize", guard: isIconSize, index: iconSizes },
];

const notMembers: ReadonlyArray<unknown> = [
  "",
  "nope",
  "Light",
  "default ",

  "toString",
  "constructor",
  "hasOwnProperty",
  null,
  undefined,
  0,
  42,
  true,
  {},
  [],
  ["light"],
  () => "light",
];

describe("guards narrow a stored choice", () => {
  it("accepts every member of its index", () => {
    guardCases.forEach(({ name, guard, index }) => {
      expect(index.length).toBeGreaterThan(0);
      index.forEach((member) => {
        expect(guard(member), `${name}(${String(member)})`).toBe(true);
      });
    });
  });

  it("rejects a value outside its index", () => {
    guardCases.forEach(({ name, guard }) => {
      notMembers.forEach((value) => {
        expect(guard(value), `${name}(${String(value)})`).toBe(false);
      });
    });
  });
});

describe("indexes match the data they select", () => {
  it("names every shipped theme mode and contrast variant", () => {
    expect(Object.keys(themes)).toEqual([...themeModes]);
    expect(Object.keys(highContrastThemes)).toEqual([...themeModes]);
  });

  it("resolves every mode and contrast pair to the theme it names", () => {
    themeModes.forEach((mode) => {
      themeContrasts.forEach((contrast) => {
        const theme = getTheme(mode, contrast);
        expect(theme.mode, `${mode}/${contrast}`).toBe(mode);
        expect(theme.contrast, `${mode}/${contrast}`).toBe(contrast);
      });
    });
  });

  it("names every styled platform", () => {
    expect(new Set(platformNames)).toEqual(
      new Set(Object.keys(platformStyles)),
    );
  });

  it("names every authored look", () => {
    expect(new Set(retroNames)).toEqual(new Set(Object.keys(retroStyles)));
  });

  it("names every role of the type scale", () => {
    const scaleRoles = Object.keys(typography).filter(
      (key) => key !== "sans" && key !== "mono",
    );

    expect(new Set(textRoles)).toEqual(new Set(scaleRoles));
    expect(textRoles).toHaveLength(scaleRoles.length);
    expect(isTextRole("sans")).toBe(false);
    expect(isTextRole("mono")).toBe(false);
  });

  it("names every step of the avatar scale, in order", () => {
    expect(Object.keys(avatarSize)).toEqual([...avatarSizes]);
    expect(new Set(avatarSizes)).toEqual(new Set(Object.keys(avatarSize)));
  });

  it("names every step of the spacing scale", () => {
    expect(Object.keys(spacing)).toEqual([...spacingSteps]);
    expect(new Set(spacingSteps)).toEqual(new Set(Object.keys(spacing)));
  });

  it("names every corner of the radius scale", () => {
    expect(Object.keys(radius)).toEqual([...radiusSteps]);
    expect(new Set(radiusSteps)).toEqual(new Set(Object.keys(radius)));
  });

  it("names every step of the icon scale", () => {
    expect(Object.keys(iconSize)).toEqual([...iconSizes]);
    expect(new Set(iconSizes)).toEqual(new Set(Object.keys(iconSize)));

    expect(getTheme("light").iconSize).toEqual(iconSize);
  });

  it("gives every density preset a metric for every control size", () => {
    densityNames.forEach((preset) => {
      expect(
        new Set(Object.keys(densityPresets[preset].controlHeight)),
      ).toEqual(new Set(controlSizes));
      expect(
        new Set(Object.keys(densityPresets[preset].controlPaddingX)),
      ).toEqual(new Set(controlSizes));
    });
  });

  it("resolves every status tone to its own soft roles", () => {
    const theme = getTheme("light");
    const backgrounds = statusTones.map(
      (tone) => statusTone(theme, tone).background,
    );

    expect(new Set(backgrounds).size).toBe(statusTones.length);
  });
});

describe("a stored choice resolves without a cast", () => {
  it("picks the shipped theme for a known pair", () => {
    expect(themeFromStoredChoice({ mode: "dark", contrast: "high" })).toBe(
      highContrastThemes.dark,
    );
  });

  it("keeps a readable default for an unknown pair", () => {
    const theme = themeFromStoredChoice({ mode: "solar", contrast: 7 });

    expect(theme.mode).toBe("light");
    expect(theme.contrast).toBe("default");
  });

  it("falls back for the remaining axes", () => {
    expect(densityFromStoredChoice("enormous").name).toBe("comfortable");
    expect(densityFromStoredChoice("compact").name).toBe("compact");
    expect(controlSizeFromStoredChoice(11)).toBe("md");
    expect(platformFromStoredChoice("beos")).toBe("default");
    expect(lookFromStoredChoice("luna")).toBe("luna");
    expect(lookFromStoredChoice("aqua")).toBe("aero");
    expect(textRoleFromStoredChoice("h2")).toBe("h2");
    expect(textRoleFromStoredChoice("subtitle")).toBe("body");
    expect(textRoleFromStoredChoice(3)).toBe("body");
    expect(elevationFromStoredChoice("lg")).toBe("lg");
    expect(elevationFromStoredChoice("xxl")).toBe("md");
    expect(elevationFromStoredChoice(null)).toBe("md");
    expect(avatarSizeFromStoredChoice("lg")).toBe("lg");
    expect(avatarSizeFromStoredChoice("xl")).toBe("md");
    expect(avatarSizeFromStoredChoice(32)).toBe("md");
    expect(iconSizeFromStoredChoice("lg")).toBe("lg");
    expect(iconSizeFromStoredChoice("huge")).toBe("md");
    expect(iconSizeFromStoredChoice(18)).toBe("md");
    expect(spacingStepFromStoredChoice("lg")).toBe("lg");
    expect(spacingStepFromStoredChoice("roomy")).toBeUndefined();
    expect(radiusStepFromStoredChoice("full")).toBe("full");
    expect(radiusStepFromStoredChoice("pill")).toBeUndefined();
    expect(radiusStepFromStoredChoice(6)).toBeUndefined();
    expect(toneFromStoredChoice(getTheme("dark"), "purple").background).toBe(
      statusTone(getTheme("dark"), "info").background,
    );
  });
});

describe("an index is the only list of its names", () => {
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");

  it("refuses against the modes and variants the index carries", () => {
    const mode = JSON.parse('"sepia"') as ThemeMode;
    const contrast = JSON.parse('"soft"') as ThemeContrast;

    expect(() => getTheme(mode)).toThrow(
      `\`sepia\` is not a theme mode: ${themeModes.join(", ")} are the modes`,
    );
    expect(() => getTheme("light", contrast)).toThrow(
      `\`soft\` is not a contrast variant: ${themeContrasts.join(", ")} are the variants`,
    );
  });

  it("reads both refusals and the host platform from the index", () => {
    const theme = read("./theme.ts");
    expect(theme).toContain('${themeModes.join(", ")} are the modes');
    expect(theme).toContain('${themeContrasts.join(", ")} are the variants');
    expect(theme).not.toContain("is not a theme mode: light, dark");
    expect(theme).not.toContain("is not a contrast variant: default, high");

    const platforms = read("./platforms.ts");
    expect(platforms).toContain('isPlatformName(name) ? name : "default"');
    expect(platforms).not.toContain('name === "darwin"');
  });

  it("teaches the rule where the persisted choices are taught", () => {
    const page = read("../../../docs/tokens.md").replace(/\s+/g, " ");
    const readme = read("../README.md").replace(/\s+/g, " ");

    expect(page).toContain(
      "A refusal prints the same index it refuses against",
    );
    expect(page).toContain(
      "`currentPlatform` reads the host runtime through `isPlatformName`",
    );
    expect(readme).toContain("read from the index that owns them");
    expect(readme).toContain(
      "reaches the guard, the refusal and `currentPlatform` together",
    );
  });
});
