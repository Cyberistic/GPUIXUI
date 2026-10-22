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
  focusRing,
  highContrastThemes,
  iconSize,
  invalidNumbers,
  keyboardFocusRing,
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
  droppedWeightAudit,
  droppedWeightTheme,
  flatEmphasisAudit,
  flatEmphasisTheme,
  grownIconAudit,
  grownIconTheme,
  invisibleRingAudit,
  lopsidedEmphasisAudit,
  lopsidedEmphasisTheme,
  squatDensityAudit,
  tallTypeAudit,
  tallTypeTheme,
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

describe("the strong role outweighs the body it emphasises", () => {
  // `bodyStrong` shares `body`'s size and leading, so its weight is the whole
  // difference between reading and emphasis (`Text role="bodyStrong"`, a card
  // title). `invalidScales` skips the pair — it is not a rung of the size ladder
  // — so nothing compared the two weights: a brand that forwards one weight from
  // a design-tool export paints the emphasis identically to the text it lifts,
  // and every size, leading and weight it carries is still layable.

  it("reports a strong role painted at the weight of the body it lifts", () => {
    expect(
      invalidNumbers(
        brand({ typography: { bodyStrong: { fontWeight: 400 } } }),
      ),
    ).toEqual([
      {
        group: "typography",
        path: "bodyStrong.fontWeight",
        value: 400,
        rule: "emphasis",
      },
    ]);
  });

  it("compares the pair, so a heavier body also flattens the emphasis", () => {
    // The report names the role that has to change, which is the strong one,
    // even when the body is what moved.
    expect(
      invalidNumbers(brand({ typography: { body: { fontWeight: 700 } } })),
    ).toEqual([
      {
        group: "typography",
        path: "bodyStrong.fontWeight",
        value: 600,
        rule: "emphasis",
      },
    ]);
  });

  it("accepts one step of weight as the whole difference", () => {
    expect(
      invalidNumbers(
        brand({ typography: { bodyStrong: { fontWeight: 500 } } }),
      ),
    ).toEqual([]);
    expect(typography.bodyStrong.fontWeight).toBeGreaterThan(
      typography.body.fontWeight,
    );
  });

  it("holds every shipped, platform and authored style to it", () => {
    // The tokens' own emphasis role is the one every consumer paints; a palette
    // or platform edit that flattened it would ship a title nobody sees.
    const flattened = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ]
      .filter(
        (theme) =>
          theme.typography.bodyStrong.fontWeight <=
          theme.typography.body.fontWeight,
      )
      .map((theme) => theme.name);

    expect(flattened).toEqual([]);
  });

  it("fails the gate on a flattened emphasis, with no colour report involved", () => {
    const audit = auditTheme(flatEmphasisTheme);

    expect(audit.invalidNumbers).toEqual([
      {
        group: "typography",
        path: "bodyStrong.fontWeight",
        value: 400,
        rule: "emphasis",
      },
    ]);
    expect(audit.invalidRoles).toEqual([]);
    expect(audit.invalidShadows).toEqual([]);
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.indicators).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("executes the documented example", () => {
    expect(
      flatEmphasisAudit.invalidNumbers.map(({ path, rule }) => [path, rule]),
    ).toEqual([["bodyStrong.fontWeight", "emphasis"]]);
    expect(flatEmphasisAudit.contrast).toEqual([]);
    expect(flatEmphasisAudit.passed).toBe(false);
  });
});

describe("the strong role shares the body's size and leading", () => {
  // `bodyStrong` and `body` are one emphasis at one size — 14/20 for both roles,
  // the weight the whole difference between reading and a line that stands out.
  // The typography merge is per role, so a design-tool export that names only
  // the token a body line is set from raises `body` and leaves `bodyStrong`
  // behind: the card title becomes the smaller line. Every number stays finite,
  // positive and in order and the weights are the library's, so the weight half
  // of the rule — and every other report — stays empty.

  it("reports a body size the strong role did not follow", () => {
    expect(
      invalidNumbers(brand({ typography: { body: { fontSize: 15 } } })),
    ).toEqual([
      {
        group: "typography",
        path: "bodyStrong.fontSize",
        value: 14,
        rule: "emphasis",
      },
    ]);
  });

  it("reports a body leading the strong role did not follow", () => {
    expect(
      invalidNumbers(brand({ typography: { body: { lineHeight: 24 } } })),
    ).toEqual([
      {
        group: "typography",
        path: "bodyStrong.lineHeight",
        value: 20,
        rule: "emphasis",
      },
    ]);
  });

  it("accepts the pair raised together", () => {
    expect(
      invalidNumbers(
        brand({
          typography: {
            body: { fontSize: 15, lineHeight: 22 },
            bodyStrong: { fontSize: 15, lineHeight: 22 },
          },
        }),
      ),
    ).toEqual([]);
  });

  it("reports an unusable size once, as a size rather than as emphasis", () => {
    // A stored role can carry a size the batch would drop. It is the
    // single-value report's, so the pair does not report the same role twice
    // under a rule that says nothing about an unusable number.
    expect(
      invalidNumbers({
        ...lightTheme,
        typography: {
          ...lightTheme.typography,
          bodyStrong: {
            ...lightTheme.typography.bodyStrong,
            fontSize: Number.NaN,
          },
        },
      }),
    ).toEqual([
      {
        group: "typography",
        path: "bodyStrong.fontSize",
        value: Number.NaN,
        rule: "positive",
      },
    ]);
  });

  it("fails the gate on a lopsided emphasis, with no colour report involved", () => {
    expect(lopsidedEmphasisAudit.invalidNumbers).toEqual([
      {
        group: "typography",
        path: "bodyStrong.fontSize",
        value: 14,
        rule: "emphasis",
      },
    ]);
    expect(lopsidedEmphasisAudit.invalidRoles).toEqual([]);
    expect(lopsidedEmphasisAudit.invalidShadows).toEqual([]);
    expect(lopsidedEmphasisAudit.contrast).toEqual([]);
    expect(lopsidedEmphasisAudit.decorative).toEqual([]);
    expect(lopsidedEmphasisAudit.indicators).toEqual([]);
    expect(lopsidedEmphasisAudit.passed).toBe(false);
  });

  it("executes the documented example", () => {
    expect(
      lopsidedEmphasisAudit.invalidNumbers.map(({ path, rule }) => [
        path,
        rule,
      ]),
    ).toEqual([["bodyStrong.fontSize", "emphasis"]]);
    expect(lopsidedEmphasisTheme.typography.body.fontSize).toBe(15);
    expect(lopsidedEmphasisTheme.typography.bodyStrong.fontSize).toBe(14);
    expect(lopsidedEmphasisAudit.contrast).toEqual([]);
    expect(lopsidedEmphasisAudit.passed).toBe(false);
  });
});

describe("a type role's weight is a number the batch can carry", () => {
  /** A theme restored from storage, in the shape the report reads. */
  const stored = (role: "h1" | "bodyStrong", fontWeight: number) => ({
    ...lightTheme,
    typography: {
      ...lightTheme.typography,
      [role]: { ...lightTheme.typography[role], fontWeight },
    },
  });

  it("reports a heading weight the serialised batch would drop", () => {
    // `NaN` becomes `null`, the renderer drops the property, and the largest
    // role in the scale paints at the runtime's default weight.
    expect(invalidNumbers(stored("h1", Number.NaN))).toEqual([
      {
        group: "typography",
        path: "h1.fontWeight",
        value: Number.NaN,
        rule: "finite",
      },
    ]);
  });

  it("reports an unusable strong weight once, as a number rather than as emphasis", () => {
    // The emphasis rule compares two weights; an unusable one is the
    // single-value report's, so one broken value does not produce two lines.
    expect(invalidNumbers(stored("bodyStrong", Number.NaN))).toEqual([
      {
        group: "typography",
        path: "bodyStrong.fontWeight",
        value: Number.NaN,
        rule: "finite",
      },
    ]);
  });

  it("leaves a weight between the shipped steps to the runtime's clamp", () => {
    // A variable font's 450 is a real number in the runtime's 1–1000 range, so
    // it paints; only a value JSON cannot carry is the report's business.
    expect(invalidNumbers(stored("h1", 450))).toEqual([]);
  });

  it("fails the gate on a stored heading, with no colour report involved", () => {
    expect(droppedWeightAudit.invalidNumbers).toEqual([
      {
        group: "typography",
        path: "h1.fontWeight",
        value: Number.NaN,
        rule: "finite",
      },
    ]);
    expect(droppedWeightAudit.invalidRoles).toEqual([]);
    expect(droppedWeightAudit.invalidShadows).toEqual([]);
    expect(droppedWeightAudit.contrast).toEqual([]);
    expect(droppedWeightAudit.decorative).toEqual([]);
    expect(droppedWeightAudit.indicators).toEqual([]);
    expect(droppedWeightAudit.passed).toBe(false);
  });

  it("executes the documented example", () => {
    expect(
      droppedWeightAudit.invalidNumbers.map(({ path, rule }) => [path, rule]),
    ).toEqual([["h1.fontWeight", "finite"]]);
    expect(droppedWeightTheme.typography.h1.fontWeight).toBeNaN();
    expect(droppedWeightAudit.contrast).toEqual([]);
    expect(droppedWeightAudit.passed).toBe(false);
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

  it("prints the fit rule in the catalogue, with a report the code actually returns", () => {
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(tallTypeTheme);

    expect(failure).toBeDefined();
    expect(catalogue).toContain(
      "| `density` | `controlHeight` per size | finite, `>= 24` (`targetSize.minimum`), and at least the text and the icon it carries (`fits`) |",
    );
    // The snippet is the real report, not an illustration of one.
    expect(catalogue).toContain(
      `// [{ group: "density", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );
  });

  it("prints the icon half of the fit rule, with a report the code actually returns", () => {
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(grownIconTheme);

    expect(failure).toBeDefined();
    expect(catalogue).toContain(
      `// [{ group: "density", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );
    // The page names the glyph a control draws, so a reader who grew the icon
    // scale knows which number the box has to reach.
    expect(catalogue).toContain("`iconSize.md`");
  });

  it("prints the strong-border rule in the catalogue, with a report the code actually returns", () => {
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(brand({ borderWidth: { strong: 0 } }));

    expect(failure).toBeDefined();
    expect(catalogue).toContain(
      "| `borderWidth` | `strong` | finite, `> 0` — the focus ring's width |",
    );
    // The snippet is the real report, not an illustration of one.
    expect(catalogue).toContain(
      `// [{ group: "borderWidth", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );
  });

  it("prints the emphasis rule in the catalogue, with a report the code actually returns", () => {
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(flatEmphasisTheme);

    expect(failure).toBeDefined();
    expect(catalogue).toContain(
      "| `typography` | `bodyStrong`'s size, leading and weight | the size and the leading equal `body`'s, and the weight is greater — `emphasis` |",
    );
    // The snippet is the real report, not an illustration of one.
    expect(catalogue).toContain(
      `// [{ group: "typography", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );
    // Both places the design system states it: the type section and the
    // contract list, so one surface cannot drift from the other.
    const design = page("../../../docs/design-system.md");
    expect(design).toContain(
      "the strong role must share the body's size and leading and\nweigh more",
    );
    expect(design).toContain(
      "the strong body role must share the body's size and leading and weigh more",
    );
  });

  it("prints the emphasis size report, not only the weight's", () => {
    // The pair is three numbers: a brand that raises the body's size and leaves
    // the strong role behind is reported on the role's `fontSize`. The page
    // prints that exact report beside the weight one, so a reader cannot take
    // the weight for the whole rule.
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(lopsidedEmphasisTheme);

    expect(failure?.path).toBe("bodyStrong.fontSize");
    expect(catalogue).toContain(
      `// [{ group: "typography", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );
    const design = page("../../../docs/design-system.md");
    expect(design).toContain(
      "`bodyStrong.fontSize` or `bodyStrong.lineHeight`",
    );
    expect(design).toContain(
      "a brand that raises only the body's size or\nleading leaves the role meant to stand out behind",
    );
  });

  it("prints the weight rule in the catalogue, with a report the code actually returns", () => {
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(droppedWeightTheme);

    expect(failure).toBeDefined();
    expect(catalogue).toContain(
      "| `typography` | every role's weight | finite — the runtime clamps a real number into its 1–1000 range (`fontWeight`) |",
    );
    // The snippet is the real report, not an illustration of one; `NaN` prints
    // as itself in the page's own comment.
    expect(catalogue).toContain(
      `// [{ group: "typography", path: "${failure?.path}", value: NaN, rule: "${failure?.rule}" }]`,
    );
    const design = page("../../../docs/design-system.md");
    expect(design).toContain("a type role's weight must be finite");
    expect(design).toContain(
      "`invalidNumbers` reports the role's `fontWeight` as `finite`",
    );
  });

  it("states the rule and its consequence in the design system", () => {
    const design = page("../../../docs/design-system.md");

    expect(design).toContain("a type role's leading must reach its own size");
    expect(design).toContain(
      "`invalidNumbers` reports the role's `lineHeight` as `leading`",
    );
    expect(design).toContain(
      "A control's box contains the text and the icon it carries",
    );
    expect(design).toContain("reports it as `fits`");
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
        rule: "positive",
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

describe("a control's box fits the text it carries", () => {
  it("reports the size whose box is shorter than its body text", () => {
    // `compact` is 24/28/32 and a control lays its value at `body`'s leading, so
    // a 26px leading outgrows only the smallest box.
    expect(
      invalidNumbers(
        brand({
          density: "compact",
          typography: {
            body: { lineHeight: 26 },
            bodyStrong: { lineHeight: 26 },
          },
        }),
      ),
    ).toEqual([
      {
        group: "density",
        path: "controlHeight.sm",
        value: 24,
        rule: "fits",
      },
    ]);
  });

  it("measures the label a button paints as well as the value a field does", () => {
    // A button, toggle and select trigger lay their text at `label`'s leading;
    // a field at `body`'s. The taller of the two is what the box must contain.
    expect(
      invalidNumbers(
        brand({
          density: "compact",
          typography: { label: { lineHeight: 26 } },
        }),
      ),
    ).toEqual([
      {
        group: "density",
        path: "controlHeight.sm",
        value: 24,
        rule: "fits",
      },
    ]);
  });

  it("accepts a box exactly as tall as the leading, where the line fills it", () => {
    expect(
      invalidNumbers(
        brand({
          density: "compact",
          typography: {
            body: { lineHeight: 24 },
            bodyStrong: { lineHeight: 24 },
          },
        }),
      ),
    ).toEqual([]);
  });

  it("reports a shrunken box once, as the pressable floor", () => {
    // A box under 24px is already a target a reader cannot hit; naming the fit
    // as well would count one shrunken control as two defects.
    expect(
      invalidNumbers(
        brand({
          density: { controlHeight: { sm: 20, md: 28, lg: 32 } },
          typography: {
            body: { lineHeight: 26 },
            bodyStrong: { lineHeight: 26 },
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

  it("leaves an unusable leading to the type report", () => {
    expect(
      invalidNumbers(
        brand({
          density: "compact",
          typography: { label: { lineHeight: Number.NaN } },
        }),
      ),
    ).toEqual([
      {
        group: "typography",
        path: "label.lineHeight",
        value: Number.NaN,
        rule: "positive",
      },
    ]);
  });

  it("fails the gate on a scale that outgrows its controls, with no colour report involved", () => {
    const audit = tallTypeAudit;

    expect(audit.invalidNumbers.map(({ path, rule }) => [path, rule])).toEqual([
      ["controlHeight.sm", "fits"],
    ]);
    expect(audit.invalidRoles).toEqual([]);
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("holds every shipped preset above the leading a control paints", () => {
    const leading = Math.max(
      typography.label.lineHeight,
      typography.body.lineHeight,
    );
    const squashed = densityNames.filter((name) =>
      Object.values(densityPresets[name].controlHeight).some(
        (height) => height < leading,
      ),
    );

    expect(squashed).toEqual([]);
  });
});

describe("a control's box fits the icon it draws", () => {
  it("reports the size whose box is shorter than the glyph a control carries", () => {
    // An `Icon` defaults to `md` and an `IconButton` is a square at its control
    // height, so a 26px glyph in `compact`'s 24px `sm` control overflows the
    // action. Every other number is the library's.
    expect(invalidNumbers(grownIconTheme)).toEqual([
      {
        group: "density",
        path: "controlHeight.sm",
        value: 24,
        rule: "fits",
      },
    ]);
  });

  it("reads the icon step a control draws, not the scale's largest step", () => {
    // `lg` and `xl` belong to toolbars, navigation and empty states rather than
    // to the glyph in an action, so a 30px `xl` inside the same 24px control is
    // not the failure — the `md` the control paints is.
    const wide = brand({ density: "compact", iconSize: { xl: 30 } });
    expect(invalidNumbers(wide)).toEqual([]);
    const glyph = brand({ density: "compact", iconSize: { md: 26, lg: 28 } });
    expect(invalidNumbers(glyph)).toEqual([
      {
        group: "density",
        path: "controlHeight.sm",
        value: 24,
        rule: "fits",
      },
    ]);
  });

  it("accepts a glyph exactly the box height, where it fills the control", () => {
    expect(
      invalidNumbers(
        brand({
          density: "compact",
          iconSize: { md: 24, lg: 26, xl: 28 },
        }),
      ),
    ).toEqual([]);
  });

  it("leaves an unusable icon size to the icon report", () => {
    expect(
      invalidNumbers(
        brand({ density: "compact", iconSize: { md: Number.NaN } }),
      ),
    ).toEqual([
      {
        group: "iconSize",
        path: "md",
        value: Number.NaN,
        rule: "positive",
      },
    ]);
  });

  it("fails the gate on an icon that outgrows its control, with no colour report involved", () => {
    const audit = grownIconAudit;

    expect(audit.invalidNumbers.map(({ path, rule }) => [path, rule])).toEqual([
      ["controlHeight.sm", "fits"],
    ]);
    expect(audit.invalidRoles).toEqual([]);
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("holds every shipped preset above the glyph a control draws", () => {
    // The shipped `md` is 16px against a 24px smallest control, so the icon half
    // of the rule is satisfied by the library's own scale — and the sweep keeps
    // a future icon step from quietly passing the box.
    const squashed = densityNames.filter((name) =>
      Object.values(densityPresets[name].controlHeight).some(
        (height) => height < iconSize.md,
      ),
    );

    expect(squashed).toEqual([]);
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

describe("the focus ring's width paints", () => {
  // A brand that states "no heavy lines" by zeroing `borderWidth.strong` keeps
  // every colour report clean — the `ring` role is still readable — while the
  // outline it colours is zero pixels wide and the unconditional ring's shadow
  // has neither spread nor blur. The keyboard focus cue is then invisible, so
  // the strong border is the one width that has to paint; the decorative
  // divider may still be zero.
  const invisibleRing = brand({ borderWidth: { strong: 0 } });

  it("reports a strong border a focus ring cannot draw", () => {
    expect(invalidNumbers(invisibleRing)).toEqual([
      { group: "borderWidth", path: "strong", value: 0, rule: "positive" },
    ]);
  });

  it("is the width both ring builders paint, so the report guards a real cue", () => {
    expect(keyboardFocusRing(invisibleRing).focusVisible.outlineWidth).toBe(0);
    expect(focusRing(invisibleRing).boxShadow.spreadRadius).toBe(0);
    expect(
      keyboardFocusRing(lightTheme).focusVisible.outlineWidth,
    ).toBeGreaterThan(0);
  });

  it("still allows a decorative divider to be zero", () => {
    expect(invalidNumbers(brand({ borderWidth: { thin: 0 } }))).toEqual([]);
  });

  it("fails the gate on it, with no colour report involved", () => {
    const audit = auditTheme(invisibleRing);

    expect(audit.invalidNumbers.map(({ rule }) => rule)).toEqual(["positive"]);
    expect(audit.invalidRoles).toEqual([]);
    expect(audit.invalidShadows).toEqual([]);
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.indicators).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("executes the documented example", () => {
    expect(invisibleRingAudit.invalidNumbers).toEqual([
      { group: "borderWidth", path: "strong", value: 0, rule: "positive" },
    ]);
    expect(invisibleRingAudit.contrast).toEqual([]);
    expect(invisibleRingAudit.passed).toBe(false);
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
