/**
 * Guards the gate's behaviour on an **incomplete theme**.
 *
 * The bug this holds: `docs/tokens.md` §Paint-ready values promised that "a role
 * missing from a hand-built theme literal is reported too, because the runtime
 * cannot paint what is not there", and the reports instead threw.
 * `isPaintableColor` read `value.trim()` on `undefined`, so a theme restored
 * from storage that predated a role the library added since — the one way a
 * complete theme becomes incomplete — failed with
 * `TypeError: Cannot read properties of undefined (reading 'trim')` instead of
 * naming the role; a missing elevation level crashed the same way on `.flatMap`.
 * The other contracts were only accidentally safe: their colour maths is total
 * over an absent value, but their source types claimed a complete palette.
 *
 * The decision: absence is a **value the report carries**, not an exception. A
 * role is reported once by `invalidColorRoles` with `value: undefined`, a level
 * once by `invalidShadowColors` at position 0 with `color: undefined`, and the
 * contracts that measure a pair report it unmeasurable. `passed` stays false, so
 * a stored theme older than the library is one audit line rather than a crash.
 */

import { describe, expect, it } from "vitest";
import {
  auditTheme,
  colorRoles,
  isPaintableColor,
  invalidColorRoles,
  invalidShadowColors,
  lightElevation,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  themes,
  type BoxShadow,
  type ElevationLevel,
  type Theme,
  type ThemeColors,
} from "./index.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
} from "./theme.js";

/** Every style the library ships, as the gate would be run over them. */
const shipped: readonly Theme[] = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
  ...platformNames.flatMap((platform) =>
    Object.values(themes).map((theme) => platformTheme(theme, platform)),
  ),
  ...retroNames.flatMap((look) =>
    Object.values(themes).map((theme) => retroTheme(theme, look)),
  ),
];

/** The four levels, so a missing one can be named without a cast. */
const levels = [
  "sm",
  "md",
  "lg",
  "overlay",
] as const satisfies readonly ElevationLevel[];

/** `record` without `key` — the shape a stored theme older than a key has. */
const omit = <Record_ extends object>(
  record: Record_,
  key: keyof Record_,
): Partial<Record_> => {
  const partial: Partial<Record_> = { ...record };
  delete partial[key];
  return partial;
};

const colorsWithout = (theme: Theme, role: keyof ThemeColors) =>
  omit(theme.colors, role);

const elevationWithout = (theme: Theme, level: ElevationLevel) =>
  omit(theme.elevation, level);

/** Every shadow of a level in one colour, without reading a position. */
const recolour = (level: readonly BoxShadow[], color: string): BoxShadow[] =>
  level.map((shadow) => ({ ...shadow, color }));

describe("an absent role", () => {
  it("is not a colour the paint check accepts, instead of a crash", () => {
    expect(isPaintableColor(undefined)).toBe(false);
    expect(isPaintableColor(null)).toBe(false);
    expect(isPaintableColor(42)).toBe(false);
    expect(isPaintableColor({})).toBe(false);
    expect(isPaintableColor("")).toBe(false);
    expect(isPaintableColor("#7C5CF")).toBe(false);
    expect(isPaintableColor("#fff")).toBe(true);
  });

  it("is reported for every role, in documentation order", () => {
    const report = invalidColorRoles({ colors: {} });

    expect(report.map(({ role }) => role)).toEqual([...colorRoles]);
    expect(report.every(({ value }) => value === undefined)).toBe(true);
  });

  it("names a single role when the rest are complete", () => {
    const { primary: _omitted, ...restored } = lightTheme.colors;

    expect(invalidColorRoles({ colors: restored })).toEqual([
      { role: "primary", value: undefined },
    ]);
  });

  // 16 styles × 47 roles: a broad sweep, so it gets more than the default.
  it(
    "fails the gate by name, for every role of every shipped style",
    { timeout: 20_000 },
    () => {
      const wrong = shipped.flatMap((theme) =>
        colorRoles.flatMap((role) => {
          const report = auditTheme({
            ...theme,
            colors: colorsWithout(theme, role),
          });
          const named = report.invalidRoles.map(({ role: at }) => at);
          // The pairs the missing role sits on cannot be measured; the paint
          // report is the line that says why, so none may be reported readable.
          const readable = report.contrast.filter(
            (pair) =>
              (pair.foreground === role || pair.background === role) &&
              pair.ratio !== undefined,
          );
          return named.length === 1 &&
            named[0] === role &&
            readable.length === 0 &&
            !report.passed
            ? []
            : [`${theme.name} · ${role}`];
        }),
      );

      expect(wrong).toEqual([]);
    },
  );
});

describe("an absent elevation level", () => {
  it("is reported once, at position 0, with no colour", () => {
    expect(invalidShadowColors({ elevation: {} })).toEqual(
      levels.map((level) => ({ level, index: 0, color: undefined })),
    );
  });

  it("fails the gate by name, for every level of every shipped style", () => {
    const wrong = shipped.flatMap((theme) =>
      levels.flatMap((level) => {
        const report = auditTheme({
          ...theme,
          elevation: elevationWithout(theme, level),
        });
        return report.invalidShadows.length === 1 &&
          report.invalidShadows[0]?.level === level &&
          report.invalidShadows[0]?.color === undefined &&
          !report.passed
          ? []
          : [`${theme.name} · ${level}`];
      }),
    );

    expect(wrong).toEqual([]);
  });

  it("still reads the level's colour when the level is there", () => {
    const broken = {
      elevation: {
        ...lightElevation,
        md: recolour(lightElevation.md, "#00000"),
      },
    };

    expect(invalidShadowColors(broken)).toEqual([
      { level: "md", index: 0, color: "#00000" },
    ]);
  });
});

describe("a complete theme", () => {
  it("is still the only passing result", () => {
    expect(shipped.filter((theme) => !auditTheme(theme).passed)).toEqual([]);
  });
});

/**
 * The gate's other half of the incomplete-theme rule, and the bug this holds:
 * `docs/tokens.md` and this file said a missing numeric group was read "as the
 * groups a theme carries", while `invalidNumbers` opened `theme.typography` and
 * the consumer saw `TypeError: Cannot convert undefined or null to object` — no
 * group, no sentence, no way to know which release their theme predated. Adding
 * a group is a breaking change rather than an additive one, so absence here is
 * not a theme the reports can describe: the gate refuses it and names the group.
 */
describe("an absent numeric group", () => {
  const numericGroups = [
    "spacing",
    "radius",
    "borderWidth",
    "iconSize",
    "typography",
    "density",
  ] as const;

  it("is refused with the group's name instead of a TypeError", () => {
    numericGroups.forEach((group) => {
      const stored = omit(lightTheme, group);

      expect(() => auditTheme(stored as Theme), group).toThrow(
        `\`${group}\` is missing`,
      );
    });
  });

  it("names every missing group at once", () => {
    const stored = omit(omit(lightTheme, "density"), "typography");

    expect(() => auditTheme(stored as Theme)).toThrow(
      "`typography`, `density` are missing",
    );
  });

  it("reads a theme whose groups are all there, and whose groups are additive", () => {
    // The refusal is the numeric half only: a stored theme missing a colour role
    // or an elevation level is still an audit that returns, with the absence in
    // the report (the suites above hold that half).
    const stored = {
      ...lightTheme,
      colors: colorsWithout(lightTheme, "primary"),
      elevation: elevationWithout(lightTheme, "md"),
    };

    expect(() => auditTheme(stored)).not.toThrow();
    expect(auditTheme(stored).passed).toBe(false);
  });
});
