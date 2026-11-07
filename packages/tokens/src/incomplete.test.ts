import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditTheme,
  brandText,
  brandTextOn,
  contrastFailures,
  contrastFloorsFor,
  colorRoles,
  contrastPairs,
  contrastRatio,
  controlFocusRing,
  controlHeight,
  controlPaddingX,
  defaultDensity,
  densityNames,
  densityPresets,
  disabledAction,
  elevationShadow,
  extendTheme,
  filledHover,
  filledPressed,
  focusRing,
  highContrastFloors,
  highlightFailures,
  invalidColorRoles,
  invalidNumbers,
  invalidScales,
  invalidShadowColors,
  invalidSwitchColors,
  isPaintableColor,
  keyboardFocusRing,
  lightElevation,
  lightTheme,
  missingTokens,
  nativeTextTheme,
  platformNames,
  platformTheme,
  restoreTheme,
  retroNames,
  retroTheme,
  selectionOn,
  statusTone,
  switchFailures,
  textStyle,
  themeColors,
  themes,
  type BoxShadow,
  type Density,
  type DensitySource,
  type ElevationLevel,
  type StoredTheme,
  type Theme,
  type ThemeColors,
} from "./index.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
} from "./theme.js";
import {
  darkSeries,
  highContrastDarkSeries,
  lightSeries,
  seriesColors,
  seriesFailures,
} from "./series.js";
import {
  darkSyntax,
  highContrastDarkSyntax,
  lightSyntax,
  syntaxColors,
  syntaxFailures,
  syntaxRoles,
} from "./syntax.js";

const sourcesUnder = (
  root: string,
): ReadonlyArray<readonly [string, string]> => {
  const walk = (
    url: URL,
    prefix = "",
  ): ReadonlyArray<readonly [string, string]> =>
    readdirSync(url, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) {
        return walk(new URL(`${entry.name}/`, url), `${prefix}${entry.name}/`);
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        return [];
      }
      if (entry.name.includes(".test.")) {
        return [];
      }
      return [
        [
          `${prefix}${entry.name}`,
          readFileSync(new URL(entry.name, url), "utf8"),
        ],
      ];
    });
  return walk(new URL(root, import.meta.url));
};

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

const shippedAudits = shipped.map((theme) => ({
  theme,
  audit: auditTheme(theme),
}));

const unpainted = (): readonly string[] =>
  shippedAudits
    .filter(({ audit }) => !audit.passed)
    .map(({ theme }) => theme.name);

const levels = [
  "sm",
  "md",
  "lg",
  "overlay",
] as const satisfies readonly ElevationLevel[];

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

const recolour = (level: readonly BoxShadow[], color: string): BoxShadow[] =>
  level.map((shadow) => ({ ...shadow, color }));

const stored = (overrides: Partial<Record<keyof Theme, unknown>>): Theme =>
  ({ ...lightTheme, ...overrides }) as Theme;

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

  it("is named, and leaves no pair it sits on readable, in every shipped style", () => {
    const wrong = shipped.flatMap((theme) =>
      colorRoles.flatMap((role) => {
        const colors = themeColors({ colors: colorsWithout(theme, role) });
        const named = invalidColorRoles({ colors }).map((at) => at.role);

        const readable = contrastPairs.filter(
          ({ foreground, background }) =>
            (foreground === role || background === role) &&
            contrastRatio(colors[foreground], colors[background]) !== undefined,
        );
        return named.length === 1 && named[0] === role && readable.length === 0
          ? []
          : [`${theme.name} · ${role}`];
      }),
    );

    expect(wrong).toEqual([]);
  });
});

describe("an absent elevation level", () => {
  it("is reported once, at position 0, with no colour", () => {
    expect(invalidShadowColors({ elevation: {} })).toEqual(
      levels.map((level) => ({ level, index: 0, color: undefined })),
    );
  });

  it("is named once, without a colour, for every level of every shipped style", () => {
    const wrong = shipped.flatMap((theme) =>
      levels.flatMap((level) => {
        const report = invalidShadowColors({
          elevation: elevationWithout(theme, level),
        });
        return report.length === 1 &&
          report[0]?.level === level &&
          report[0]?.color === undefined
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

describe("an absent elevation group", () => {
  const absentScale = () => stored({ elevation: undefined });

  it("is every level missing, reported rather than thrown", () => {
    expect(invalidShadowColors({})).toEqual(
      levels.map((level) => ({ level, index: 0, color: undefined })),
    );
    const report = auditTheme(absentScale());

    expect(report.invalidShadows.map(({ level }) => level)).toEqual([
      ...levels,
    ]);
    expect(
      report.invalidShadows.every(({ color }) => color === undefined),
    ).toBe(true);
    const raised = report.decorative.filter(
      ({ surface }) => surface === "elevation",
    );
    expect(raised.length).toBeGreaterThan(0);
    expect(raised.every(({ ratio }) => ratio === undefined)).toBe(true);
    expect(report.passed).toBe(false);
  });

  it("paints nothing for every level instead of throwing", () => {
    const theme = absentScale();

    levels.forEach((level) =>
      expect(elevationShadow(theme, level), level).toBeUndefined(),
    );
  });

  it("leaves the scale audit's rungs to the shadow report", () => {
    const theme = absentScale();

    expect(invalidNumbers(theme)).toEqual([]);
    expect(
      invalidScales(theme).filter(({ group }) => group === "elevation"),
    ).toEqual([]);
  });

  it("keeps every shipped style's scale whole", () => {
    shipped.forEach((theme) => {
      levels.forEach((level) =>
        expect(elevationShadow(theme, level), `${theme.name} · ${level}`).toBe(
          theme.elevation[level][0],
        ),
      );
      expect(theme.elevation).toHaveProperty("lg");
    });
    expect(unpainted()).toEqual([]);
  });

  it("teaches the group in the pages that state the absence rule", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");

    expect(catalogue).toContain("the whole `elevation` group");
    expect(catalogue).toContain("the same absence one level up");
    expect(designSystem).toContain("or the whole elevation scale");
    expect(designSystem).toContain("or a whole scale");
    expect(catalogue).not.toContain(
      "a theme must carry every numeric group: `elevation`",
    );
  });
});

describe("an absent colour group", () => {
  const absentGroup = () => stored({ colors: undefined });

  it("is every role missing, reported rather than thrown", () => {
    expect(themeColors({})).toEqual({});
    expect(invalidColorRoles({})).toEqual(
      colorRoles.map((role) => ({ role, value: undefined })),
    );

    const report = auditTheme(absentGroup());

    expect(report.invalidRoles.map(({ role }) => role)).toEqual([
      ...colorRoles,
    ]);
    expect(report.invalidRoles.every(({ value }) => value === undefined)).toBe(
      true,
    );
    expect(report.passed).toBe(false);
  });

  it("leaves no report that reads a role empty", () => {
    const report = auditTheme(absentGroup());
    const unmeasurable = (
      failures: ReadonlyArray<{ ratio?: number | undefined }>,
    ) =>
      failures.length > 0 && failures.every(({ ratio }) => ratio === undefined);

    expect(unmeasurable(report.contrast)).toBe(true);
    expect(unmeasurable(report.decorative)).toBe(true);
    expect(unmeasurable(report.selection)).toBe(true);
    expect(unmeasurable(report.indicators)).toBe(true);
    expect(unmeasurable(report.syntax)).toBe(true);
    expect(unmeasurable(report.highlight)).toBe(true);
    expect(unmeasurable(report.disabledFade)).toBe(true);
    expect(unmeasurable(report.keyboardDim)).toBe(true);
    expect(unmeasurable(report.series.surfaces)).toBe(true);

    expect(unmeasurable(highlightFailures({}))).toBe(true);
    expect(
      unmeasurable(
        switchFailures({
          switch: { on: "#3BC97F", off: "#E3E3E8", knob: "#FFFFFF" },
        }).placements,
      ),
    ).toBe(true);

    expect(report.invalidNumbers).toEqual([]);
    expect(report.invalidShadows).toEqual([]);
  });

  it("paints nothing through the seams the reports share, instead of throwing", () => {
    const theme = absentGroup();

    expect(brandText({})).toBeUndefined();
    expect(brandTextOn({}, "infoSoft")).toBeUndefined();
    expect(statusTone({}, "destructive")).toBeUndefined();

    expect(brandText(theme)).toBeUndefined();
    expect(statusTone(theme, "destructive")).toBeUndefined();

    expect(selectionOn(theme, "background")).toBeUndefined();

    expect(filledHover(theme, "primary")).toBeUndefined();
    expect(filledPressed(theme, "primary")).toBeUndefined();

    expect(focusRing(theme)).toBeUndefined();
    expect(disabledAction(theme)).toBeUndefined();

    const unDensed: DensitySource = omit(lightTheme, "density");
    expect(controlHeight(unDensed, "md")).toBeUndefined();
    expect(controlPaddingX(unDensed, "md")).toBeUndefined();

    const inventory = readFileSync(
      new URL("../../../.agents/slop/COMPONENTS.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(inventory).toContain(
      "`focusRing` answers `undefined` when the theme lost `ring`",
    );
  });

  it("reads every role the primitives paint through their one seam", () => {
    const painted = sourcesUnder("../../primitives/src/");
    expect(
      painted.length,
      "the primitives walk found no paint sources",
    ).toBeGreaterThan(6);

    expect(
      painted
        .filter(([, source]) => source.includes("theme.colors"))
        .map(([path]) => path),
      "a paint source reads the colour group directly",
    ).toEqual([]);
    expect(
      painted.filter(([, source]) => source.includes("colorRole(")).length,
      "the seam is not the route the painters take",
    ).toBeGreaterThan(6);

    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(catalogue).toContain("packages/primitives/src/core/theme.ts");
    expect(catalogue).toContain("`colorRole(theme, role)`");
  });

  it("reads every shipped style as whole", () => {
    shippedAudits.forEach(({ theme, audit }) => {
      expect(themeColors(theme), theme.name).toBe(theme.colors);
      expect(audit.passed, theme.name).toBe(true);
    });
  });

  it("teaches the group in the pages and the README", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");
    const readme = read("../README.md");

    expect(catalogue).toContain("lost the whole **`colors` group**");
    expect(catalogue).toContain("`themeColors(theme)`");
    expect(designSystem).toContain("lost the whole `colors` group");
    expect(readme).toContain("whole `colors` group");

    expect(catalogue).not.toContain(
      "a theme must carry every numeric group: `colors`",
    );
  });
});

describe("a complete theme", () => {
  it("is still the only passing result", () => {
    expect(unpainted()).toEqual([]);
  });
});

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
    const stored = {
      ...lightTheme,
      colors: colorsWithout(lightTheme, "primary"),
      elevation: elevationWithout(lightTheme, "md"),
    };

    expect(() => auditTheme(stored)).not.toThrow();
    expect(auditTheme(stored).passed).toBe(false);
  });
});

describe("an absent numeric step", () => {
  it("is a theme no report describes and the paint reads from the library", () => {
    const missingRole = stored({
      typography: omit(lightTheme.typography, "codeBlock"),
    });

    expect(invalidNumbers(missingRole)).toEqual([]);
    expect(textStyle(missingRole, "codeBlock")).toEqual(
      textStyle(lightTheme, "codeBlock"),
    );
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

    const failed = [
      ...unpainted(),
      ...presets
        .filter((theme) => !auditTheme(theme).passed)
        .map((theme) => theme.name),
    ];

    expect(failed).toEqual([]);
  });

  it("derives its steps from a preset every other preset mirrors", () => {
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

describe("the parts a theme lost, as data", () => {
  it("names a whole group once, without the steps inside it", () => {
    const stored = omit(lightTheme, "typography");

    expect(missingTokens(stored)).toEqual([
      { group: "typography", path: "", kind: "group" },
    ]);
  });

  it("names every group it lost, in scale order", () => {
    const stored = omit(omit(lightTheme, "density"), "radius");

    expect(missingTokens(stored)).toEqual([
      { group: "radius", path: "", kind: "group" },
      { group: "density", path: "", kind: "group" },
    ]);
  });

  it("names a step and a field the theme lost, once each", () => {
    const stored = {
      ...lightTheme,
      spacing: omit(lightTheme.spacing, "md"),
      typography: {
        ...lightTheme.typography,
        body: omit(lightTheme.typography.body, "lineHeight"),
      },
    };

    expect(missingTokens(stored)).toEqual([
      { group: "spacing", path: "md", kind: "step" },
      { group: "typography", path: "body.lineHeight", kind: "step" },
    ]);
  });

  it("tells a family a store wrote blank from one it lost", () => {
    const blank = {
      ...lightTheme,
      typography: { ...lightTheme.typography, sans: "  " },
    };
    const absent = {
      ...lightTheme,
      typography: omit(lightTheme.typography, "sans"),
    };

    expect(missingTokens(blank)).toEqual([
      { group: "typography", path: "sans", kind: "family" },
    ]);

    expect(missingTokens(absent)).toEqual([
      { group: "typography", path: "sans", kind: "step" },
    ]);
  });

  it("reads a scale token a store wrote as null as one it lost", () => {
    const nulled = stored({
      spacing: { ...lightTheme.spacing, md: null },
      radius: { ...lightTheme.radius, md: null },
      iconSize: { ...lightTheme.iconSize, xs: null },
      density: {
        ...lightTheme.density,
        controlPaddingX: { ...lightTheme.density.controlPaddingX, sm: null },
      },
    });

    expect(invalidNumbers(nulled)).toEqual([]);
    expect(missingTokens(nulled)).toEqual([
      { group: "spacing", path: "md", kind: "step" },
      { group: "radius", path: "md", kind: "step" },
      { group: "iconSize", path: "xs", kind: "step" },
      { group: "density", path: "controlPaddingX.sm", kind: "step" },
    ]);
    expect(refusedWith(nulled)).toContain("`spacing.md`");
  });

  it("reads a group a store nulled as the group, not its steps", () => {
    const nulled = stored({ spacing: null });

    expect(missingTokens(nulled)).toEqual([
      { group: "spacing", path: "", kind: "group" },
    ]);
    expect(refusedWith(nulled)).toContain("`spacing` is missing");
  });

  it("reads a type role field a store nulled as the step it lost", () => {
    const nulled = stored({
      typography: {
        ...lightTheme.typography,
        body: { ...lightTheme.typography.body, lineHeight: null },
      },
    });

    expect(missingTokens(nulled)).toEqual([
      { group: "typography", path: "body.lineHeight", kind: "step" },
    ]);
    expect(refusedWith(nulled)).toContain("`typography.body.lineHeight`");
  });

  it("reads every shipped style and preset as whole", () => {
    const presets = densityNames.map((density) =>
      extendTheme(lightTheme, { density }),
    );
    const incomplete = [...shipped, ...presets].filter(
      (theme) => missingTokens(theme).length > 0,
    );

    expect(incomplete.map(({ name }) => name)).toEqual([]);
  });

  it("leaves an additive absence to the reports", () => {
    const additive = {
      ...lightTheme,
      colors: colorsWithout(lightTheme, "primary"),
      elevation: elevationWithout(lightTheme, "md"),
    };

    expect(missingTokens(additive)).toEqual([]);
    expect(auditTheme(additive).passed).toBe(false);
  });

  it("agrees with the refusal, path for path", () => {
    const broken: ReadonlyArray<readonly [string, Theme]> = [
      ["a group", stored({ typography: undefined })],
      ["two groups", stored({ radius: undefined, iconSize: undefined })],
      ["a step", stored({ spacing: omit(lightTheme.spacing, "2xs") })],
      [
        "a step a store nulled",
        stored({ radius: { ...lightTheme.radius, lg: null } }),
      ],
      [
        "a field",
        stored({
          typography: {
            ...lightTheme.typography,
            h1: omit(lightTheme.typography.h1, "fontSize"),
          },
        }),
      ],
      [
        "a blank family",
        stored({ typography: { ...lightTheme.typography, mono: "" } }),
      ],
    ];

    const drift = broken.flatMap(([label, theme]) => {
      const missing = missingTokens(theme);
      const message = refusedWith(theme) ?? "";
      const named = missing.map(({ group, path }) =>
        path === "" ? `\`${group}\`` : `\`${group}.${path}\``,
      );
      return missing.length > 0 && named.every((name) => message.includes(name))
        ? []
        : [label];
    });

    expect(drift).toEqual([]);
  });

  it("reads what a store handed back, including no theme at all", () => {
    const everyGroup = missingTokens({});

    [null, undefined, "light", 42, true, []].forEach((stored) => {
      expect(() => missingTokens(stored)).not.toThrow();
      expect(missingTokens(stored)).toEqual(everyGroup);
    });

    expect(everyGroup.map(({ path }) => path)).toEqual(
      everyGroup.map(() => ""),
    );
    expect(everyGroup.map(({ kind }) => kind)).toEqual(
      everyGroup.map(() => "group"),
    );

    expect(missingTokens(lightTheme)).toEqual([]);
  });

  it("teaches the source it takes on both token pages, the seam and the README", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const seam = read("./missing.ts");

    expect(seam).toContain("export function missingTokens(theme: unknown)");

    expect(seam).not.toContain("as typeof lightTheme");
    expect(catalogue).not.toContain("as typeof lightTheme");
    expect(catalogue).toContain("The source is what the store handed back");
    expect(catalogue).toContain(
      "const stored: unknown = JSON.parse(fromStorage);",
    );
    expect(designSystem).toContain("so a decoded value never needs a cast");
    expect(readme).toContain("called with what a store handed back");
  });

  it("is taught on both token pages and the package README", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");
    const readme = read("../README.md");

    expect(catalogue).toContain("`missingTokens(theme)`");
    expect(catalogue).toContain("names a group once");
    expect(catalogue).toContain("a key it kept without a value");
    expect(designSystem).toContain("`missingTokens`");
    expect(designSystem).toContain("**kept without a value**");
    expect(readme).toContain("`missingTokens`");
    expect(readme).toContain("a key without a value");
  });
});

describe("an unnamed font family", () => {
  it("is a theme no report measures and the paint answers the library's face", () => {
    const blank = stored({
      typography: { ...lightTheme.typography, sans: "" },
    });

    expect(invalidNumbers(blank)).toEqual([]);
    expect(invalidColorRoles(blank)).toEqual([]);

    expect(textStyle(blank, "body").fontFamily).toBe(
      lightTheme.typography.sans,
    );
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

    expect(
      shipped
        .filter((theme) => missingTokens(theme).length > 0)
        .map((theme) => theme.name),
    ).toEqual([]);
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

describe("a scale a store wrote", () => {
  it("reports a role a store wrote as null, instead of throwing", () => {
    const nullRole = stored({
      colors: { ...lightTheme.colors, foreground: null },
    });

    expect(invalidColorRoles(nullRole)).toEqual([
      { role: "foreground", value: undefined },
    ]);

    const report = auditTheme(nullRole);
    expect(
      report.contrast.filter(
        (pair) => pair.foreground === "foreground" && pair.ratio === undefined,
      ).length,
    ).toBeGreaterThan(0);
    expect(report.passed).toBe(false);
  });

  it("measures every position a series names, not the entries it carries", () => {
    const short = stored({ series: lightSeries.slice(0, 1) });

    const report = seriesFailures(short);
    const lost = report.surfaces.filter(({ index }) => index > 0);

    expect(lost.map(({ index }) => index)).toEqual([
      1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4,
    ]);
    expect(
      lost.every(
        ({ color, ratio }) => color === undefined && ratio === undefined,
      ),
    ).toBe(true);

    expect(
      report.distinctness.filter(({ distance }) => distance === undefined),
    ).toHaveLength(10);
    expect(
      report.deficiencies.filter(({ distance }) => distance === undefined),
    ).toHaveLength(30);
    expect(auditTheme(short).passed).toBe(false);
  });

  it("reports a series colour a store wrote as null, instead of throwing", () => {
    const holed = stored({
      series: [
        lightSeries[0],
        null,
        lightSeries[2],
        lightSeries[3],
        lightSeries[4],
      ],
    });

    const surfaces = seriesFailures(holed).surfaces;
    expect(new Set(surfaces.map(({ index }) => index))).toEqual(new Set([1]));
    expect(surfaces.every(({ color }) => color === undefined)).toBe(true);
  });

  it("reports a syntax palette that names only some tokens", () => {
    const partial = stored({ syntax: { keyword: "#3B2C8F" } });

    const failures = syntaxFailures(partial);
    const named = failures.filter(({ role }) => role !== "keyword");

    expect(named).toHaveLength((syntaxRoles.length - 1) * 2);
    expect(named.every(({ ratio }) => ratio === undefined)).toBe(true);

    expect(failures.filter(({ role }) => role === "constructor")).toHaveLength(
      2,
    );
    expect(auditTheme(partial).passed).toBe(false);
  });

  it("reports a syntax token a store wrote as null, instead of throwing", () => {
    const nullToken = {
      ...darkTheme,
      syntax: { ...darkSyntax, keyword: null },
    } as unknown as Theme;

    const failures = syntaxFailures(nullToken);

    expect(failures).toHaveLength(2);
    expect(
      failures.every(
        ({ role, ratio }) => role === "keyword" && ratio === undefined,
      ),
    ).toBe(true);
  });

  it("is taught on both token pages and the package README", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");
    const readme = read("../README.md");

    expect(catalogue).toContain(
      "answers the table the theme inherits at every position it does not",
    );
    expect(catalogue).toContain("A **token the palette does not name**");
    expect(catalogue).toContain("the `null` JSON writes");
    expect(catalogue).toContain("**completes** the palette it paints");
    expect(designSystem).toContain("every one of the five series positions");
    expect(designSystem).toContain(
      "completed from the shipped table when painted",
    );

    expect(readme).toContain("`measuredColour`/`opaqueRgb`/`alphaOf`");
    expect(readme).toContain("every one of the five");
    expect(readme).toContain("a token the theme names is its own");
  });

  it("reads every shipped style's own tables, which are complete", () => {
    const incomplete = shipped.filter(
      (theme) =>
        seriesFailures(theme).surfaces.length > 0 ||
        seriesFailures(theme).distinctness.length > 0 ||
        seriesFailures(theme).deficiencies.length > 0 ||
        syntaxFailures(theme).length > 0,
    );

    expect(incomplete.map(({ name }) => name)).toEqual([]);
  });
});

describe("a shadow a store wrote", () => {
  const levelAsObject = () => {
    const [first] = lightElevation.md;
    expect(first).toBeDefined();
    return stored({
      elevation: { ...lightTheme.elevation, md: first ?? null },
    });
  };

  const holedLevel = () =>
    stored({ elevation: { ...lightTheme.elevation, lg: [null] } });

  it("reports a level that is not a list once, instead of throwing", () => {
    const object = levelAsObject();

    expect(invalidShadowColors(object)).toEqual([
      { level: "md", index: 0, color: undefined },
    ]);

    expect(elevationShadow(object, "md")).toBeUndefined();
    expect(() => auditTheme(object)).not.toThrow();
    expect(auditTheme(object).passed).toBe(false);
  });

  it("reports an entry that is not a shadow, and paints nothing for it", () => {
    const holed = holedLevel();

    expect(invalidShadowColors(holed)).toEqual([
      { level: "lg", index: 0, color: undefined },
    ]);
    expect(invalidNumbers(holed)).toEqual([]);
    expect(elevationShadow(holed, "lg")).toBeUndefined();
    expect(() => auditTheme(holed)).not.toThrow();
    expect(auditTheme(holed).passed).toBe(false);
  });

  it("reports a shadow colour a store wrote as something else", () => {
    const [first] = lightElevation.sm;
    expect(first).toBeDefined();
    if (first === undefined) return;

    const wrong = stored({
      elevation: {
        ...lightTheme.elevation,
        sm: [{ ...first, color: 42 }],
      },
    });

    expect(invalidShadowColors(wrong)).toEqual([
      { level: "sm", index: 0, color: undefined },
    ]);
    expect(auditTheme(wrong).passed).toBe(false);
  });

  it("paints every level a store wrote as a list", () => {
    expect(elevationShadow(lightTheme, "lg")).toEqual(
      lightTheme.elevation.lg[0],
    );
    expect(elevationShadow(levelAsObject(), "sm")).toEqual(
      lightTheme.elevation.sm[0],
    );
  });

  it("is what the pages and the inventory promise", () => {
    const read = (path: string) =>
      readFileSync(
        new URL(`../../../${path}`, import.meta.url),
        "utf8",
      ).replace(/\s+/g, " ");

    const page = read("docs/tokens.md");
    const system = read("docs/design-system.md");
    const inventory = read(".agents/slop/COMPONENTS.md");
    const readme = read("packages/tokens/README.md");

    expect(page).toContain("A shape a store wrote is the same absence");
    expect(page).toContain("a list holding a `null`");
    expect(system).toContain("A shape a store wrote is that same absence");
    expect(inventory).toContain("a shape a store wrote");
    expect(readme).toContain("a level a store wrote as anything but a list");
  });
});

describe("an optional table a store nulled", () => {
  const nulled = (theme: Theme): Theme =>
    ({
      ...theme,
      series: null,
      syntax: null,
      switch: null,
    }) as unknown as Theme;

  it("resolves the shipped scale, instead of handing a chart null", () => {
    const light = nulled(lightTheme);

    expect(seriesColors(light)).toBe(lightSeries);
    expect(seriesColors(nulled(darkTheme))).toBe(darkSeries);

    const report = seriesFailures(light);
    expect(report.surfaces).toEqual([]);
    expect(report.distinctness).toEqual([]);
    expect(report.deficiencies).toEqual([]);
    expect(auditTheme(light).passed).toBe(true);
  });

  it("resolves the shipped palette, and hands it to the native host", () => {
    const light = nulled(lightTheme);

    expect(syntaxColors(light)).toBe(lightSyntax);
    expect(syntaxColors(nulled(darkTheme))).toBe(darkSyntax);

    expect(nativeTextTheme(light).syntax).toBe(lightSyntax);
    expect(syntaxFailures(light)).toEqual([]);
    expect(auditTheme(light).passed).toBe(true);
  });

  it("reads a nulled switch as the accent toggle, instead of throwing", () => {
    const light = nulled(lightTheme);

    expect(switchFailures(light)).toEqual({
      paint: [],
      placements: [],
      metrics: [],
    });
    expect(invalidSwitchColors(light)).toEqual([]);
    expect(() => auditTheme(light)).not.toThrow();
    expect(auditTheme(light).passed).toBe(true);
  });

  it("still measures a switch the theme declares", () => {
    const typo = stored({
      switch: { on: "#30D158", off: "#E9E9E", knob: "#FFFFFF" },
    });

    expect(invalidSwitchColors(typo)).toEqual([
      { slot: "off", value: "#E9E9E" },
    ]);
    expect(switchFailures(typo).paint).toHaveLength(1);
  });

  it("keeps the positions a scale names and completes the ones it does not", () => {
    const short = lightSeries.slice(0, 2);
    const declared = stored({
      switch: { on: "#30D158", off: "#DCDCE1", knob: "#FFFFFF" },
    });

    expect(seriesColors(stored({ series: short }))).toEqual([
      ...short,
      lightSeries[2],
      lightSeries[3],
      lightSeries[4],
    ]);

    expect(seriesFailures(stored({ series: short })).surfaces).not.toEqual([]);
    expect(switchFailures(declared)).toEqual({
      paint: [],
      placements: [],
      metrics: [],
    });
  });

  it("keeps the tokens a palette names and completes the ones it does not", () => {
    const partial = { keyword: "#3B2C8F" };
    const palette = syntaxColors(stored({ syntax: partial }));

    expect(palette.keyword).toBe(partial.keyword);
    expect(palette.constructor).toBe(lightSyntax.constructor);
    expect(palette.number).toBe(lightSyntax.number);
  });

  it("reads every shipped style's nulled tables as the shipped ones", () => {
    const wrong = shipped.filter((theme) => {
      const stored = nulled(theme);
      const report = switchFailures(stored);
      return (
        seriesColors(stored).length !== 5 ||
        syntaxRoles.some((role) => syntaxColors(stored)[role] === undefined) ||
        report.paint.length > 0 ||
        report.placements.length > 0
      );
    });

    expect(wrong.map(({ name }) => name)).toEqual([]);
  });

  it("is taught on both token pages, the README and the inventory", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");

    expect(catalogue).toContain(
      "A table a store wrote as `null` is the absence it is",
    );
    expect(catalogue).toContain(
      "A palette a store wrote as `null` is the absence it is",
    );
    expect(catalogue).toContain(
      'A switch a store wrote as `null` is that same "declares none"',
    );

    expect(catalogue).toContain("**The paint follows the same rule.**");
    expect(catalogue).toContain("`declaredPaint`");
    expect(catalogue).not.toContain("the paint path does not yet");
    expect(designSystem).toContain("decode that same table before they paint");
    expect(readme).toContain("The paint keeps that rule at its own seam");
    expect(designSystem).toContain("A switch a store wrote as `null`");
    expect(readme).toContain("A switch a store wrote as `null`");
    expect(inventory).toContain("A table a store nulled is absence");
  });
});

describe("a role a store wrote as null", () => {
  const without = <Record_ extends object>(
    record: Record_,
    key: keyof Record_,
  ): Partial<Record_> => {
    const partial: Partial<Record_> = { ...record };
    delete partial[key];
    return partial;
  };

  const nulled = (role: keyof ThemeColors): Theme =>
    ({
      ...lightTheme,
      colors: { ...lightTheme.colors, [role]: null },
    }) as unknown as Theme;

  it("is the absence it is in the seam every role is read through", () => {
    expect(themeColors(nulled("primary"))).toEqual(
      without(lightTheme.colors, "primary"),
    );

    expect(themeColors(lightTheme)).toBe(lightTheme.colors);

    expect(invalidColorRoles(nulled("primary"))).toEqual([
      { role: "primary", value: undefined },
    ]);
  });

  it("is dropped by every paint seam that reads a role", () => {
    expect(brandText(nulled("primary"))).toBeUndefined();
    expect(brandTextOn(nulled("primary"), "infoSoft")).toBeUndefined();
    expect(nativeTextTheme(nulled("primary")).caret).toBeUndefined();
    expect(nativeTextTheme(nulled("primary")).accent).toBeUndefined();

    expect(
      statusTone(nulled("successSoftForeground"), "success"),
    ).toBeUndefined();
    expect(
      nativeTextTheme(nulled("successSoftForeground")).diffAdd,
    ).toBeUndefined();

    expect(
      keyboardFocusRing(nulled("ring")).focusVisible.outlineColor,
    ).toBeUndefined();

    const invalid = controlFocusRing(nulled("destructive"), { invalid: true });
    expect(invalid?.focusVisible.outlineColor).toBe(lightTheme.colors.ring);
  });

  it("never reaches a paint seam as a value, with no role left", () => {
    const wrong = shipped.flatMap((theme) => {
      const empty = {
        ...theme,
        colors: Object.fromEntries(colorRoles.map((role) => [role, null])),
      } as unknown as Theme;
      const host = nativeTextTheme(empty, "background");
      const ring = controlFocusRing(empty)?.focusVisible.outlineColor;
      const tones = statusTone(empty, "info");
      const clean =
        Object.values(host).every((value) => value !== null) &&
        ring !== null &&
        (tones === undefined ||
          Object.values(tones).every((value) => typeof value === "string"));
      return clean ? [] : [theme.name];
    });

    expect(wrong).toEqual([]);
  });

  it("still paints a complete theme's every role", () => {
    expect(nativeTextTheme(lightTheme).caret).toBe(lightTheme.colors.primary);
    expect(controlFocusRing(lightTheme)?.focusVisible.outlineColor).toBe(
      lightTheme.colors.ring,
    );
    expect(statusTone(lightTheme, "success")).toEqual(
      expect.objectContaining({
        foreground: lightTheme.colors.successSoftForeground,
      }),
    );
    expect(auditTheme(lightTheme).passed).toBe(true);
  });

  it("is taught on both token pages, the README and the inventory", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");

    expect(catalogue).toContain("keeps only the strings");
    expect(catalogue).toContain("the runtime paints its own outline");
    expect(designSystem).toContain("keeps only the strings");
    expect(readme).toContain("keeps only the strings");
    expect(inventory).toContain("keeps only the strings");
  });
});

describe("the shape a store hands back", () => {
  const saved: StoredTheme = {
    ...highContrastDarkTheme,
    mode: "Dark",
    contrast: "HIGH",
  };

  it("runs the gate and its reports without a cast", () => {
    expect(missingTokens(saved)).toEqual([]);
    expect(auditTheme(saved).passed).toBe(true);
    expect(invalidNumbers(saved)).toEqual([]);
    expect(invalidScales(saved)).toEqual([]);
    expect(contrastFailures(saved)).toEqual([]);
  });

  it("reads the labels the store wrote, not the ones a cast would promise", () => {
    expect(contrastFloorsFor(saved)).toEqual(highContrastFloors);
    expect(seriesColors(saved)).toEqual(highContrastDarkSeries);
    expect(syntaxColors(saved)).toEqual(highContrastDarkSyntax);
  });

  it("reads an optional table a store nulled as the shipped one", () => {
    const bare: StoredTheme = {
      ...highContrastDarkTheme,
      series: null,
      syntax: null,
      switch: null,
    };
    expect(seriesColors(bare)).toEqual(highContrastDarkSeries);
    expect(syntaxColors(bare)).toEqual(highContrastDarkSyntax);
    expect(switchFailures(bare).paint).toEqual([]);
  });

  it("refuses a numeric group the store lost, naming it", () => {
    const lost: StoredTheme = { ...highContrastDarkTheme, spacing: null };
    expect(missingTokens(lost)).toContainEqual({
      group: "spacing",
      path: "",
      kind: "group",
    });
    expect(() => auditTheme(lost)).toThrow("`spacing`");
  });

  it("reports a nulled colour group's every role, rather than throwing", () => {
    const noColours: StoredTheme = { ...highContrastDarkTheme, colors: null };
    expect(invalidColorRoles(noColours)).toHaveLength(colorRoles.length);
    expect(auditTheme(noColours).passed).toBe(false);
  });

  it("is taught where the gate and the extension mechanism are", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const surfaces = {
      catalogue: read("../../../docs/tokens.md"),
      designSystem: read("../../../docs/design-system.md"),
      readme: read("../README.md"),
      inventory: read("../../../.agents/slop/COMPONENTS.md"),
    };

    for (const [surface, text] of Object.entries(surfaces)) {
      expect(text, surface).toContain("ThemeAuditSource");
      expect(text, surface).toContain("StoredTheme");
    }
  });

  it("answers a store that kept no theme with its own refusal, not a TypeError", () => {
    [null, undefined].forEach((absent) => {
      expect(() => auditTheme(absent)).toThrow(
        "`spacing`, `radius`, `borderWidth`, `iconSize`, `typography`, `density` are missing",
      );
      expect(() => auditTheme(absent)).not.toThrow(TypeError);

      expect(missingTokens(absent).every(({ kind }) => kind === "group")).toBe(
        true,
      );
    });

    expect(auditTheme(restoreTheme(null)).passed).toBe(true);
  });

  it("teaches the no-theme absence where the gate is described", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const surfaces = {
      catalogue: read("../../../docs/tokens.md"),
      designSystem: read("../../../docs/design-system.md"),
      readme: read("../README.md"),
    };

    Object.entries(surfaces).forEach(([surface, text]) => {
      expect(text, surface).toContain("the empty source");
    });
  });
});
