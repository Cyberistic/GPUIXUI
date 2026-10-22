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
 * larger step named nothing. It is `xl: 10` now, and the pre-fix table is the
 * regression this suite measures.
 *
 * `invalidScales` is not one of `auditTheme`'s ten reports yet — the docs site's
 * readout words every report it prints, so folding it in is one coordinated
 * change with that page (recorded in `TODO.md` → Interlocks). The suite proves
 * the gap rather than hiding it: the audit passes a brand whose scales lie.
 */

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

  it("holds the Windows platform's xl radius above its lg", () => {
    // Measured before the fix: both were 8, so a dialog and a card on the
    // platform were equally square.
    expect(platformStyles.win32.radius.xl).toBeGreaterThan(
      platformStyles.win32.radius.lg,
    );

    const preFix = brand({
      radius: { ...platformStyles.win32.radius, xl: 8 },
    });

    expect(invalidScales(preFix)).toEqual([
      {
        group: "radius",
        path: "xl",
        value: 8,
        previous: { path: "lg", value: 8 },
      },
    ]);
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
    overrides: { radius: { xl: 8 } },
    expected: {
      group: "radius",
      path: "xl",
      value: 8,
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
        value: 8,
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
