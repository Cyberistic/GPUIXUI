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
 *
 * The paint path owes the same promise, and it did not keep it: `elevationShadow`
 * read the level's first entry directly, so the surface the report had just
 * explained threw `TypeError: Cannot read properties of undefined (reading '0')`
 * on its first paint. A role the renderer cannot resolve paints nothing — a
 * property dropped from the batch — so an absent level now resolves to
 * `undefined` too, and the report is the one place the absence is named.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditTheme,
  colorRoles,
  defaultDensity,
  densityNames,
  densityPresets,
  elevationShadow,
  extendTheme,
  invalidColorRoles,
  invalidNumbers,
  invalidShadowColors,
  isPaintableColor,
  lightElevation,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  textStyle,
  themes,
  type BoxShadow,
  type Density,
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

/** A theme as storage hands it back: the type says complete, the value is not. */
const stored = (overrides: Partial<Record<keyof Theme, unknown>>): Theme =>
  ({ ...lightTheme, ...overrides }) as Theme;

/** The refusal's message, or `undefined` when the gate read the theme. */
const refusedWith = (theme: Theme): string | undefined => {
  try {
    auditTheme(theme);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

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

  it("paints nothing for the level instead of throwing", () => {
    const stored = {
      ...lightTheme,
      elevation: elevationWithout(lightTheme, "md"),
    };

    expect(elevationShadow(stored, "md")).toBeUndefined();
    // The neighbours are untouched: the absence is one level, not the scale.
    expect(elevationShadow(stored, "sm")).toBe(lightElevation.sm[0]);
    expect(elevationShadow(stored, "lg")).toBe(lightElevation.lg[0]);
  });

  it("paints every surviving level of every shipped style", () => {
    const wrong = shipped.flatMap((theme) =>
      levels.flatMap((level) => {
        const stored = {
          ...theme,
          elevation: elevationWithout(theme, level),
        };
        const survivors = levels.filter((at) => at !== level);
        return elevationShadow(stored, level) === undefined &&
          survivors.every(
            (at) => elevationShadow(stored, at) === theme.elevation[at][0],
          )
          ? []
          : [`${theme.name} · ${level}`];
      }),
    );

    expect(wrong).toEqual([]);
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

/**
 * The bug this holds: a stored theme can predate a **step** inside a group it
 * still carries — the release that grew the type scale added `codeBlock`, and
 * `density` gained a metric before that — and the gate passed it. The reports
 * cannot see the absence because they walk the steps a theme carries
 * (`invalidNumbers` reads `Object.entries`), so `auditTheme` returned
 * `passed: true` for a theme no component can paint: `textStyle(theme,
 * "codeBlock")` reads `typography.codeBlock.fontSize`, which is a `TypeError` at
 * the first paint that asks for the role, and a missing `lineHeight` is a
 * property the serialised batch drops, so the role paints at the runtime's
 * leading with every report empty.
 *
 * The decision is the group rule one level down: a step is what the components
 * read, so the gate refuses a theme missing one and names the path instead of
 * reporting a number that is not there. The required list is derived from the
 * scales this release ships, so a step added to one is required without a second
 * list to edit.
 */
describe("an absent numeric step", () => {
  it("is a theme no report describes and no paint survives", () => {
    const missingRole = stored({
      typography: omit(lightTheme.typography, "codeBlock"),
    });

    // The number report walks the steps a theme carries, so it is silent about
    // one that is not there; the first paint that asks for the role throws.
    expect(invalidNumbers(missingRole)).toEqual([]);
    expect(() => textStyle(missingRole, "codeBlock")).toThrow(TypeError);
    expect(refusedWith(missingRole)).toContain(
      "`typography.codeBlock` is missing",
    );
  });

  it("names a path in every group it can lose one from", () => {
    const stripped: ReadonlyArray<readonly [string, Theme]> = [
      ["spacing.md", stored({ spacing: omit(lightTheme.spacing, "md") })],
      ["radius.full", stored({ radius: omit(lightTheme.radius, "full") })],
      [
        "borderWidth.strong",
        stored({ borderWidth: omit(lightTheme.borderWidth, "strong") }),
      ],
      ["iconSize.md", stored({ iconSize: omit(lightTheme.iconSize, "md") })],
      [
        "typography.sans",
        stored({ typography: omit(lightTheme.typography, "sans") }),
      ],
      [
        "typography.codeBlock",
        stored({ typography: omit(lightTheme.typography, "codeBlock") }),
      ],
      [
        "typography.body.lineHeight",
        stored({
          typography: {
            ...lightTheme.typography,
            body: omit(lightTheme.typography.body, "lineHeight"),
          },
        }),
      ],
      [
        "density.controlHeight.sm",
        stored({
          density: {
            ...lightTheme.density,
            controlHeight: omit(lightTheme.density.controlHeight, "sm"),
          },
        }),
      ],
      [
        "density.controlPaddingX.lg",
        stored({
          density: {
            ...lightTheme.density,
            controlPaddingX: omit(lightTheme.density.controlPaddingX, "lg"),
          },
        }),
      ],
      [
        "density.rowHeight",
        stored({ density: omit(lightTheme.density, "rowHeight") }),
      ],
    ];

    const wrong = stripped.filter(
      ([path, theme]) =>
        !refusedWith(theme)?.includes(`\`${path}\` is missing`),
    );

    expect(wrong.map(([path]) => path)).toEqual([]);
    // Every entry is refused by the step rule, not by a group or a crash.
    expect(
      stripped.filter(([, theme]) =>
        refusedWith(theme)?.includes("every numeric step"),
      ),
    ).toHaveLength(stripped.length);
  });

  it("names every missing step at once, in documentation order", () => {
    const two = stored({
      spacing: omit(lightTheme.spacing, "md"),
      density: omit(lightTheme.density, "rowHeight"),
    });

    expect(refusedWith(two)).toContain(
      "`spacing.md`, `density.rowHeight` are missing",
    );
  });

  it("reads every shipped style and every preset, which are complete", () => {
    const presets = densityNames.map((density) =>
      extendTheme(lightTheme, { density }),
    );
    const styles = [...shipped, ...presets];

    expect(() => styles.forEach((theme) => auditTheme(theme))).not.toThrow();
    expect(styles.filter((theme) => !auditTheme(theme).passed)).toEqual([]);
  });

  it("derives its steps from a preset every other preset mirrors", () => {
    // The required list is `defaultDensity`'s shape, so a preset that gained or
    // lost a metric would carry a step the gate never asks about.
    const steps = (density: Density) => [
      Object.keys(density.controlHeight),
      Object.keys(density.controlPaddingX),
    ];

    expect(
      densityNames.filter(
        (name) =>
          JSON.stringify(steps(densityPresets[name])) !==
          JSON.stringify(steps(defaultDensity)),
      ),
    ).toEqual([]);
  });

  it("is taught on both token pages", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");

    expect(catalogue).toContain("a theme must carry every numeric step:");
    expect(catalogue).toContain("`typography.codeBlock`");
    expect(catalogue).toContain("`density.controlHeight.sm`");
    expect(designSystem).toContain("every numeric step");
  });
});

/**
 * The bug this holds: every family is a **string the theme must name**, and the
 * gate asked only that it be there. `sans: ""` is present, so `requireSteps`'
 * absence rule read it as complete while `textStyle` handed the runtime
 * `fontFamily: ""` and every text role painted the renderer's fallback — the
 * face a theme exists to state, gone with every report empty. The playground's
 * `register-font` probe measures what an unknown family does: the installed face
 * lays `ABm` out at its own 80px and a family no runtime knows paints the
 * fallback's 44px, so an empty name is the whole identity lost, not a cosmetic
 * detail. No report can describe it — `invalidNumbers` reads numbers,
 * `invalidColorRoles` colours — so the gate refuses it, the same rule the missing
 * step and group above follow.
 */
describe("an unnamed font family", () => {
  it("is a theme no report measures and every role falls back from", () => {
    const blank = stored({
      typography: { ...lightTheme.typography, sans: "" },
    });

    // Every other contract reads its own kind of value, so each is silent.
    expect(invalidNumbers(blank)).toEqual([]);
    expect(invalidColorRoles(blank)).toEqual([]);
    // The string the batch would hand the runtime for every sans role.
    expect(textStyle(blank, "body").fontFamily).toBe("");
    expect(refusedWith(blank)).toContain("`typography.sans` is blank");
  });

  it("names every blank family at once, whitespace included", () => {
    const blank = stored({
      typography: { ...lightTheme.typography, sans: "  ", mono: "" },
    });

    expect(refusedWith(blank)).toContain(
      "`typography.sans`, `typography.mono` are blank",
    );
  });

  it("reads a named custom face and every shipped style", () => {
    const brand = extendTheme(lightTheme, {
      typography: { sans: "Inter", mono: "JetBrains Mono" },
    });

    expect(refusedWith(brand)).toBeUndefined();
    // A family is a name, so the face a machine lacks is still a name.
    expect(shipped.filter((theme) => refusedWith(theme) !== undefined)).toEqual(
      [],
    );
  });

  it("is taught on both token pages", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");
    const readme = read("../README.md");

    expect(catalogue).toContain("a theme must name every font family:");
    expect(catalogue).toContain("`typography.sans`");
    expect(designSystem).toContain("every font family");
    expect(readme).toContain("every font family");
  });
});
