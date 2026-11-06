import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditTheme,
  extendTheme,
  highContrastThemes,
  invalidNumbers,
  invalidScales,
  lightTheme,
  missingTokens,
  platformNames,
  platformStyles,
  platformTheme,
  retroNames,
  retroTheme,
  themes,
  type BoxShadow,
  type InvalidScale,
  type TextStyle,
  type Theme,
  type ThemeOverrides,
} from "./index.js";
import {
  brandScaleReport,
  computedBrand,
  elevationScaleReport,
  equalRadiusBrand,
  equalRadiusReport,
  unevenElevationBrand,
} from "./scales.example.js";

const brand = (overrides: ThemeOverrides) => extendTheme(lightTheme, overrides);

describe("every shipped theme keeps its scales ordered", () => {
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

  it("reports nothing for any of them", () => {
    const failing = shipped
      .map((theme) => ({ theme, findings: invalidScales(theme) }))
      .filter(({ findings }) => findings.length > 0)
      .map(
        ({ theme, findings }) => `${theme.name}: ${JSON.stringify(findings)}`,
      );

    expect(failing).toEqual([]);
  });

  it("lets the Windows platform's control and surface corners alias", () => {
    expect(platformStyles.win32.radius).toMatchObject({
      sm: 4,
      md: 4,
      lg: 8,
      xl: 8,
    });
    expect(invalidScales(platformTheme(lightTheme, "win32"))).toEqual([]);

    const broken = brand({
      radius: { ...platformStyles.win32.radius, xl: 6 },
    });

    expect(invalidScales(broken)).toEqual([
      {
        group: "radius",
        path: "xl",
        value: 6,
        previous: { path: "lg", value: 8 },
      },
    ]);
  });
});

describe("the equal radius the Fluent 2 style aliases", () => {
  const flat = (text: string): string => text.replace(/\s+/g, " ");
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");
  const catalogue = read("../../../docs/tokens.md");
  const designSystem = read("../../../docs/design-system.md");
  const inventory = read("../../../.agents/slop/COMPONENTS.md");
  const readme = read("../README.md");
  const inventoryRow = ((): string => {
    const start = inventory.indexOf("| Scale order |");
    const end = inventory.indexOf("\n", start);
    return start === -1 ? "" : inventory.slice(start, end);
  })();

  const winLadder = (): string => {
    const { sm, md, lg, xl } = platformStyles.win32.radius;
    return `${sm}/${md}/${lg}/${xl}`;
  };

  it("prints the ladder the Windows style ships, not the fix it undid", () => {
    const pages = {
      "docs/tokens.md": flat(catalogue),
      "docs/design-system.md": flat(designSystem),
      ".agents/slop/COMPONENTS.md": flat(inventoryRow),
    };
    Object.entries(pages).forEach(([name, text]) => {
      expect(text, name).toContain(winLadder());
      expect(text, name).not.toContain("2/4/8/10");
      expect(text, name).not.toContain("`xl` is 10");
    });
  });

  it("prints the equal pair as the accepted example, not a finding", () => {
    expect(equalRadiusBrand.radius.lg).toBe(equalRadiusBrand.radius.xl);
    expect(equalRadiusReport).toEqual([]);
    expect(flat(catalogue)).toContain(
      "invalidScales(extendTheme(lightTheme, { radius: { xl: 8 } })); // []",
    );
    expect(flat(catalogue)).toContain("`equalRadiusBrand`");
  });

  it("keeps the smaller rung a lie, with the report the page prints", () => {
    const smaller = brand({ radius: { xl: 6 } });

    expect(invalidScales(smaller)).toEqual([
      {
        group: "radius",
        path: "xl",
        value: 6,
        previous: { path: "lg", value: 8 },
      },
    ]);
    expect(flat(catalogue)).toContain(
      "invalidScales(extendTheme(lightTheme, { radius: { xl: 6 } }))",
    );
    expect(flat(catalogue)).toContain('path: "xl", value: 6');
    expect(flat(catalogue)).toContain('previous: { path: "lg", value: 8 }');

    expect(flat(catalogue)).toContain("alias");
    expect(flat(designSystem)).toContain("alias");
    expect(flat(readme)).toContain("alias");
  });

  it("prints the case count this file runs", () => {
    const cases = read("./scales.test.ts").match(/\bit\(/g)?.length ?? 0;

    expect(cases).toBeGreaterThan(10);
    expect(flat(inventoryRow)).toContain(`\`scales.test.ts\` (${cases} cases)`);
  });
});

const shadow = (
  offsetY: number,
  blurRadius: number,
  spreadRadius: number,
): BoxShadow => ({
  offsetX: 0,
  offsetY,
  blurRadius,
  spreadRadius,
  color: "#191D25A6",
});

const breaks: ReadonlyArray<{
  readonly label: string;
  readonly overrides: ThemeOverrides;
  readonly expected: InvalidScale;
}> = [
  {
    label: "spacing",
    overrides: { spacing: { "2xs": 9 } },
    expected: {
      group: "spacing",
      path: "xs",
      value: 4,
      previous: { path: "2xs", value: 9 },
    },
  },
  {
    label: "radius",
    overrides: { radius: { xl: 6 } },
    expected: {
      group: "radius",
      path: "xl",
      value: 6,
      previous: { path: "lg", value: 8 },
    },
  },
  {
    label: "borderWidth",
    overrides: { borderWidth: { strong: 1 } },
    expected: {
      group: "borderWidth",
      path: "strong",
      value: 1,
      previous: { path: "thin", value: 1 },
    },
  },
  {
    label: "iconSize",
    overrides: { iconSize: { md: 12 } },
    expected: {
      group: "iconSize",
      path: "md",
      value: 12,
      previous: { path: "sm", value: 14 },
    },
  },
  {
    label: "typography",
    overrides: { typography: { h2: { fontSize: 12 } } },
    expected: {
      group: "typography",
      path: "h2.fontSize",
      value: 12,
      previous: { path: "h3.fontSize", value: 16 },
    },
  },
  {
    label: "density.controlHeight",
    overrides: { density: { controlHeight: { sm: 40, md: 28, lg: 36 } } },
    expected: {
      group: "density",
      path: "controlHeight.md",
      value: 28,
      previous: { path: "controlHeight.sm", value: 40 },
    },
  },
  {
    label: "density.controlPaddingX",
    overrides: {
      density: { controlPaddingX: { sm: 20, md: 10, lg: 12 } },
    },
    expected: {
      group: "density",
      path: "controlPaddingX.md",
      value: 10,
      previous: { path: "controlPaddingX.sm", value: 20 },
    },
  },
  {
    label: "elevation",

    overrides: { elevation: { md: [shadow(24, 56, -12)] } },
    expected: {
      group: "elevation",
      path: "lg",
      value: 48,
      previous: { path: "md", value: 68 },
    },
  },
];

describe("the step that breaks a scale", () => {
  it("names both steps, in every group", () => {
    const drift = breaks.flatMap(({ label, overrides, expected }) => {
      const found = invalidScales(brand(overrides));
      return found.length === 1 &&
        JSON.stringify(found[0]) === JSON.stringify(expected)
        ? []
        : [
            `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(found)}`,
          ];
    });

    expect(drift).toEqual([]);
  });

  it("reports every inverted rung, not only the first", () => {
    const inverted = brand({
      spacing: {
        "2xs": 4,
        xs: 8,
        sm: 2,
        md: 1,
        lg: 12,
        xl: 16,
        "2xl": 24,
        "3xl": 32,
        "4xl": 48,
        "5xl": 64,
      },
    });

    expect(invalidScales(inverted).map(({ path }) => path)).toEqual([
      "sm",
      "md",
    ]);
  });
});

const lower = {
  spacing: (step: string, value: number): Theme => ({
    ...lightTheme,
    spacing: Object.assign({}, lightTheme.spacing, { [step]: value }),
  }),
  radius: (step: string, value: number): Theme => ({
    ...lightTheme,
    radius: Object.assign({}, lightTheme.radius, { [step]: value }),
  }),
  borderWidth: (step: string, value: number): Theme => ({
    ...lightTheme,
    borderWidth: Object.assign({}, lightTheme.borderWidth, { [step]: value }),
  }),
  iconSize: (step: string, value: number): Theme => ({
    ...lightTheme,
    iconSize: Object.assign({}, lightTheme.iconSize, { [step]: value }),
  }),
} as const;

const everyPair = (
  group: keyof typeof lower,
  entries: ReadonlyArray<readonly [string, number]>,
): ReadonlyArray<string> =>
  entries.slice(1).flatMap(([step], offset) => {
    const previous = entries[offset];
    if (previous === undefined) {
      return [];
    }
    const [previousStep, previousValue] = previous;
    const expected: InvalidScale = {
      group,
      path: step,
      value: previousValue - 1,
      previous: { path: previousStep, value: previousValue },
    };
    const found = invalidScales(lower[group](step, expected.value));
    return JSON.stringify(found) === JSON.stringify([expected])
      ? []
      : [
          `${group}.${step}: expected ${JSON.stringify([expected])}, got ${JSON.stringify(found)}`,
        ];
  });

describe("every rung the ladder walks", () => {
  it("compares each spacing pair the scale ships, not a sample", () => {
    const entries = Object.entries(lightTheme.spacing);
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(entries.length).toBeGreaterThan(5);
    expect(everyPair("spacing", entries)).toEqual([]);

    expect(page).toContain(
      "A step added to a scale fails the package's type check until it joins the ladder",
    );
  });

  it("compares each radius pair the scale ships, not a sample", () => {
    const entries = Object.entries(lightTheme.radius);

    expect(entries.length).toBeGreaterThan(4);
    expect(everyPair("radius", entries)).toEqual([]);
  });

  it("compares the border pair the scale ships", () => {
    const entries = Object.entries(lightTheme.borderWidth);

    expect(entries.length).toBe(2);
    expect(everyPair("borderWidth", entries)).toEqual([]);
  });

  it("is a report the gate returns, and both pages say so", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8")
        .replace(/\s+/g, " ")
        .replace(/\*\*/g, "");
    const audit = read("./audit.ts");
    const pages: Readonly<Record<string, string>> = {
      "docs/design-system.md": read("../../../docs/design-system.md"),
      "docs/tokens.md": read("../../../docs/tokens.md"),
    };

    expect(audit).toContain("scales,");
    expect(audit).toContain("scales.length === 0");

    Object.entries(pages).forEach(([name, text]) => {
      expect(text, name).toContain("invalidScales");
      expect(text, name).toContain("fourteen reports");
      expect(text, name).not.toContain("not one of the audit's reports");
    });
  });

  it("compares each icon pair the scale ships, not a sample", () => {
    const entries = Object.entries(lightTheme.iconSize);

    expect(entries.length).toBeGreaterThan(3);
    expect(everyPair("iconSize", entries)).toEqual([]);
  });

  it("compares each type pair, and leaves the roles that are not rungs", () => {
    const notRungs = new Set(["bodyStrong", "code", "codeBlock"]);
    const rungs = Object.entries(lightTheme.typography)
      .filter(
        (entry): entry is [string, TextStyle] => typeof entry[1] === "object",
      )
      .filter(([role]) => !notRungs.has(role))
      .sort((left, right) => left[1].fontSize - right[1].fontSize);
    const lowered = rungs.slice(1).flatMap(([role, style], offset) => {
      const previous = rungs[offset];
      if (previous === undefined) {
        return [];
      }
      const [previousRole, previousStyle] = previous;
      const value = previousStyle.fontSize - 1;
      const theme: Theme = {
        ...lightTheme,
        typography: Object.assign({}, lightTheme.typography, {
          [role]: { ...style, fontSize: value },
        }),
      };
      const expected: InvalidScale = {
        group: "typography",
        path: `${role}.fontSize`,
        value,
        previous: {
          path: `${previousRole}.fontSize`,
          value: previousStyle.fontSize,
        },
      };
      const found = invalidScales(theme);
      return JSON.stringify(found) === JSON.stringify([expected])
        ? []
        : [
            `${role}: expected ${JSON.stringify([expected])}, got ${JSON.stringify(found)}`,
          ];
    });

    expect(rungs.length).toBeGreaterThan(5);
    expect(lowered).toEqual([]);
  });
});

describe("a value that cannot be laid out", () => {
  it("is left to invalidNumbers instead of being compared", () => {
    const unlayable = brand({ radius: { md: Number.NaN } });

    expect(invalidScales(unlayable)).toEqual([]);
    expect(invalidNumbers(unlayable)).toEqual([
      { group: "radius", path: "md", value: Number.NaN, rule: "nonNegative" },
    ]);
  });
});

describe("the elevation ladder", () => {
  it("reads the distance a shadow reaches, not one rung of its geometry", () => {
    const tightened = brand({ elevation: { lg: [shadow(16, 40, -60)] } });

    expect(invalidScales(tightened)).toEqual([
      {
        group: "elevation",
        path: "lg",
        value: -4,
        previous: { path: "md", value: 14 },
      },
    ]);
  });

  it("compares a reserved level once it paints, and not while it is empty", () => {
    expect(invalidScales(lightTheme)).toEqual([]);

    const filled = brand({ elevation: { overlay: [shadow(1, 2, 0)] } });

    expect(invalidScales(filled)).toEqual([
      {
        group: "elevation",
        path: "overlay",
        value: 3,
        previous: { path: "lg", value: 48 },
      },
    ]);
  });

  it("reads the shadow the level paints, not another entry in its list", () => {
    const listed = brand({
      elevation: { md: [shadow(24, 56, -12), shadow(1, 2, 0)] },
    });

    expect(invalidScales(listed)).toEqual([
      {
        group: "elevation",
        path: "lg",
        value: 48,
        previous: { path: "md", value: 68 },
      },
    ]);
  });

  it("skips a level the theme does not carry", () => {
    const { lg: _omitted, ...restored } = lightTheme.elevation;

    expect(invalidScales({ ...lightTheme, elevation: restored })).toEqual([]);
  });

  it("leaves a geometry that cannot be laid out to invalidNumbers", () => {
    const unlayable = brand({
      elevation: { md: [shadow(Number.NaN, 12, -2)] },
    });

    expect(invalidScales(unlayable)).toEqual([]);
    expect(invalidNumbers(unlayable)).toEqual([
      {
        group: "elevation",
        path: "md[0].offsetY",
        value: Number.NaN,
        rule: "finite",
      },
    ]);
  });
});

describe("the shipped example", () => {
  it("reports the brand's three broken rungs", () => {
    expect(brandScaleReport).toEqual([
      {
        group: "radius",
        path: "xl",
        value: 6,
        previous: { path: "lg", value: 8 },
      },
      {
        group: "typography",
        path: "h2.fontSize",
        value: 12,
        previous: { path: "h3.fontSize", value: 16 },
      },
      {
        group: "density",
        path: "controlHeight.md",
        value: 28,
        previous: { path: "controlHeight.sm", value: 40 },
      },
    ]);
  });

  it("fails the gate, whose other reports cannot see it", () => {
    expect(invalidNumbers(computedBrand)).toEqual([]);
    expect(auditTheme(computedBrand).passed).toBe(false);
    expect(auditTheme(computedBrand).scales).toEqual(brandScaleReport);
    expect(brandScaleReport.length).toBeGreaterThan(0);
  });

  it("reports the brand whose menu level outranks its dialog", () => {
    expect(elevationScaleReport).toEqual([
      {
        group: "elevation",
        path: "lg",
        value: 48,
        previous: { path: "md", value: 68 },
      },
    ]);
    expect(auditTheme(unevenElevationBrand).passed).toBe(false);
    expect(auditTheme(unevenElevationBrand).scales).toEqual(
      elevationScaleReport,
    );
  });
});

describe("a type role the theme does not carry", () => {
  const withoutRole = (role: "h3") => {
    const { [role]: _gone, ...typography } = lightTheme.typography;
    return { ...lightTheme, typography };
  };

  it("skips the absent rung, instead of throwing", () => {
    expect(invalidScales(withoutRole("h3"))).toEqual([]);
  });

  it("keeps the ladder compared across the gap", () => {
    const raised = brand({ typography: { body: { fontSize: 22 } } });
    const { h3: _gone, ...typography } = raised.typography;

    expect(invalidScales({ ...raised, typography })).toEqual([
      {
        group: "typography",
        path: "h2.fontSize",
        value: 20,
        previous: { path: "body.fontSize", value: 22 },
      },
    ]);
  });

  it("is what the catalogue promises the report does", () => {
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(page).toContain(
      "A type role a restored theme does not carry is skipped",
    );
  });
});

describe("a theme that lost a whole numeric group", () => {
  const lost = missingTokens({}).filter(({ kind }) => kind === "group");

  it("refuses every group it lost, by name", () => {
    expect(lost.length).toBeGreaterThan(0);
    lost.forEach(({ group }) => {
      const stored = { ...lightTheme, [group]: undefined } as unknown as Theme;

      expect(() => invalidScales(stored), group).toThrow(
        `a theme must carry every numeric group: \`${group}\` is missing`,
      );

      expect(() => invalidScales(stored), group).not.toThrow(TypeError);
    });
  });

  it("still skips a single absent rung in a group it carries", () => {
    const { h3: _gone, ...typography } = lightTheme.typography;

    expect(invalidScales({ ...lightTheme, typography })).toEqual([]);
  });
});

describe("a type role a store wrote as something else", () => {
  const nulledRole = (role: keyof Theme["typography"]): Theme =>
    ({
      ...lightTheme,
      typography: { ...lightTheme.typography, [role]: null },
    }) as unknown as Theme;

  it("skips the nulled role, instead of throwing", () => {
    (["body", "h2", "display"] as const).forEach((role) =>
      expect(invalidScales(nulledRole(role)), role).toEqual([]),
    );
  });

  it("names the role as the gate's refusal", () => {
    expect(() => auditTheme(nulledRole("body"))).toThrow(
      "`typography.body` is missing",
    );
  });
});

describe("a control-size scale the theme does not carry", () => {
  const lostScale = (
    metric: "controlHeight" | "controlPaddingX",
    shape: "dropped" | "nulled" | "string",
  ): Theme => {
    const { [metric]: _gone, ...rest } = lightTheme.density;
    const density =
      shape === "dropped"
        ? rest
        : { ...rest, [metric]: shape === "nulled" ? null : "md" };

    return { ...lightTheme, density } as unknown as Theme;
  };
  const metrics = ["controlHeight", "controlPaddingX"] as const;
  const shapes = ["dropped", "nulled", "string"] as const;

  it("reads a scale it cannot open as no rungs, instead of throwing", () => {
    metrics.forEach((metric) =>
      shapes.forEach((shape) => {
        const stored = lostScale(metric, shape);

        expect(invalidScales(stored), `${metric} ${shape}`).toEqual([]);
        expect(() => invalidScales(stored), `${metric} ${shape}`).not.toThrow(
          TypeError,
        );
      }),
    );
  });

  it("still compares the scale the theme carries", () => {
    const stored = {
      ...lightTheme,
      density: {
        ...lightTheme.density,
        controlPaddingX: undefined,
        controlHeight: { sm: 36, md: 32, lg: 28 },
      },
    } as unknown as Theme;

    expect(invalidScales(stored)).toEqual([
      {
        group: "density",
        path: "controlHeight.md",
        value: 32,
        previous: { path: "controlHeight.sm", value: 36 },
      },
      {
        group: "density",
        path: "controlHeight.lg",
        value: 28,
        previous: { path: "controlHeight.md", value: 32 },
      },
    ]);
  });

  it("names every step of the lost scale as the gate's refusal", () => {
    expect(() => auditTheme(lostScale("controlHeight", "dropped"))).toThrow(
      "`density.controlHeight.sm`",
    );
    expect(() => auditTheme(lostScale("controlPaddingX", "nulled"))).toThrow(
      "`density.controlPaddingX.lg`",
    );
  });

  it("is what the catalogue promises the report does", () => {
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(page).toContain(
      "A control-size scale a restored theme does not carry is skipped",
    );
  });
});

describe("a level a store wrote as something else", () => {
  const holed = {
    ...lightTheme,
    elevation: { ...lightTheme.elevation, lg: [null] },
  } as unknown as Theme;

  it("does not read a level that paints nothing as a rung", () => {
    expect(invalidScales(holed)).toEqual([]);
  });

  it("leaves the gate a report rather than an exception", () => {
    expect(() => auditTheme(holed)).not.toThrow();

    expect(auditTheme(holed).invalidShadows).toEqual([
      { level: "lg", index: 0, color: undefined },
    ]);
    expect(auditTheme(holed).scales).toEqual([]);
    expect(auditTheme(holed).passed).toBe(false);
  });
});
