import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFailures,
  contrastFloors,
  contrastFloorsFor,
  contrastPairs,
  contrastRatio,
  highContrastFloors,
} from "./contrast.js";
import {
  highContrastDarkColors,
  lightColors,
  palette,
  type ThemeColors,
} from "./color.js";
import { indicatorRoles, indicatorSurfaces } from "./indicator.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import { statusTones } from "./styles.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  highContrastThemes,
  lightTheme,
  platformTheme,
  themes,
  type Theme,
} from "./theme.js";

const printedRatio = (ratio: number | undefined): string =>
  ratio === undefined ? "unmeasurable" : `${ratio.toFixed(2)}:1`;

const declaresKeyboardRing = (source: string): boolean =>
  /(?:\.\.\.)?(?:keyboardRing|controlRing|controlFocusRing)\(theme/.test(
    source,
  );

const recipe = (source: string, name: string): string => {
  const match = new RegExp(`export const ${name} =\\s*"([^"]*)"`).exec(source);
  if (match?.[1] === undefined) {
    throw new Error(`recipe ${name} not found`);
  }
  return match[1];
};

describe("contrastRatio", () => {
  it("reports the extremes of the scale", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  it("reports 1 for identical colours", () => {
    expect(contrastRatio("#5F4BDB", "#5F4BDB")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    const forwards = contrastRatio("#2559D6", "#F6F8FA");
    const backwards = contrastRatio("#F6F8FA", "#2559D6");
    expect(forwards).toBeCloseTo(backwards ?? 0, 10);
  });

  it("refuses to measure a translucent colour", () => {
    expect(contrastRatio("#00000080", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("#FFFFFF", "#00000080")).toBeUndefined();
  });

  it("refuses to measure a value the dialect does not resolve", () => {
    expect(contrastRatio("transparent", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("#FFFFFF", "#00000080")).toBeUndefined();
    expect(contrastRatio("oklch(0.62 0.26 29.2)", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("rgb(from #bad455 b r g)", "#FFFFFF")).toBeUndefined();
  });
});

describe("contrast floors", () => {
  it("holds text to AAA and boundaries to AA in a default theme", () => {
    expect(contrastFloors).toEqual({
      body: 7,
      secondary: 4.5,
      boundary: 3,
      disabled: 1.5,
    });
  });

  it("raises every floor in a high-contrast theme", () => {
    expect(highContrastFloors).toEqual({
      body: 7,
      secondary: 7,
      boundary: 4.5,
      disabled: 3,
    });
    expect(highContrastFloors.secondary).toBeGreaterThan(
      contrastFloors.secondary,
    );
    expect(highContrastFloors.boundary).toBeGreaterThan(
      contrastFloors.boundary,
    );
    expect(highContrastFloors.disabled).toBeGreaterThan(
      contrastFloors.disabled,
    );
  });

  it("measures every pair at a floor it declares", () => {
    contrastPairs.forEach(({ floor }) => {
      expect(Object.keys(contrastFloors)).toContain(floor);
    });
  });

  it("names a distinct pair for every text-on-surface relation", () => {
    const keys = contrastPairs.map(
      ({ foreground, background }) => `${foreground}/${background}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("the floors a contrast report uses", () => {
  const brand = extendTheme(highContrastLightTheme, {
    colors: { mutedForeground: "#464646" },
  });

  it("takes the high floors from the theme without being told", () => {
    const failures = contrastFailures(brand);

    expect(
      failures.map(({ foreground, background, floor }) => ({
        foreground,
        background,
        floor,
      })),
    ).toEqual([
      { foreground: "mutedForeground", background: "successSoft", floor: 7 },
      {
        foreground: "mutedForeground",
        background: "destructiveSoft",
        floor: 7,
      },
      { foreground: "mutedForeground", background: "active", floor: 7 },
      { foreground: "mutedForeground", background: "selected", floor: 7 },
    ]);
    expect(
      failures.every(({ ratio }) => ratio !== undefined && ratio >= 4.5),
    ).toBe(true);
  });

  it("a theme that declares nothing keeps the default floors", () => {
    const standard = extendTheme(lightTheme, {
      colors: { mutedForeground: "#5A5A5A" },
    });

    expect(contrastFailures(standard)).toEqual([]);
  });

  it("an explicit floor set still overrides the declaration", () => {
    expect(contrastFailures(brand, contrastFloors)).toEqual([]);
    expect(contrastFailures(brand, highContrastFloors).length).toBe(4);
  });
});

describe("a contrast variant this release does not ship", () => {
  const stated = (contrast: unknown): Theme =>
    ({
      ...extendTheme(lightTheme, { colors: { mutedForeground: "#5A5A5A" } }),
      contrast,
    }) as Theme;

  it("is held to the strict floors rather than the default ones", () => {
    const ratio =
      contrastRatio("#5A5A5A", lightTheme.colors.background) ?? undefined;

    expect(ratio).toBeGreaterThanOrEqual(contrastFloors.secondary);
    expect(ratio).toBeLessThan(highContrastFloors.secondary);

    const reported = contrastFailures(stated("HIGH"));

    expect(reported).toContainEqual({
      foreground: "mutedForeground",
      background: "background",
      ratio,
      floor: highContrastFloors.secondary,
    });

    expect(
      contrastFailures(
        extendTheme(lightTheme, { colors: { mutedForeground: "#5A5A5A" } }),
      ),
    ).toEqual([]);
  });

  it("reads every stated variant it does not ship as the strict one", () => {
    ["HIGH", "maximum", "", "Default", 1, {}].forEach((value) =>
      expect(contrastFloorsFor(stated(value)), String(value)).toEqual(
        highContrastFloors,
      ),
    );
  });

  it("keeps the default floors for an absent or nulled variant", () => {
    [undefined, null].forEach((value) =>
      expect(contrastFloorsFor(stated(value)), String(value)).toEqual(
        contrastFloors,
      ),
    );
    expect(contrastFloorsFor(lightTheme)).toEqual(contrastFloors);
    expect(contrastFloorsFor(highContrastLightTheme)).toEqual(
      highContrastFloors,
    );
  });

  it("is taught where the floors and the absence rule are", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8")
        .replace(/\s+/g, " ")
        .replace(/\*\*/g, "");
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");

    [catalogue, design, readme].forEach((page) => {
      expect(page).toContain("does not ship");
      expect(page).toContain("strict");
    });
  });
});

describe("status text on a surface", () => {
  const statusTextStrips = ["background", "card", "popover", "muted"] as const;

  it("measures every tone's readable text on the four strips a message sits on", () => {
    const missing = statusTones.flatMap((tone) =>
      statusTextStrips
        .filter(
          (background) =>
            !contrastPairs.some(
              (pair) =>
                pair.foreground === `${tone}SoftForeground` &&
                pair.background === background,
            ),
        )
        .map((background) => `${tone}SoftForeground/${background}`),
    );

    expect(missing).toEqual([]);
  });

  it("holds the painters that put status text on the strip", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8");
    const painter = (source: string): string => source.replace(/\s+/g, " ");

    ["field.tsx", "form.tsx", "menu/item.tsx"].forEach((file) => {
      expect(
        painter(read(`../../components/src/${file}`)),
        `${file} paints a status slot`,
      ).toContain('statusTone(theme, "destructive").foreground');
    });
    const recipes = read("../../tw/src/recipes.ts");
    ["FIELD_ERROR", "FIELD_REQUIRED", "FORM_ERROR"].forEach((name) => {
      const bare = recipe(recipes, name);
      expect(bare, `${name} is bare text`).toContain("text-destructive");
      expect(bare, `${name} has no fill`).not.toContain("bg-");
    });

    const page = painter(read("../../../docs/tokens.md"));
    const start = page.indexOf("### A brand run inside a message");
    const end = page.indexOf("## Data series", start);
    const section = page.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(section).toContain("`FieldError`");
    expect(section).toContain("`Form`");
    expect(section).toContain("`@gpuixui/tw`");
    expect(section).not.toContain("a component that still does is");
  });

  it("reports status text painted invisible on a popover", () => {
    const broken = {
      colors: {
        ...lightColors,
        destructiveSoftForeground: lightColors.popover,
      },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "destructiveSoftForeground" &&
          background === "popover",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("reports an inline warning swallowed by the muted strip it sits in", () => {
    const broken = {
      colors: { ...lightColors, muted: lightColors.warningSoftForeground },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "warningSoftForeground" && background === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor on every strip, tightest on Luna's toolbar", () => {
    const styles = [
      themes.light,
      themes.dark,
      highContrastThemes.light,
      highContrastThemes.dark,
      ...platformNames.flatMap((platform) => [
        platformTheme(themes.light, platform),
        platformTheme(themes.dark, platform),
      ]),
      ...retroNames.flatMap((look) => [
        retroTheme(themes.light, look),
        retroTheme(themes.dark, look),
      ]),
    ];
    const placements = styles.flatMap((theme) =>
      statusTones.map((tone) => ({
        theme: theme.name,
        tone,
        ratio: contrastRatio(
          theme.colors[`${tone}SoftForeground`],
          theme.colors.muted,
        ),
      })),
    );
    expect(styles).toHaveLength(18);
    expect(
      placements
        .filter(
          ({ ratio }) =>
            ratio === undefined || ratio < contrastFloorsFor(themes.light).body,
        )
        .map(({ theme, tone }) => `${theme} ${tone}`),
    ).toEqual([]);

    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );
    expect(
      `${tightest.theme} ${tightest.tone} ${printedRatio(tightest.ratio)}`,
    ).toBe("Light · Omarchy success 8.57:1");
  });
});

describe("the ink an alert paints on its own tint", () => {
  const softTints = statusTones.map((tone) => `${tone}Soft` as const);

  it("measures the page role on every soft status tint", () => {
    const missing = softTints.filter(
      (background) =>
        !contrastPairs.some(
          (pair) =>
            pair.foreground === "foreground" &&
            pair.background === background &&
            pair.floor === "body",
        ),
    );

    expect(missing).toEqual([]);
  });

  it("holds the painters that put the alert's copy on the tint", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const alert = readFileSync(
      new URL("../../components/src/alert.tsx", import.meta.url),
      "utf8",
    );

    expect(recipe(recipes, "ALERT_DESCRIPTION")).toContain("text-foreground");
    expect(alert).toContain("color={theme.colors.foreground}");
    statusTones.forEach((tone) => {
      expect(recipes).toContain(`bg-${tone}Soft`);
    });
  });

  it("reports alert copy a tint swallows", () => {
    const broken = {
      colors: { ...lightColors, infoSoft: lightColors.foreground },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "infoSoft",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor on every style, tightest on Luna's warning tint", () => {
    const styles = [
      themes.light,
      themes.dark,
      highContrastThemes.light,
      highContrastThemes.dark,
      ...platformNames.flatMap((platform) => [
        platformTheme(themes.light, platform),
        platformTheme(themes.dark, platform),
      ]),
      ...retroNames.flatMap((look) => [
        retroTheme(themes.light, look),
        retroTheme(themes.dark, look),
      ]),
    ];
    const placements = styles.flatMap((theme) =>
      softTints.map((tint) => ({
        theme: theme.name,
        tint,
        ratio: contrastRatio(theme.colors.foreground, theme.colors[tint]),
      })),
    );

    expect(styles).toHaveLength(18);
    expect(placements).toHaveLength(72);
    expect(
      placements
        .filter(
          ({ ratio }) =>
            ratio === undefined || ratio < contrastFloorsFor(themes.light).body,
        )
        .map(({ theme, tint }) => `${theme} ${tint}`),
    ).toEqual([]);

    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );
    expect(
      `${tightest.theme} ${tightest.tint} ${printedRatio(tightest.ratio)}`,
    ).toBe("Dark · Windows XP (Luna) warningSoft 7.14:1");
  });

  it("prints that placement on both token pages", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    const system = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    );

    [catalogue, system].forEach((page) => {
      expect(page).toContain("`warningSoft`");
      expect(page).toContain("7.14:1");
    });
    expect(system).toContain(
      "Windows XP (Luna) dark's `warningSoft` at 7.14:1",
    );
  });
});

describe("the quiet ink a changed line paints on its tint", () => {
  const tints = ["successSoft", "destructiveSoft"] as const;

  it("measures `mutedForeground` on both tints at the secondary floor", () => {
    const missing = tints.filter(
      (background) =>
        !contrastPairs.some(
          (pair) =>
            pair.foreground === "mutedForeground" &&
            pair.background === background &&
            pair.floor === "secondary",
        ),
    );

    expect(missing).toEqual([]);
  });

  it("reads the painter that puts the numbers on the row's tint", () => {
    const viewer = readFileSync(
      new URL("../../editor/src/diff/diff-viewer.tsx", import.meta.url),
      "utf8",
    );

    expect(viewer).toContain("bg-background");
    expect(viewer).toContain("color: theme.colors.mutedForeground");

    expect(viewer).toContain(
      'Match.when("added", () => statusTone(theme, "success").background)',
    );
    expect(viewer).toContain(
      'Match.when("removed", () => statusTone(theme, "destructive").background)',
    );
    expect(viewer).toContain(
      'Match.when("added", () => statusTone(theme, "success").foreground)',
    );
    expect(viewer).toContain(
      'Match.when("removed", () => statusTone(theme, "destructive").foreground)',
    );
    expect(viewer).toContain("Match.exhaustive");
    expect(viewer).toContain(".background");

    expect(viewer).toContain("const view = modeOf(mode);");
    const start = viewer.indexOf('{view === "unified" ? (');
    expect(start).toBeGreaterThan(-1);
    const unified = viewer.slice(start, viewer.indexOf(") : (", start));
    expect(unified).toContain("<UnifiedRows");
    expect(unified).not.toContain("<SplitRows");

    const unifiedRows = viewer.slice(viewer.indexOf("const UnifiedRows = ("));
    const unifiedBody = unifiedRows.slice(
      0,
      unifiedRows.indexOf("const SplitBlock"),
    );
    expect(unifiedBody).toContain("style={lineRow(theme, metrics, row.kind)}");
    expect(unifiedBody).toContain("{rowSign(row.kind)}");

    expect(viewer).toContain("const SplitBlock = (");
    expect(viewer).toContain("const SplitColumn = (");
    expect(viewer).toContain(`testId={\`\${testId}-divider\`}`);
  });

  it("reports line numbers a tint swallows", () => {
    const broken = {
      colors: { ...lightColors, successSoft: lightColors.mutedForeground },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "successSoft",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.secondary });
  });

  it("clears the secondary floor in every style, tightest on the light red tint", () => {
    const styles = [
      themes.light,
      themes.dark,
      highContrastThemes.light,
      highContrastThemes.dark,
      ...platformNames.flatMap((platform) => [
        platformTheme(themes.light, platform),
        platformTheme(themes.dark, platform),
      ]),
      ...retroNames.flatMap((look) => [
        retroTheme(themes.light, look),
        retroTheme(themes.dark, look),
      ]),
    ];
    const placements = styles.flatMap((theme) =>
      tints.map((tint) => ({
        theme: theme.name,
        tint,
        ratio: contrastRatio(theme.colors.mutedForeground, theme.colors[tint]),
      })),
    );

    expect(styles).toHaveLength(18);
    expect(placements).toHaveLength(36);
    expect(
      placements
        .filter(
          ({ ratio }) =>
            ratio === undefined ||
            ratio < contrastFloorsFor(themes.light).secondary,
        )
        .map(({ theme, tint }) => `${theme} ${tint}`),
    ).toEqual([]);

    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );
    expect(
      `${tightest.theme} ${tightest.tint} ${printedRatio(tightest.ratio)}`,
    ).toBe("Light destructiveSoft 5.21:1");
  });

  it("prints the placement and the pair on both token pages", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    const system = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    );

    [catalogue, system].forEach((page) => {
      expect(page).toContain("`mutedForeground`");
      expect(page).toContain("`successSoft`");
      expect(page).toContain("`destructiveSoft`");
    });

    expect(catalogue).toContain("the light styles' red tint at 5.21:1");
  });
});

describe("text on the state washes", () => {
  it("measures both resting text roles on every wash", () => {
    const missing = ["hover", "active", "accent"].flatMap((background) =>
      [
        { foreground: "foreground", floor: "body" },
        { foreground: "mutedForeground", floor: "secondary" },
      ]
        .filter(
          ({ foreground, floor }) =>
            !contrastPairs.some(
              (pair) =>
                pair.foreground === foreground &&
                pair.background === background &&
                pair.floor === floor,
            ),
        )
        .map(({ foreground }) => `${foreground}/${background}`),
    );

    expect(missing).toEqual([]);
  });

  it("reports a wash that matches the text it has to carry beneath", () => {
    const broken = {
      colors: { ...lightColors, active: lightColors.mutedForeground },
    };
    const failures = contrastFailures(broken);

    expect(
      failures.find(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "active",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.secondary });
  });
});

describe("the secondary action's label on the fill it paints", () => {
  const button = readFileSync(
    new URL("../../components/src/internal/button.tsx", import.meta.url),
    "utf8",
  );
  const variants = readFileSync(
    new URL("../../primitives/src/core/variants.ts", import.meta.url),
    "utf8",
  );
  const secondary = variants.slice(
    variants.indexOf("const secondary: ControlVariant"),
    variants.indexOf("const washed:"),
  );

  it("measures the label on the resting fill", () => {
    expect(
      contrastPairs.some(
        (pair) =>
          pair.foreground === "secondaryForeground" &&
          pair.background === "secondary" &&
          pair.floor === "secondary",
      ),
    ).toBe(true);
  });

  it("holds the painter to the derived fills rather than a wash", () => {
    expect(secondary).toContain('colorRole(theme, "secondaryForeground")');
    expect(
      [
        "primitiveActionOnColor",
        'Match.when("secondary", () => theme.colors.secondaryForeground)',
      ].some((form) => button.includes(form)),
      "the components' action resolves its label from the variant's own fill",
    ).toBe(true);
    expect(button).toContain("@gpuixui/primitives/button");
    expect(secondary).toContain('...filled("secondary")');
    expect(variants).toContain("filledHover(theme, action)");
    expect(variants).toContain("filledPressed(theme, action)");
    expect(secondary, "the wash the fix replaced").not.toContain(
      "theme.colors.hover",
    );
  });

  it("no longer measures a label on a wash the action stopped painting", () => {
    const retired = (["hover", "active"] as const).filter((background) =>
      contrastPairs.some(
        (pair) =>
          pair.foreground === "secondaryForeground" &&
          pair.background === background,
      ),
    );

    expect(retired).toEqual([]);
  });
});

describe("a control's label on its group strip", () => {
  const primitives = readFileSync(
    new URL("../../primitives/src/core/variants.ts", import.meta.url),
    "utf8",
  );

  const pairs = [
    { foreground: "foreground", floor: "body" },
    { foreground: "mutedForeground", floor: "secondary" },
  ] as const;

  it("measures both text roles on the segmented panel", () => {
    const missing = pairs
      .filter(
        ({ foreground, floor }) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === foreground &&
              pair.background === "secondary" &&
              pair.floor === floor,
          ),
      )
      .map(({ foreground }) => `${foreground}/secondary`);

    expect(missing).toEqual([]);
  });

  it("holds the unfilled variants that keep the page ink", () => {
    for (const variant of ["outline", "ghost"] as const) {
      const declaration = new RegExp(
        `const ${variant}: ControlVariant = \\{[\\s\\S]*?\\n\\};`,
      ).exec(primitives)?.[0];
      expect(declaration, variant).toContain("background: undefined");
      expect(declaration, variant).toContain(
        'foreground: (theme) => colorRole(theme, "foreground")',
      );
    }
  });

  it("reports a label painted into the panel it sits in", () => {
    const broken = (role: "foreground" | "mutedForeground") => ({
      colors: { ...lightColors, secondary: lightColors[role] },
    });

    expect(
      contrastFailures(broken("foreground")).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "secondary",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
    expect(
      contrastFailures(broken("mutedForeground")).find(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "secondary",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.secondary });
  });

  it("clears the floor in every shipped, platform and authored theme", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = shipped.flatMap((theme) =>
      pairs.map(({ foreground, floor }) => ({
        name: `${theme.name}/${foreground}`,
        ratio: contrastRatio(theme.colors[foreground], theme.colors.secondary),
        floor: contrastFloorsFor(theme)[floor],
      })),
    );
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = (foreground: (typeof pairs)[number]["foreground"]) =>
      placements
        .filter(({ name }) => name.endsWith(`/${foreground}`))
        .reduce((low, next) =>
          (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
        );

    expect(hidden).toEqual([]);
    expect(tightest("foreground").name).toBe(
      "Dark · Windows XP (Luna)/foreground",
    );
    expect(printedRatio(tightest("foreground").ratio)).toBe("7.62:1");
    expect(tightest("mutedForeground").name).toBe(
      "Light · Windows XP (Luna)/mutedForeground",
    );
    expect(printedRatio(tightest("mutedForeground").ratio)).toBe("4.89:1");

    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(
      `quiet label on its group panel at ${tightest("mutedForeground").ratio?.toFixed(2)}:1`,
    );
  });
});

describe("the label an accent row paints", () => {
  const navigation = readFileSync(
    new URL("../../components/src/navigation-menu.tsx", import.meta.url),
    "utf8",
  );
  const mention = readFileSync(
    new URL("../../components/src/mention-input.tsx", import.meta.url),
    "utf8",
  );

  const pair = contrastPairs.find(
    ({ foreground, background }) =>
      foreground === "accentForeground" && background === "accent",
  );

  it("measures the role as body text, not a filled control's label", () => {
    expect(pair).toMatchObject({
      foreground: "accentForeground",
      background: "accent",
      floor: "body",
    });
  });

  it("reads the two rows that paint it", () => {
    expect(navigation).toContain("backgroundColor: theme.colors.accent,");
    expect(navigation).toContain("color: theme.colors.accentForeground,");
    expect(mention).toContain(
      "backgroundColor: highlighted ? theme.colors.accent : undefined,",
    );
    expect(mention).toContain("? theme.colors.accentForeground");
  });

  it("reports a label the secondary floor would have passed", () => {
    const brand = {
      colors: {
        ...lightColors,
        accent: "#F0F0F0",
        accentForeground: "#6B6B6B",
      },
    };
    const ratio = contrastRatio(
      brand.colors.accentForeground,
      brand.colors.accent,
    );

    expect(ratio).toBeCloseTo(4.68, 2);
    expect(ratio ?? 0).toBeGreaterThanOrEqual(contrastFloors.secondary);
    expect(ratio ?? 0).toBeLessThan(contrastFloors.body);
    expect(
      contrastFailures(brand).find(
        ({ foreground, background }) =>
          foreground === "accentForeground" && background === "accent",
      ),
    ).toMatchObject({ ratio, floor: contrastFloors.body });
  });

  it("clears the body floor in every shipped, platform and authored style", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = shipped.map((theme) => ({
      name: theme.name,
      ratio: contrastRatio(theme.colors.accentForeground, theme.colors.accent),
      floor: contrastFloorsFor(theme).body,
    }));
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    expect(tightest.name).toBe("Dark · macOS");
    expect(printedRatio(tightest.ratio)).toBe("7.22:1");

    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const design = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    );
    const row = design
      .split("\n")
      .find((line) =>
        line.startsWith("| a row's label on the accent it tints"),
      );
    expect(catalogue).toContain(
      `the tightest being ${tightest.name} at ${printedRatio(tightest.ratio)}`,
    );
    expect(row, "docs/design-system.md has no accent-row row").toBeDefined();
    expect(row).toContain("`accentForeground` on `accent`");
    expect(row).toContain("| 7:1 | 7:1 |");
  });
});

describe("the body role on a box's own surface", () => {
  const style = readFileSync(
    new URL("../../primitives/src/core/style.ts", import.meta.url),
    "utf8",
  );
  const declared = [
    ...(
      /\bSURFACE_TONES = \[([\s\S]*?)\] as const/.exec(style)?.[1] ?? ""
    ).matchAll(/"([a-z]+)"/g),
  ].flatMap(([, tone]) => (tone === undefined ? [] : [tone]));

  const contentTones = [
    "background",
    "card",
    "popover",
    "muted",
    "accent",
    "selected",
  ] as const satisfies ReadonlyArray<keyof ThemeColors>;

  it("reads the tones the container itself resolves from", () => {
    expect(declared).toEqual(["none", ...contentTones, "skeleton"]);
  });

  it("measures the body role on every content tone", () => {
    const missing = contentTones.filter(
      (background) =>
        !contrastPairs.some(
          (pair) =>
            pair.foreground === "foreground" &&
            pair.background === background &&
            pair.floor === "body",
        ),
    );

    expect(missing).toEqual([]);
  });

  it("holds the surface a shipped bubble actually paints", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const bubbles = recipes.slice(
      recipes.indexOf("export const BUBBLE_VARIANTS"),
      recipes.indexOf("export const BUBBLE_ACTIONS"),
    );

    expect(bubbles).toContain('muted: "bg-muted text-foreground"');
    expect(style).toContain(
      'default: (theme) => colorRole(theme, "foreground")',
    );
  });

  it("reports copy a surface swallows", () => {
    const flatMuted = {
      colors: { ...lightColors, muted: lightColors.foreground },
    };
    const flatPopover = {
      colors: { ...lightColors, popover: lightColors.foreground },
    };

    expect(
      contrastFailures(flatMuted).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
    expect(
      contrastFailures(flatPopover).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "popover",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor on every shipped style", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const hidden = shipped.flatMap((theme) =>
      contentTones
        .map((background) => ({
          name: `${theme.name}/${background}`,
          ratio: contrastRatio(
            theme.colors.foreground,
            theme.colors[background],
          ),
          floor: contrastFloorsFor(theme).body,
        }))
        .filter(({ ratio, floor }) => ratio === undefined || ratio < floor),
    );

    expect(hidden).toEqual([]);
  });

  it("prints the surfaces the design system says body text is measured on", () => {
    const row = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    )
      .split("\n")
      .find((line) => line.startsWith("| body text on"));

    expect(row, "docs/design-system.md has no body-text row").toBeDefined();
    contentTones.forEach((tone) => {
      expect(row).toContain(tone === "background" ? "background" : tone);
    });
  });
});

describe("the resting role of a floating row on the wash it tints", () => {
  const roles = ["popoverForeground", "destructiveSoftForeground"] as const;

  it("measures both floating-row roles on both washes", () => {
    const missing = ["hover", "active"].flatMap((background) =>
      roles
        .filter(
          (foreground) =>
            !contrastPairs.some(
              (pair) =>
                pair.foreground === foreground &&
                pair.background === background &&
                pair.floor === "body",
            ),
        )
        .map((foreground) => `${foreground}/${background}`),
    );

    expect(missing).toEqual([]);
  });

  it("holds the roles the menu painters actually use", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const menuRow = readFileSync(
      new URL("../../components/src/menu/item.tsx", import.meta.url),
      "utf8",
    );
    const menuItem = recipes.slice(
      recipes.indexOf("export const MENU_ITEM ="),
      recipes.indexOf("export const MENU_LABEL ="),
    );
    const row = menuRow.slice(menuRow.indexOf("export const menuRowStyle"));

    expect(menuItem).toContain("text-popover-foreground");
    expect(row).toContain("{ backgroundColor: theme.colors.hover }");

    expect(row).toContain('{ backgroundColor: pressWash(theme, "hover") }');
    expect(row).toContain('statusTone(theme, "destructive").foreground');
  });

  it("reports the pressed wash the two light looks shipped before this pair", () => {
    const before = (theme: { readonly colors: ThemeColors }) => ({
      colors: {
        ...theme.colors,
        destructiveSoftForeground: palette.red[800],
      },
    });
    const pressed = (theme: { readonly colors: ThemeColors }) =>
      contrastFailures(before(theme)).find(
        ({ foreground, background }) =>
          foreground === "destructiveSoftForeground" && background === "active",
      );

    const windows = pressed(platformTheme(lightTheme, "win32"));
    const luna = pressed(retroTheme(lightTheme, "luna"));

    expect(windows?.floor).toBe(contrastFloors.body);
    expect(windows?.ratio).toBeCloseTo(6.93, 2);
    expect(luna?.floor).toBe(contrastFloors.body);
    expect(luna?.ratio).toBeCloseTo(6.77, 2);

    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    expect(page).toContain(`at ${printedRatio(windows?.ratio)}`);
    expect(page).toContain(`at ${printedRatio(luna?.ratio)}`);
  });

  it("reports a popover's own text painted into its hover wash", () => {
    const broken = {
      colors: { ...lightColors, popoverForeground: lightColors.hover },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "popoverForeground" && background === "hover",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor in every shipped theme, with the dark looks tightest", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const measured = shipped.flatMap((theme) =>
      (["hover", "active"] as const).flatMap((background) =>
        roles.map((foreground) => ({
          name: `${theme.name}/${foreground}/${background}`,
          ratio:
            contrastRatio(theme.colors[foreground], theme.colors[background]) ??
            0,
        })),
      ),
    );
    const tightest = measured.reduce((low, next) =>
      next.ratio < low.ratio ? next : low,
    );

    expect(measured.filter(({ ratio }) => ratio < contrastFloors.body)).toEqual(
      [],
    );

    expect(tightest.name).toBe(
      "Light · Omarchy/destructiveSoftForeground/active",
    );
    expect(tightest.ratio.toFixed(2)).toBe("7.77");
  });
});

describe("the status label on the wash a list row wears", () => {
  const washes = ["selected", "accent"] as const;

  it("measures the destructive label on both list-row washes", () => {
    const missing = washes
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "destructiveSoftForeground" &&
              pair.background === background &&
              pair.floor === "body",
          ),
      )
      .map((background) => `destructiveSoftForeground/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the roles the list painters actually use", () => {
    const list = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const style = readFileSync(
      new URL("../../primitives/src/core/style.ts", import.meta.url),
      "utf8",
    );

    expect(list).toContain("hover: { backgroundColor: theme.colors.accent }");

    expect(list).toContain(
      'active: { backgroundColor: pressWash(theme, "accent") }',
    );
    expect(list).toContain("backgroundColor: theme.colors.selected");
    expect(style).toContain(
      'destructive: (theme) => colorRole(theme, "destructiveSoftForeground")',
    );
  });

  it("reports a status label painted in the wash it sits on", () => {
    const broken = {
      colors: {
        ...lightColors,
        destructiveSoftForeground: lightColors.selected,
      },
    };
    const failures = contrastFailures(broken);

    expect(
      washes.map((background) =>
        failures.find(
          ({ foreground, background: over }) =>
            foreground === "destructiveSoftForeground" && over === background,
        ),
      ),
    ).toEqual(
      washes.map((background) => ({
        foreground: "destructiveSoftForeground",
        background,
        ratio: contrastRatio(lightColors.selected, lightColors[background]),
        floor: contrastFloors.body,
      })),
    );
  });

  it("clears the body floor in every shipped theme, with Omarchy's chosen row tightest", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const measured = shipped.flatMap((theme) =>
      washes.map((background) => ({
        name: `${theme.name}/destructiveSoftForeground/${background}`,
        ratio:
          contrastRatio(
            theme.colors.destructiveSoftForeground,
            theme.colors[background],
          ) ?? 0,
      })),
    );
    const tightest = measured.reduce((low, next) =>
      next.ratio < low.ratio ? next : low,
    );

    expect(measured.filter(({ ratio }) => ratio < contrastFloors.body)).toEqual(
      [],
    );

    expect(tightest.name).toBe(
      "Light · Omarchy/destructiveSoftForeground/selected",
    );
    expect(tightest.ratio.toFixed(2)).toBe("7.77");

    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(page).toContain(`at ${printedRatio(tightest.ratio)}`);
    expect(page).toContain("a destructive status label");

    const look = tightest.name.split("/")[0];

    expect(
      readFileSync(
        new URL("../../../.agents/slop/COMPONENTS.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(
      `tightest shipped placement ${tightest.ratio.toFixed(2)}:1, the ${look} look's chosen row`,
    );
  });
});

describe("the selected row's own role on the selection wash", () => {
  const pair = contrastPairs.find(
    ({ foreground, background, floor }) =>
      foreground === "popoverForeground" &&
      background === "selected" &&
      floor === "body",
  );

  it("measures the popover role on the selection wash", () => {
    expect(pair).toBeDefined();
  });

  it("holds the painter the pair exists for", () => {
    const source = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    const row = source.slice(
      source.indexOf("export const selectItemClass"),
      source.indexOf("// ── NumberField"),
    );

    expect(row).toContain("text-popover-foreground");
    expect(row).toContain('"bg-selected"');
  });

  it("reports a popover role painted into its own selection", () => {
    const broken = {
      colors: { ...lightColors, popoverForeground: lightColors.selected },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "popoverForeground" && background === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor in every shipped theme, with the dark looks tightest", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const measured = shipped.map((theme) => ({
      name: theme.name,
      floor: contrastFloorsFor(theme).body,
      ratio: contrastRatio(
        theme.colors.popoverForeground,
        theme.colors.selected,
      ),
    }));
    const hidden = measured.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = measured.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);

    expect(tightest.name).toBe("Dark · Windows XP (Luna)");
    expect(printedRatio(tightest.ratio)).toBe("9.25:1");
  });

  it("is the placement both pages teach", () => {
    const page = (path: string): string =>
      readFileSync(
        new URL(`../../../${path}`, import.meta.url),
        "utf8",
      ).replace(/\s+/g, " ");

    expect(page("docs/tokens.md")).toContain(
      "the popover's text role on the `selected` wash",
    );
    expect(page("docs/design-system.md")).toContain(
      "the popover's text role on the `selected` wash",
    );
  });
});

describe("disabled text", () => {
  const surfaces = [
    "disabled",
    "background",
    "card",
    "popover",
    "muted",
    "secondary",
  ] as const;

  it("measures the unavailable label on the fill and the page", () => {
    const missing = surfaces
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "disabledForeground" &&
              pair.background === background &&
              pair.floor === "disabled",
          ),
      )
      .map((background) => `disabledForeground/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the disabled floor below the readable text floor", () => {
    expect(contrastFloors.disabled).toBeLessThan(contrastFloors.secondary);
  });

  it("reports an unavailable label painted into its own fill", () => {
    const broken = {
      colors: { ...lightColors, disabledForeground: lightColors.disabled },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "disabledForeground" && background === "disabled",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.disabled });
  });

  it("reports an unavailable label that matches the page", () => {
    const broken = {
      colors: { ...lightColors, disabledForeground: lightColors.background },
    };
    const failures = contrastFailures(broken).map(
      ({ foreground, background }) => `${foreground}/${background}`,
    );

    expect(failures).toContain("disabledForeground/background");
    expect(failures).toContain("disabledForeground/card");
    expect(failures).toContain("disabledForeground/popover");
  });

  it("reports an unavailable label that matches the group strip it sits in", () => {
    const broken = {
      colors: { ...lightColors, disabledForeground: lightColors.muted },
    };
    const failures = contrastFailures(broken).map(
      ({ foreground, background }) => `${foreground}/${background}`,
    );

    expect(failures).toContain("disabledForeground/muted");
    expect(failures).toContain("disabledForeground/secondary");
  });

  it("has the least headroom on the panel the catalogue names", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const tightest = shipped
      .flatMap((theme) =>
        (["muted", "secondary"] as const).map((background) => ({
          name: `${theme.name}/${background}`,
          ratio:
            contrastRatio(
              theme.colors.disabledForeground,
              theme.colors[background],
            ) ?? 0,
        })),
      )
      .reduce((low, next) => (next.ratio < low.ratio ? next : low));

    expect(tightest.name).toBe("Dark · Linux/secondary");
    expect(tightest.ratio.toFixed(2)).toBe("1.56");
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(
      `label on its \`secondary\` panel at ${tightest.ratio.toFixed(2)}:1`,
    );
  });
});

describe("ring and selection surfaces", () => {
  it("measures the ring on every strip a control can sit on", () => {
    const missing = ["background", "card", "popover", "muted", "secondary"]
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "ring" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `ring/${background}`);

    expect(missing).toEqual([]);
  });

  it("measures secondary text on a selected surface", () => {
    expect(
      contrastPairs.some(
        (pair) =>
          pair.foreground === "mutedForeground" &&
          pair.background === "selected" &&
          pair.floor === "secondary",
      ),
    ).toBe(true);
  });

  it("reports a ring that disappears into a muted strip", () => {
    const broken = { colors: { ...lightColors, ring: lightColors.muted } };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "ring" && background === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("reports secondary text that matches its selected surface", () => {
    const broken = {
      colors: { ...lightColors, mutedForeground: lightColors.selected },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.secondary });
  });
});

describe("the text a selected row keeps", () => {
  const washes = ["hover", "active", "accent"] as const;
  const titleSurfaces = ["selected", ...washes] as const;

  it("holds the title's role to the body floor on its fill and every wash", () => {
    const missing = [
      ...(contrastPairs.some(
        (pair) =>
          pair.foreground === "foreground" &&
          pair.background === "selected" &&
          pair.floor === "body",
      )
        ? []
        : ["foreground/selected"]),
      ...titleSurfaces
        .filter(
          (background) =>
            !contrastPairs.some(
              (pair) =>
                pair.foreground === "selectedForeground" &&
                pair.background === background &&
                pair.floor === "body",
            ),
        )
        .map((background) => `selectedForeground/${background}`),
    ];

    expect(missing).toEqual([]);
  });

  it("holds the roles the row painters actually use", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const row = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const title = recipes.slice(
      recipes.indexOf("export const LIST_ITEM_TITLE ="),
      recipes.indexOf("export const LIST_ITEM_DESCRIPTION ="),
    );
    const titlePart = row.slice(
      row.indexOf("export const ListItemTitle ="),
      row.indexOf("export const ListItemDescription ="),
    );

    expect(title).toContain("text-foreground");
    expect(titlePart).toContain("theme.colors.selectedForeground");
    expect(row).toContain("backgroundColor: theme.colors.selected");
    expect(row).toContain("color: theme.colors.selectedForeground");
    expect(row).toContain("{ backgroundColor: theme.colors.accent }");

    expect(row).toContain('pressWash(theme, "accent")');
  });

  it("reports a primitive surface that swallows the text on it", () => {
    const broken = {
      colors: { ...lightColors, selected: lightColors.foreground },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("reports a wash that matches the text a selected row keeps", () => {
    const broken = {
      colors: { ...lightColors, accent: lightColors.selectedForeground },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "selectedForeground" && background === "accent",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("fails a title the secondary floor would have passed", () => {
    const broken = {
      colors: { ...lightColors, selectedForeground: "#5F5F5F" },
    };
    const ratio = contrastRatio(
      broken.colors.selectedForeground,
      broken.colors.selected,
    );
    const failure = contrastFailures(broken).find(
      ({ foreground, background }) =>
        foreground === "selectedForeground" && background === "selected",
    );

    expect(ratio).toBeGreaterThan(contrastFloors.secondary);
    expect(ratio).toBeLessThan(contrastFloors.body);
    expect(failure).toMatchObject({ floor: contrastFloors.body });
  });

  it("clears the floor in every shipped theme, tightest on the base dark press", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];

    const floorOf = (
      theme: (typeof shipped)[number],
      foreground: keyof ThemeColors,
      background: keyof ThemeColors,
    ): number => {
      const pair = contrastPairs.find(
        (entry) =>
          entry.foreground === foreground && entry.background === background,
      );
      return pair === undefined ? 0 : contrastFloorsFor(theme)[pair.floor];
    };
    const placements = shipped.flatMap((theme) => [
      {
        name: `${theme.name}/foreground/selected`,
        ratio: contrastRatio(theme.colors.foreground, theme.colors.selected),
        floor: floorOf(theme, "foreground", "selected"),
      },
      ...titleSurfaces.map((background) => ({
        name: `${theme.name}/selectedForeground/${background}`,
        ratio: contrastRatio(
          theme.colors.selectedForeground,
          theme.colors[background],
        ),
        floor: floorOf(theme, "selectedForeground", background),
      })),
    ]);
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);

    expect(placements.map(({ floor }) => floor)).toEqual(
      placements.map(() => contrastFloors.body),
    );
    expect(tightest.name).toBe("Dark · Omarchy/selectedForeground/active");
    expect(tightest.ratio?.toFixed(2)).toBe("7.12");

    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`pressed wash at ${tightest.ratio?.toFixed(2)}:1`);
  });
});

describe("a control boundary on the strip it sits on", () => {
  it("measures the strong boundary on every surface a control sits in", () => {
    const missing = [
      "background",
      "card",
      "input",
      "muted",
      "secondary",

      "popover",

      "hover",
      "active",
    ]
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "borderStrong" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `borderStrong/${background}`);

    expect(missing).toEqual([]);
  });

  it("reports the boundary value the base themes shipped before this pair", () => {
    const lightBefore = {
      colors: { ...lightColors, borderStrong: "#848E9E" },
    };
    const muted = contrastFailures(lightBefore).find(
      ({ foreground, background }) =>
        foreground === "borderStrong" && background === "muted",
    );

    expect(muted?.floor).toBe(contrastFloors.boundary);
    expect(muted?.ratio).toBeCloseTo(2.92, 2);
  });

  it("reports an edge that disappears into the strip it sits in", () => {
    const broken = {
      colors: { ...lightColors, borderStrong: lightColors.secondary },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "borderStrong" && background === "secondary",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("reports the pressed edge the secondary action painted before this pair", () => {
    const pressed = contrastFailures({
      colors: { ...lightColors, borderStrong: "#75808F" },
    }).find(
      ({ foreground, background }) =>
        foreground === "borderStrong" && background === "active",
    );

    expect(pressed?.floor).toBe(contrastFloors.boundary);
    expect(pressed?.ratio).toBeCloseTo(2.88, 2);

    const strict = contrastFailures(
      { colors: { ...highContrastDarkColors, borderStrong: "#A0A0A0" } },
      highContrastFloors,
    ).find(
      ({ foreground, background }) =>
        foreground === "borderStrong" && background === "active",
    );

    expect(strict?.floor).toBe(highContrastFloors.boundary);
    expect(strict?.ratio).toBeCloseTo(4.15, 2);
  });

  it("reports an edge painted in the wash it tints", () => {
    const broken = {
      colors: { ...lightColors, borderStrong: lightColors.hover },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "borderStrong" && background === "hover",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("holds the control a floating surface actually paints", () => {
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );
    const confirm = readFileSync(
      new URL("../../components/src/confirm-dialog.tsx", import.meta.url),
      "utf8",
    );
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );

    expect(button).toContain('variant = "secondary"');

    expect(
      ["borderColor: theme.colors.borderStrong", "border border-strong"].some(
        (form) => button.includes(form),
      ),
      "the components' action paints no borderStrong edge",
    ).toBe(true);
    expect(
      readFileSync(
        new URL("../../tw/src/utilities.ts", import.meta.url),
        "utf8",
      ),
    ).toContain("borderColor: theme.colors.borderStrong");
    expect(confirm).toContain('testId="confirm-cancel"');
    expect(recipe(recipes, "DIALOG_CONTENT")).toContain("bg-popover");
    expect(recipe(recipes, "POPOVER_CONTENT")).toContain("bg-popover");
  });

  it("clears the boundary floor on a floating surface", () => {
    const measured = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ].map((theme) => ({
      theme: theme.name,
      ratio: contrastRatio(theme.colors.borderStrong, theme.colors.popover),
      floor: contrastFloorsFor(theme).boundary,
    }));

    expect(
      measured.filter(
        ({ ratio, floor }) => ratio === undefined || ratio < floor,
      ),
    ).toEqual([]);

    const tightest = measured.reduce((low, placement) =>
      (placement.ratio ?? 0) < (low.ratio ?? 0) ? placement : low,
    );
    expect(tightest.theme).toBe("Light · Windows");
    expect(tightest.ratio).toBeCloseTo(5.42, 2);

    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`Windows light's popover at ${printedRatio(tightest.ratio)}`);
  });
});

describe("a control's edge on a message's own tint", () => {
  const tints = [
    "infoSoft",
    "successSoft",
    "warningSoft",
    "destructiveSoft",
  ] as const;

  it("measures the strong boundary on each soft status tint", () => {
    const missing = tints
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "borderStrong" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `borderStrong/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the painters that put a filled action inside an alert", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const alert = readFileSync(
      new URL("../../components/src/alert.tsx", import.meta.url),
      "utf8",
    );
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );
    const page = readFileSync(
      new URL("../../components/docs/alert.mdx", import.meta.url),
      "utf8",
    );

    const tones = recipes.slice(
      recipes.indexOf("export const ALERT_TONES"),
      recipes.indexOf("export const ALERT_ICON"),
    );
    tints.forEach((tint) => expect(tones).toContain(`bg-${tint}`));
    expect(alert).toContain("ALERT_TONES[value]");

    expect(button).toContain('variant = "secondary"');
    expect(
      ["borderColor: theme.colors.borderStrong", "border border-strong"].some(
        (form) => button.includes(form),
      ),
      "the components' action paints no borderStrong edge",
    ).toBe(true);
    expect(page).toContain("AlertLink");
    expect(page).toContain("onSelect");
  });

  it("names the action the alert documents beside the filled one it measures", () => {
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const designSystem = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const packagePage = readFileSync(
      new URL("../../components/docs/alert.mdx", import.meta.url),
      "utf8",
    );

    expect(page).toContain("AlertLink");
    expect(packagePage).toContain("AlertLink");
    expect([page, designSystem].join(" ")).not.toContain(
      "documented action is a plain",
    );
    expect([page, designSystem].join(" ")).not.toContain(
      "documented action is the default",
    );
  });

  it("reports an edge that disappears into the tint it sits on", () => {
    tints.forEach((background) => {
      const broken = {
        colors: { ...lightColors, borderStrong: lightColors[background] },
      };

      expect(
        contrastFailures(broken).find(
          ({ foreground, background: strip }) =>
            foreground === "borderStrong" && strip === background,
        ),
      ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
    });
  });

  it("keeps the edge findable on every tint in every shipped theme", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = shipped.flatMap((theme) =>
      tints.map((background) => ({
        name: `${theme.name}/borderStrong/${background}`,
        ratio: contrastRatio(
          theme.colors.borderStrong,
          theme.colors[background],
        ),
        floor: contrastFloorsFor(theme).boundary,
      })),
    );
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);

    expect(tightest.name).toBe(`${themes.dark.name}/borderStrong/warningSoft`);
    expect(tightest.ratio).toBeCloseTo(3.29, 2);

    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`warning tint at ${printedRatio(tightest.ratio)}`);
  });
});

describe("the ring on the strip behind the control", () => {
  const fills = ["input", "selected", "hover", "active", "accent"] as const;

  it("measures the ring on every strip a control sits in", () => {
    const missing = fills
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "ring" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `ring/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the painters that put a control on a wash", () => {
    const row = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );

    const combobox = readFileSync(
      new URL("../../components/src/combobox.tsx", import.meta.url),
      "utf8",
    );

    expect(declaresKeyboardRing(row), "list.tsx").toBe(true);
    expect(row).toContain("backgroundColor: theme.colors.selected");
    expect(row).toContain("hover: { backgroundColor: theme.colors.accent }");

    expect(row).toContain(
      'active: { backgroundColor: pressWash(theme, "accent") }',
    );
    expect(combobox).toContain("backgroundColor: theme.colors.hover");
    expect(declaresKeyboardRing(combobox), "combobox.tsx").toBe(true);

    expect(button).toContain("@gpuixui/primitives/button");
    expect(
      declaresKeyboardRing(
        readFileSync(
          new URL(
            "../../primitives/src/components/Button.tsx",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
      "primitives/Button.tsx",
    ).toBe(true);
  });

  it("reports a ring that disappears into the row it is drawn on", () => {
    const broken = { colors: { ...lightColors, ring: lightColors.selected } };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "ring" && background === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("reports a ring the pressed wash hides", () => {
    const broken = { colors: { ...lightColors, ring: lightColors.active } };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "ring" && background === "active",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("keeps the ring findable on every strip in every shipped, platform and authored style", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const hidden = shipped.flatMap((theme) =>
      fills.filter((background) => {
        const ratio = contrastRatio(
          theme.colors.ring,
          theme.colors[background],
        );
        return ratio === undefined || ratio < contrastFloorsFor(theme).boundary;
      }),
    );

    expect(hidden).toEqual([]);
  });
});

describe("the ring on a message's own tint", () => {
  const tints = [
    "infoSoft",
    "successSoft",
    "warningSoft",
    "destructiveSoft",
  ] as const;

  it("measures the ring on every soft status tint", () => {
    const missing = tints
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "ring" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `ring/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the painters that put a ring on a tint", () => {
    const alert = readFileSync(
      new URL("../../components/src/alert.tsx", import.meta.url),
      "utf8",
    );
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );

    expect(alert).toContain("ALERT_TONES");

    expect(button).toContain("@gpuixui/primitives/button");
    expect(
      declaresKeyboardRing(
        readFileSync(
          new URL(
            "../../primitives/src/components/Button.tsx",
            import.meta.url,
          ),
          "utf8",
        ),
      ),
      "primitives/Button.tsx",
    ).toBe(true);
  });

  it("reports a ring that disappears into the tint it surrounds", () => {
    const broken = { colors: { ...lightColors, ring: lightColors.infoSoft } };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "ring" && background === "infoSoft",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("keeps every ring placement findable and prints the tightest", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const rings = contrastPairs.filter((pair) => pair.foreground === "ring");
    const placements = shipped.flatMap((theme) =>
      rings.map((pair) => ({
        name: `${theme.name}/ring/${pair.background}`,
        ratio: contrastRatio(theme.colors.ring, theme.colors[pair.background]),
        floor: contrastFloorsFor(theme)[pair.floor],
      })),
    );
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    expect(tightest.name).toBe("Light · Windows/ring/destructiveSoft");
    expect(tightest.ratio?.toFixed(2)).toBe("3.05");

    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(
      `Windows's red message tint at ${tightest.ratio?.toFixed(2)}:1`,
    );
  });
});

describe("the edge of a control inside a row's wash", () => {
  const washes = ["accent", "selected"] as const;

  it("measures the strong boundary on both washes a row paints", () => {
    const missing = washes
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "borderStrong" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `borderStrong/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the painters that put a bordered action inside a row", () => {
    const row = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );

    expect(row).toContain("readonly trailing?: ReactNode");
    expect(row).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(row).toContain("backgroundColor: theme.colors.selected");
    expect(row).toContain("{trailing}");
    expect(button).toContain('variant = "secondary"');

    expect(
      ["borderColor: theme.colors.borderStrong", "border border-strong"].some(
        (form) => button.includes(form),
      ),
      "the components' action paints no borderStrong edge",
    ).toBe(true);
  });

  it("reports an edge that disappears into the row wash it sits in", () => {
    washes.forEach((background) => {
      const broken = {
        colors: { ...lightColors, borderStrong: lightColors[background] },
      };

      expect(
        contrastFailures(broken).find(
          ({ foreground, background: strip }) =>
            foreground === "borderStrong" && strip === background,
        ),
      ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
    });
  });

  it("keeps the edge findable on both washes in every shipped theme", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = shipped.flatMap((theme) =>
      washes.map((background) => ({
        name: `${theme.name}/borderStrong/${background}`,
        ratio: contrastRatio(
          theme.colors.borderStrong,
          theme.colors[background],
        ),
        floor: contrastFloorsFor(theme).boundary,
      })),
    );
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);

    expect(tightest.name).toBe(
      `${platformTheme(themes.light, "linux").name}/borderStrong/selected`,
    );
    expect(tightest.ratio).toBeCloseTo(3.96, 2);

    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`selected row at ${printedRatio(tightest.ratio)}`);
  });
});

describe("the invalid state's edge", () => {
  const surfaces = [
    "background",
    "card",
    "popover",
    "input",
    "muted",
    "secondary",
  ] as const;

  const isMarkSurface = (surface: (typeof surfaces)[number]) =>
    indicatorSurfaces.some((strip) => strip === surface);

  it("measures the invalid edge on every strip a control sits on", () => {
    const missing = surfaces.filter(
      (background) =>
        !contrastPairs.some(
          (pair) =>
            pair.foreground === "destructive" &&
            pair.background === background &&
            pair.floor === "boundary",
        ) &&
        !(indicatorRoles.includes("destructive") && isMarkSurface(background)),
    );

    expect(missing).toEqual([]);
  });

  it("reports an invalid edge that matches the field it sits in", () => {
    const broken = {
      colors: { ...lightColors, destructive: lightColors.input },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "destructive" && background === "input",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("keeps the invalid edge visible on every strip in every shipped theme", () => {
    const samples = [
      { theme: lightTheme, floors: contrastFloors },
      { theme: darkTheme, floors: contrastFloors },
      { theme: highContrastLightTheme, floors: highContrastFloors },
      { theme: highContrastDarkTheme, floors: highContrastFloors },
    ].flatMap(({ theme, floors }) =>
      surfaces.map((surface) => ({
        theme: theme.name,
        surface,
        ratio: contrastRatio(theme.colors.destructive, theme.colors[surface]),
        floor: floors.boundary,
      })),
    );
    const hidden = samples.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );

    expect(hidden).toEqual([]);
  });
});

describe("contrastFailures", () => {
  it("passes every shipped theme", () => {
    expect(contrastFailures(lightTheme)).toEqual([]);
    expect(contrastFailures(darkTheme)).toEqual([]);
    expect(
      contrastFailures(highContrastLightTheme, highContrastFloors),
    ).toEqual([]);
    expect(contrastFailures(highContrastDarkTheme, highContrastFloors)).toEqual(
      [],
    );
  });

  it("reports the pair a bad value breaks, with its ratio and floor", () => {
    const broken = {
      colors: { ...lightColors, mutedForeground: lightColors.muted },
    };
    const failures = contrastFailures(broken);
    const muted = failures.find(
      ({ foreground, background }) =>
        foreground === "mutedForeground" && background === "muted",
    );

    expect(muted?.background).toBe("muted");
    expect(muted?.floor).toBe(contrastFloors.secondary);
    expect(muted?.ratio).toBeCloseTo(1, 5);
  });

  it("measures the text typed into an input against its field", () => {
    const broken = {
      colors: { ...lightColors, inputForeground: lightColors.input },
    };
    const failures = contrastFailures(broken);

    expect(
      failures.find(({ foreground }) => foreground === "inputForeground"),
    ).toMatchObject({ background: "input", floor: contrastFloors.body });
  });

  it("measures secondary text on every surface it can sit on", () => {
    const broken = {
      colors: { ...lightColors, mutedForeground: lightColors.background },
    };
    const measured = contrastFailures(broken).map(
      ({ foreground, background }) => `${foreground}/${background}`,
    );

    expect(measured).toContain("mutedForeground/background");
    expect(measured).toContain("mutedForeground/card");
    expect(measured).toContain("mutedForeground/popover");
  });

  it("reports an unmeasurable pair instead of skipping it", () => {
    const translucent = {
      colors: { ...lightColors, mutedForeground: "#191D2580" },
    };
    const failures = contrastFailures(translucent);

    expect(
      failures.some(
        (failure) =>
          failure.foreground === "mutedForeground" &&
          failure.ratio === undefined,
      ),
    ).toBe(true);
  });

  it("holds a high-contrast theme to the raised floors", () => {
    expect(contrastFailures(lightTheme, highContrastFloors)).not.toEqual([]);
  });
});

describe("the text a composite field keeps on its own fill", () => {
  const measured = (foreground: string, background: string): boolean =>
    contrastPairs.some(
      (pair) =>
        pair.foreground === foreground && pair.background === background,
    );

  it("measures the value and the placeholder on the page role", () => {
    expect(measured("inputForeground", "background")).toBe(true);
    expect(measured("placeholder", "background")).toBe(true);

    expect(measured("inputForeground", "input")).toBe(true);
    expect(measured("placeholder", "input")).toBe(true);
  });

  it("holds the painters that make the page a field fill", () => {
    const tw = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const composites = [
      ["SEARCH_INPUT", "SEARCH_INPUT_CONTROL"],
      ["TAG_INPUT_ROOT", "TAG_INPUT_FIELD"],
      ["MENTION_INPUT_FIELD", "MENTION_INPUT_CONTROL"],
      ["INLINE_EDIT_INPUT", "INLINE_EDIT_INPUT"],
      ["COLOR_PICKER_INPUT", "COLOR_PICKER_INPUT"],
      ["CHAT_COMPOSER", "CHAT_COMPOSER_FIELD"],
    ] as const;

    composites.forEach(([field, control]) => {
      expect(recipe(tw, field), field).toContain("bg-background");
      expect(recipe(tw, control), control).toContain("text-input-foreground");
    });

    const field = readFileSync(
      new URL("../../components/src/field.tsx", import.meta.url),
      "utf8",
    );
    expect(field).toContain("backgroundColor: isDisabled");
    expect(field).toContain("theme.colors.input");
  });

  it("reports the placeholder a page-coloured field could not carry", () => {
    const aero = retroTheme(themes.light, "aero");
    const darwin = platformTheme(themes.light, "darwin");

    expect(contrastRatio("#5F7181", aero.colors.background)).toBeCloseTo(
      4.35,
      2,
    );
    expect(contrastRatio("#66707F", darwin.colors.background)).toBeCloseTo(
      4.49,
      2,
    );
    expect(
      contrastRatio(aero.colors.placeholder, aero.colors.background),
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);
    expect(
      contrastRatio(darwin.colors.placeholder, darwin.colors.background),
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);
  });

  it("reports a placeholder painted in its own page", () => {
    const failures = contrastFailures({
      colors: { ...lightColors, placeholder: lightColors.background },
    });

    expect(
      failures.filter(
        ({ foreground, background }) =>
          foreground === "placeholder" && background === "background",
      ),
    ).toEqual([
      {
        foreground: "placeholder",
        background: "background",
        ratio: 1,
        floor: contrastFloors.secondary,
      },
    ]);
  });

  it("passes every shipped theme on both field fills", () => {
    const styles = [
      lightTheme,
      darkTheme,
      highContrastLightTheme,
      highContrastDarkTheme,
      ...platformNames.flatMap((platform) =>
        [themes.light, themes.dark].map((theme) =>
          platformTheme(theme, platform),
        ),
      ),
      ...retroNames.flatMap((look) =>
        [themes.light, themes.dark].map((theme) => retroTheme(theme, look)),
      ),
    ];

    styles.forEach((theme) => {
      const failures = contrastFailures(theme, contrastFloorsFor(theme)).filter(
        ({ foreground, background }) =>
          foreground === "placeholder"
            ? background === "background" || background === "input"
            : foreground === "inputForeground" &&
              (background === "background" || background === "input"),
      );
      expect(failures, theme.name).toEqual([]);
    });
  });
});

describe("the muted text inside a field's own fill", () => {
  const measured = (foreground: string, background: string): boolean =>
    contrastPairs.some(
      (pair) =>
        pair.foreground === foreground && pair.background === background,
    );

  it("measures the muted role on the fill a field paints for itself", () => {
    expect(measured("mutedForeground", "input")).toBe(true);

    expect(measured("inputForeground", "input")).toBe(true);
    expect(measured("placeholder", "input")).toBe(true);

    expect(
      contrastPairs.find(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "input",
      )?.floor,
    ).toBe("secondary");
  });

  it("holds the painters that put muted text inside a field", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    expect(recipe(recipes, "TIME_PICKER_ROOT")).toContain("bg-input");
    expect(recipe(recipes, "TIME_PICKER_SEPARATOR")).toContain(
      "text-muted-foreground",
    );
    expect(recipe(recipes, "TIME_PICKER_CLEAR")).toContain(
      "text-muted-foreground",
    );

    const primitives = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    const field = /const FIELD_BASE =\s*"([^"]*)"/.exec(primitives);
    expect(field?.[1]).toContain("bg-input");
    expect(
      readFileSync(
        new URL(
          "../../primitives/src/components/NumberField.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
    ).toContain('colorRole(part.theme, "mutedForeground")');

    const seam = readFileSync(
      new URL("./native-text.ts", import.meta.url),
      "utf8",
    );
    expect(seam).toContain("const colors = themeColors(theme)");
    expect(seam).toContain("bg: colors[fill]");
    expect(seam).toContain("textMuted: colors.mutedForeground");
    expect(seam).toContain(`fill: NativeTextFill = "input"`);
  });

  it("reports the muted line a field's own fill swallows", () => {
    const failures = contrastFailures({
      colors: { ...lightColors, mutedForeground: lightColors.input },
    });

    expect(
      failures.filter(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "input",
      ),
    ).toEqual([
      {
        foreground: "mutedForeground",
        background: "input",
        ratio: 1,
        floor: contrastFloors.secondary,
      },
    ]);
  });

  it("keeps the muted line readable in every shipped theme", () => {
    const styles = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = styles.map((theme) => ({
      name: theme.name,
      ratio: contrastRatio(theme.colors.mutedForeground, theme.colors.input),
      floor: contrastFloorsFor(theme).secondary,
    }));
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    expect(tightest.name).toBe("Light · Omarchy");
    expect(tightest.ratio?.toFixed(2)).toBe("6.31");

    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(page).toContain(
      `field's own fill at ${tightest.ratio?.toFixed(2)}:1`,
    );

    expect(page).toContain(`sweeps the ${styles.length} styles`);
    expect(page).not.toContain("sweeps the 16 styles");
  });
});
