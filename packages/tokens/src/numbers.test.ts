/**
 * Guards the numeric half of the theme gate.
 *
 * The audit checked every colour a theme carries and **no number**. A style
 * batch is serialised with `JSON.stringify` before it reaches native, so `NaN`
 * and `Infinity` arrive as `null` and the renderer drops the property — measured
 * in the test renderer: `borderRadius: NaN` beside a valid `borderWidth`,
 * `fontSize` and `backgroundColor` left those three on the element and dropped
 * only the radius. A negative size is worse than silent: `fontSize: -4` was
 * accepted and laid a text element out at height 0. A brand theme built from a
 * scale factor or a stored preference can carry either, and every suite stayed
 * green.
 */
import { describe, expect, it } from "vitest";
import {
  auditTheme,
  densityPresets,
  extendTheme,
  highContrastThemes,
  invalidNumbers,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  targetSize,
  themes,
  type ThemeOverrides,
} from "./index.js";
import {
  unmeasuredBrandAudit,
  unmeasuredBrandTheme,
} from "./numbers.example.js";

const brand = (overrides: ThemeOverrides) => extendTheme(lightTheme, overrides);

describe("every shipped theme carries numbers the renderer can lay out", () => {
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
      .filter((theme) => invalidNumbers(theme).length > 0)
      .map((theme) => theme.name);

    expect(failing).toEqual([]);
  });

  it("audits a real set, so a scan that stopped iterating cannot pass", () => {
    expect(shipped.length).toBeGreaterThanOrEqual(16);
  });
});

describe("every group of numbers is inspected", () => {
  it("reports a non-finite spacing step", () => {
    expect(
      invalidNumbers(brand({ spacing: { lg: Number.POSITIVE_INFINITY } })),
    ).toEqual([
      {
        group: "spacing",
        path: "lg",
        value: Number.POSITIVE_INFINITY,
        rule: "nonNegative",
      },
    ]);
  });

  it("reports a non-finite radius", () => {
    expect(invalidNumbers(brand({ radius: { xl: Number.NaN } }))).toEqual([
      { group: "radius", path: "xl", value: Number.NaN, rule: "nonNegative" },
    ]);
  });

  it("reports a non-finite border width", () => {
    expect(
      invalidNumbers(brand({ borderWidth: { strong: Number.NaN } })),
    ).toEqual([
      {
        group: "borderWidth",
        path: "strong",
        value: Number.NaN,
        rule: "nonNegative",
      },
    ]);
  });

  it("reports an icon size a control cannot draw", () => {
    expect(invalidNumbers(brand({ iconSize: { md: 0 } }))).toEqual([
      { group: "iconSize", path: "md", value: 0, rule: "positive" },
    ]);
  });

  it("reports a type size or leading that paints nothing", () => {
    expect(
      invalidNumbers(brand({ typography: { body: { fontSize: -1 } } })),
    ).toEqual([
      {
        group: "typography",
        path: "body.fontSize",
        value: -1,
        rule: "positive",
      },
    ]);
    expect(
      invalidNumbers(brand({ typography: { h2: { lineHeight: 0 } } })),
    ).toEqual([
      {
        group: "typography",
        path: "h2.lineHeight",
        value: 0,
        rule: "positive",
      },
    ]);
  });

  it("reports a density metric that makes a control invisible or unhittable", () => {
    expect(
      invalidNumbers(
        brand({
          density: {
            controlHeight: {
              ...lightTheme.density.controlHeight,
              md: 0,
            },
          },
        }),
      ),
    ).toEqual([
      {
        group: "density",
        path: "controlHeight.md",
        value: 0,
        rule: "pressable",
      },
    ]);
    expect(invalidNumbers(brand({ density: { rowHeight: -1 } }))).toEqual([
      { group: "density", path: "rowHeight", value: -1, rule: "positive" },
    ]);
  });

  it("reports a shadow geometry the renderer drops, by level and position", () => {
    // A level a brand supplies can hold several shadows; the bad one behind a
    // valid entry must still be reported, or a level's first shadow hides it.
    const [first] = lightTheme.elevation.lg;
    expect(first).toBeDefined();
    if (first === undefined) return;

    expect(
      invalidNumbers(
        brand({
          elevation: {
            lg: [first, { ...first, blurRadius: Number.NaN }],
          },
        }),
      ),
    ).toEqual([
      {
        group: "elevation",
        path: "lg[1].blurRadius",
        value: Number.NaN,
        rule: "nonNegative",
      },
    ]);
  });
});

describe("a control height a pointer cannot reach", () => {
  it("reports a height under the pressable floor", () => {
    expect(
      invalidNumbers(
        brand({
          density: {
            controlHeight: {
              ...lightTheme.density.controlHeight,
              sm: 20,
            },
          },
        }),
      ),
    ).toEqual([
      {
        group: "density",
        path: "controlHeight.sm",
        value: 20,
        rule: "pressable",
      },
    ]);
  });

  it("accepts the floor itself, which is what the shortest shipped control is built to", () => {
    // A control box IS the press target: the library reserves no extra inset, so
    // 24px is the smallest height a control may have. `compact` `sm` sits
    // exactly on it, which is why the shipped presets pass.
    expect(densityPresets.compact.controlHeight.sm).toBe(targetSize.minimum);
    expect(
      invalidNumbers(
        brand({
          density: {
            controlHeight: {
              ...lightTheme.density.controlHeight,
              sm: targetSize.minimum,
            },
          },
        }),
      ),
    ).toEqual([]);
  });

  it("reports only the sizes a shrunken density puts under the floor", () => {
    const paths = invalidNumbers(
      brand({
        density: {
          controlHeight: { sm: 22, md: targetSize.minimum, lg: 26 },
        },
      }),
    ).map((failure) => failure.path);

    expect(paths).toEqual(["controlHeight.sm"]);
  });

  it("fails the gate on it, with no colour report involved", () => {
    const audit = auditTheme(
      brand({ density: { controlHeight: { sm: 20, md: 20, lg: 20 } } }),
    );

    expect(audit.invalidNumbers).toHaveLength(3);
    expect(audit.invalidRoles).toEqual([]);
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.passed).toBe(false);
  });
});

describe("the rule is precise", () => {
  it("allows the zero and negative lengths a design can use", () => {
    // `radius.none` and a hairline divider are zero by design; a shadow may be
    // offset up and in — a positive-only rule would report every shipped theme.
    expect(
      invalidNumbers(
        brand({
          radius: { none: 0, md: 0 },
          borderWidth: { thin: 0 },
          elevation: {
            md: [
              {
                offsetX: -2,
                offsetY: -4,
                blurRadius: 0,
                spreadRadius: -1,
                color: "#00000020",
              },
            ],
          },
        }),
      ),
    ).toEqual([]);
  });

  it("still reports a negative length that must not be negative", () => {
    expect(invalidNumbers(brand({ radius: { md: -8 } }))).toEqual([
      { group: "radius", path: "md", value: -8, rule: "nonNegative" },
    ]);
  });

  it("reports a size that reached the theme from a value that did not parse", () => {
    // The real source of a non-finite token is arithmetic on input — a scale
    // factor read from a settings file, a `parseFloat` of "auto" — not a literal
    // `NaN` typed into a theme.
    expect(
      invalidNumbers(brand({ spacing: { md: Number.parseFloat("auto") } })),
    ).toEqual([
      { group: "spacing", path: "md", value: Number.NaN, rule: "nonNegative" },
    ]);
  });
});

describe("the audit gates on the numbers", () => {
  it("fails a brand whose only defect is a dropped radius", () => {
    const audit = auditTheme(unmeasuredBrandTheme);

    expect(audit.invalidNumbers).toEqual([
      { group: "radius", path: "md", value: Number.NaN, rule: "nonNegative" },
    ]);
    // None of the colour reports can see it, so `passed` must read this one.
    expect(audit.invalidRoles).toEqual([]);
    expect(audit.invalidShadows).toEqual([]);
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.selection).toEqual([]);
    expect(audit.indicators).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("executes the documented example", () => {
    expect(unmeasuredBrandAudit.passed).toBe(false);
    expect(unmeasuredBrandAudit.invalidNumbers[0]?.path).toBe("md");
  });

  it("passes a brand that paints square corners on purpose", () => {
    // Zero is a design decision, not a broken number: only a value the renderer
    // cannot lay out is a failure.
    const square = brand({ radius: { md: 0 } });

    expect(auditTheme(square).invalidNumbers).toEqual([]);
    expect(auditTheme(square).passed).toBe(true);
  });
});
