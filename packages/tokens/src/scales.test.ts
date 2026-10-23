/**
 * Guards the order of every named scale a theme carries.
 *
 * The bug this guards: a scale is selected by name — `size="sm"` against `md`
 * and `lg`, `radius="xl"` against a card's `lg`, `textStyle(theme, "h3")` under
 * an `h2` — so a brand whose steps repeat or invert paints the wrong size in
 * silence. `invalidNumbers` answers whether one number can be laid out, and it
 * was the only numeric contract: a theme computed from a factor could ship a
 * `sm` control taller than its `lg`, a dialog as square as a card, or a second
 * heading smaller than its body text, with every number finite, positive and
 * pressable. The shipped scales were held to their order by `scale.test.ts` and
 * `typography.test.ts`; a brand's were held to nothing.
 *
 * The rule also found a shipped style: the Windows platform carried `lg: 8` and
 * `xl: 8`, so `radius="xl"` and `radius="lg"` painted the same surface and the
 * larger step named nothing. It is Fluent 2 today, whose controls round at 4 and
 * surfaces at 8, so both pairs are aliases on purpose and radius is the one
 * scale that permits an equal adjacent pair.
 *
 * `invalidScales` is not one of `auditTheme`'s ten reports yet — the docs site's
 * readout words every report it prints, so folding it in is one coordinated
 * change with that page (recorded in `TODO.md` → Interlocks). The suite proves
 * the gap rather than hiding it: the audit passes a brand whose scales lie.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditTheme,
  extendTheme,
  highContrastThemes,
  invalidNumbers,
  invalidScales,
  lightTheme,
  platformNames,
  platformStyles,
  platformTheme,
  retroNames,
  retroTheme,
  themes,
  type BoxShadow,
  type InvalidScale,
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
    // Fluent 2's 4px grid: every control corners at 4, every surface at 8. The
    // names are still ordered, but two names per kind share a corner.
    expect(platformStyles.win32.radius).toMatchObject({
      sm: 4,
      md: 4,
      lg: 8,
      xl: 8,
    });
    expect(invalidScales(platformTheme(lightTheme, "win32"))).toEqual([]);

    // A smaller rung is still a lie: `xl: 6` is below `lg`.
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

/**
 * The Windows fix the Fluent 2 style undid, and the example it left behind.
 *
 * The bug this guards: `invalidScales`' first shipped catch was the Windows
 * platform's `lg: 8` beside its `xl: 8`, and the catalogue, the design system
 * and the inventory row all teach it as "`xl` is 10 now". The style was
 * reshaped to Fluent 2 afterwards, where a control corners at 4 and a surface
 * at 8, so `sm`/`md` and `lg`/`xl` are aliases on purpose and `radius` is the
 * one ladder that accepts an equal pair. The catalogue's example kept the
 * older claim too: it printed an equal `xl: 8` with a failure report beside it,
 * which the report no longer returns, so a reader copying it saw `[]` where the
 * page promised a finding.
 */
describe("the equal radius the Fluent 2 style aliases", () => {
  const flat = (text: string): string => text.replace(/\s+/g, " ");
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");
  const catalogue = read("../../../docs/tokens.md");
  const designSystem = read("../../../docs/design-system.md");
  const inventory = read("../../../COMPONENTS.md");
  const readme = read("../README.md");
  const inventoryRow = ((): string => {
    const start = inventory.indexOf("| Scale order |");
    const end = inventory.indexOf("\n", start);
    return start === -1 ? "" : inventory.slice(start, end);
  })();

  /** The Windows ladder as the style ships it, so a palette edit moves the page. */
  const winLadder = (): string => {
    const { sm, md, lg, xl } = platformStyles.win32.radius;
    return `${sm}/${md}/${lg}/${xl}`;
  };

  it("prints the ladder the Windows style ships, not the fix it undid", () => {
    const pages = {
      "docs/tokens.md": flat(catalogue),
      "docs/design-system.md": flat(designSystem),
      "COMPONENTS.md": flat(inventoryRow),
    };
    Object.entries(pages).forEach(([name, text]) => {
      expect(text, name).toContain(winLadder());
      expect(text, name).not.toContain("2/4/8/10");
      expect(text, name).not.toContain("`xl` is 10");
    });
  });

  it("prints the equal pair as the accepted example, not a finding", () => {
    // The executed brand is the page's claim: the pair above `lg` is an alias,
    // so the report is empty rather than "the larger step named nothing".
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
    // The catalogue and the design system both name the alias rule, so a
    // reader is not told an equal rung is a defect one page later.
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

/**
 * One elevation shadow in the shape a brand supplies: a design-tool export hands
 * the caller a geometry and a colour, not the shipped level's share of `shadow`.
 */
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

/**
 * One broken step per scale, with the report it must produce. Each case names
 * the step that breaks and the neighbouring step it failed to exceed.
 */
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
    // The dialog's geometry copied onto the menu level: `md` now reaches 68px
    // below its box while `lg` reaches 48.
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

describe("a value that cannot be laid out", () => {
  it("is left to invalidNumbers instead of being compared", () => {
    // `NaN` already has an owner; comparing it here would report the same token
    // twice and say nothing about the order.
    const unlayable = brand({ radius: { md: Number.NaN } });

    expect(invalidScales(unlayable)).toEqual([]);
    expect(invalidNumbers(unlayable)).toEqual([
      { group: "radius", path: "md", value: Number.NaN, rule: "nonNegative" },
    ]);
  });
});

describe("the elevation ladder", () => {
  it("reads the distance a shadow reaches, not one rung of its geometry", () => {
    // Offset and blur alone say 56px below the box, which would pass; the
    // negative spread is what pulls the softest edge up under the menu level.
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
    // The shipped scale's `overlay` is reserved and empty, so `lg` is the last
    // rung; a brand that fills it has raised a surface above `lg`.
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
    // `elevationShadow` paints the first entry. Read the second and `md` would
    // measure 3, passing against `lg`'s 48.
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

  it("is invisible to every contract the gate runs today", () => {
    // The premise for folding this report into `auditTheme`: every number is
    // layable and pressable, so the other reports are empty and `passed` is
    // true while the theme's `sm` control is taller than its `lg`.
    expect(invalidNumbers(computedBrand)).toEqual([]);
    expect(auditTheme(computedBrand).passed).toBe(true);
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
    expect(auditTheme(unevenElevationBrand).passed).toBe(true);
  });
});

describe("a type role the theme does not carry", () => {
  // The bug this guards: the type ladder read `typography[role].fontSize`
  // directly, so a theme restored from storage that predates a role the library
  // added — the one way a complete theme becomes incomplete — threw
  // `TypeError: Cannot read properties of undefined (reading 'fontSize')` at
  // every rung but the two mono roles. A step the theme does not carry is not a
  // rung, the same rule the elevation ladder already follows.
  const withoutRole = (role: "h3") => {
    const { [role]: _gone, ...typography } = lightTheme.typography;
    return { ...lightTheme, typography };
  };

  it("skips the absent rung, instead of throwing", () => {
    expect(invalidScales(withoutRole("h3"))).toEqual([]);
  });

  it("keeps the ladder compared across the gap", () => {
    // Body raised above `h2` is still reported: the steps either side of the
    // missing name are adjacent once it is gone, and the report names the
    // preceding step it is actually compared with.
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
