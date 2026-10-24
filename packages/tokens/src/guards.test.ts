/**
 * Guards the persisted-choice contract.
 *
 * The defect this holds: the package exposed six unions a consumer can store —
 * theme mode, contrast variant, platform, density, control size and status tone —
 * with no index and no guard. A preference restored from storage is `unknown`,
 * so a settings row or a URL parameter had to retype the union or cast the value
 * (`AGENTS.md` §2 forbids the cast), and a suite that looped over `["light",
 * "dark"]` kept testing two variants after a third shipped. The authored looks
 * added a seventh axis — a stored look — on the same contract, and the type
 * scale's roles are the eighth: a saved document stores the role a run was
 * written with, so the index and guard serve content as well as preferences.
 *
 * Two directions fail here: a guard that accepts something outside its index,
 * and an index that no longer matches the records it selects (a mode added to
 * `themeModes` without a theme, a density preset without a metric per size).
 *
 * Elevation is the ninth: `elevationLevels` was the ordered index a surface
 * picker iterates, and a saved workspace raises a surface with the level it
 * stored, so a name from a release that dropped one had no guard to narrow it
 * and `elevationShadow` answered a flat surface.
 *
 * The avatar scale is the tenth: an identity mark's size is a stored preference
 * as often as a literal, and `avatarSize` ships as a fixed record with no index
 * and no guard, so a saved size could only reach it through a cast.
 */
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
  isAvatarSize,
  isControlSize,
  isDensityName,
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
} from "./theme.js";
import { isTextRole, textRoles, typography } from "./typography.js";
import {
  avatarSizeFromStoredChoice,
  controlSizeFromStoredChoice,
  densityFromStoredChoice,
  elevationFromStoredChoice,
  lookFromStoredChoice,
  platformFromStoredChoice,
  textRoleFromStoredChoice,
  themeFromStoredChoice,
  toneFromStoredChoice,
} from "./persisted-choices.example.js";

/** One axis a consumer can store: its guard and the index it accepts. */
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
];

/** Values no guard may accept, whatever its index holds. */
const notMembers: ReadonlyArray<unknown> = [
  "",
  "nope",
  "Light",
  "default ",
  // Members of `Object.prototype`, which a record-membership test
  // (`name in scale`) answers true for.
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

  /**
   * The type scale is the last name a component paints from, and its index is
   * the scale's own keys minus the two families: a role the scale grew must be
   * listed (the package's type check refuses it otherwise), a role it dropped
   * must leave the index, and a family is not a role.
   */
  it("names every role of the type scale", () => {
    const scaleRoles = Object.keys(typography).filter(
      (key) => key !== "sans" && key !== "mono",
    );

    expect(new Set(textRoles)).toEqual(new Set(scaleRoles));
    expect(textRoles).toHaveLength(scaleRoles.length);
    expect(isTextRole("sans")).toBe(false);
    expect(isTextRole("mono")).toBe(false);
  });

  /**
   * The avatar scale is fixed rather than a theme group, so its index is held to
   * the record's own keys: a step the scale grows must be listed, and a listed
   * name the record does not carry has nothing to resolve.
   */
  it("names every step of the avatar scale", () => {
    expect(new Set(avatarSizes)).toEqual(new Set(Object.keys(avatarSize)));
    expect(avatarSizes).toHaveLength(Object.keys(avatarSize).length);
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
    expect(toneFromStoredChoice(getTheme("dark"), "purple").background).toBe(
      statusTone(getTheme("dark"), "info").background,
    );
  });
});
