/**
 * Guards the persisted-choice contract.
 *
 * The defect this holds: the package exposed six unions a consumer can store —
 * theme mode, contrast variant, platform, density, control size and status tone —
 * with no index and no guard. A preference restored from storage is `unknown`,
 * so a settings row or a URL parameter had to retype the union or cast the value
 * (`AGENTS.md` §2 forbids the cast), and a suite that looped over `["light",
 * "dark"]` kept testing two variants after a third shipped.
 *
 * Two directions fail here: a guard that accepts something outside its index,
 * and an index that no longer matches the records it selects (a mode added to
 * `themeModes` without a theme, a density preset without a metric per size).
 */
import { describe, expect, it } from "vitest";
import { isPlatformName, platformNames, platformStyles } from "./platforms.js";
import {
  controlSizes,
  densityNames,
  densityPresets,
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
import {
  controlSizeFromStoredChoice,
  densityFromStoredChoice,
  platformFromStoredChoice,
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
];

/** Values no guard may accept, whatever its index holds. */
const notMembers: ReadonlyArray<unknown> = [
  "",
  "nope",
  "Light",
  "default ",
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
    expect(toneFromStoredChoice(getTheme("dark"), "purple").background).toBe(
      statusTone(getTheme("dark"), "info").background,
    );
  });
});
