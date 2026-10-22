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
 *
 * A type role's leading is the same class one step on: a scale computed from a
 * factor keeps every number finite and positive while the next line starts
 * inside the previous one's glyph box. The documents name that rule, and this
 * suite reads them (as `docs.test.ts` and `selection.test.ts` do) so the page
 * cannot describe a report the code does not return.
 *
 * A row height is the third: a list row is a press target, and a `dense` row is
 * built at exactly `density.rowHeight`, so a theme whose rows were shaved ships
 * a target under the floor even when every control height is right. It is the
 * same `pressable` rule one level down, held here by name.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditTheme,
  densityNames,
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
  typography,
} from "./index.js";
import {
  crushedTypeAudit,
  squatDensityAudit,
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

describe("a type role's leading reaches its own size", () => {
  it("reports a leading shorter than the type it carries", () => {
    expect(
      invalidNumbers(brand({ typography: { body: { lineHeight: 12 } } })),
    ).toEqual([
      {
        group: "typography",
        path: "body.lineHeight",
        value: 12,
        rule: "leading",
      },
    ]);
  });

  it("accepts a leading of exactly the size, where lines touch but do not collide", () => {
    expect(
      invalidNumbers(
        brand({
          typography: { display: { fontSize: 28, lineHeight: 28 } },
        }),
      ),
    ).toEqual([]);
  });

  it("reports an unusable leading once, as a size rather than as a collision", () => {
    // A zero leading is a size failure; counting it twice would name the same
    // token for two rules and read as two defects.
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

  it("fails the gate on a crushed scale with no colour report involved", () => {
    // The scale a factor produces: the leading moved but the type did not.
    const audit = auditTheme(
      brand({
        typography: {
          h1: { lineHeight: 18 },
          h2: { lineHeight: 14 },
          body: { lineHeight: 10 },
        },
      }),
    );

    expect(audit.invalidNumbers.map(({ rule }) => rule)).toEqual([
      "leading",
      "leading",
      "leading",
    ]);
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("holds every shipped role above the floor", () => {
    // The scale's own tightest role is the display step; a shipped role that
    // dropped under 1.0 would be a defect in the tokens, not only in a brand.
    const collapsed = Object.entries(typography).flatMap(([role, value]) =>
      typeof value === "object" && value.lineHeight < value.fontSize
        ? [role]
        : [],
    );

    expect(collapsed).toEqual([]);
  });
});

describe("the documents name the number rules", () => {
  const page = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");

  it("prints the row rule in the catalogue, with a report the code actually returns", () => {
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(brand({ density: { rowHeight: 20 } }));

    expect(failure).toBeDefined();
    expect(catalogue).toContain(
      "| `density` | `rowHeight` | finite, `>= 24` (`targetSize.minimum`) |",
    );
    // The snippet is the real report, not an illustration of one.
    expect(catalogue).toContain(
      `// [{ group: "density", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );
  });

  it("prints the leading rule in the catalogue, with a report the code actually returns", () => {
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(
      brand({ typography: { body: { lineHeight: 10 } } }),
    );

    expect(failure).toBeDefined();
    expect(catalogue).toContain(
      "| `typography` | every role's leading | finite, `> 0`, and at least the role's size (`leading`) |",
    );
    // The snippet is the real report, not an illustration of one.
    expect(catalogue).toContain(
      `// [{ group: "typography", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );
  });

  it("states the rule and its consequence in the design system", () => {
    const design = page("../../../docs/design-system.md");

    expect(design).toContain("a type role's leading must reach its own size");
    expect(design).toContain(
      "`invalidNumbers` reports the role's `lineHeight` as `leading`",
    );
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
      { group: "density", path: "rowHeight", value: -1, rule: "pressable" },
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

describe("a row height a pointer cannot reach", () => {
  it("reports a row under the pressable floor, because a dense row IS the box", () => {
    // `packages/components/src/list.tsx` builds a `dense` row at exactly
    // `density.rowHeight`; that row takes a `tabIndex`, a press and a hover
    // wash, so the row height is a press target the library does not pad.
    expect(invalidNumbers(brand({ density: { rowHeight: 20 } }))).toEqual([
      { group: "density", path: "rowHeight", value: 20, rule: "pressable" },
    ]);
  });

  it("accepts the floor itself and every shipped preset's row", () => {
    expect(
      invalidNumbers(brand({ density: { rowHeight: targetSize.minimum } })),
    ).toEqual([]);
    expect(
      densityNames.filter(
        (name) => densityPresets[name].rowHeight < targetSize.minimum,
      ),
    ).toEqual([]);
  });

  it("fails the gate on a shrunken row, with no colour report involved", () => {
    const audit = auditTheme(brand({ density: { rowHeight: 18 } }));

    expect(audit.invalidNumbers.map(({ path, rule }) => [path, rule])).toEqual([
      ["rowHeight", "pressable"],
    ]);
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

  it("executes the documented short-density example", () => {
    expect(squatDensityAudit.invalidNumbers.map(({ path }) => path)).toEqual([
      "controlHeight.sm",
      "controlHeight.md",
      "rowHeight",
    ]);
    expect(squatDensityAudit.contrast).toEqual([]);
    expect(squatDensityAudit.passed).toBe(false);
  });

  it("executes the documented crushed-scale example", () => {
    expect(
      crushedTypeAudit.invalidNumbers.map(({ path, rule }) => [path, rule]),
    ).toEqual([
      ["display.lineHeight", "leading"],
      ["h1.lineHeight", "leading"],
      ["body.lineHeight", "leading"],
    ]);
    expect(crushedTypeAudit.contrast).toEqual([]);
    expect(crushedTypeAudit.passed).toBe(false);
  });
});
