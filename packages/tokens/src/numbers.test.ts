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
  missingTokens,
  type TextRole,
  type Theme,
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
  shavedRowAudit,
  shavedRowTheme,
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
    const collapsed = Object.entries(typography).flatMap(([role, value]) =>
      typeof value === "object" && value.lineHeight < value.fontSize
        ? [role]
        : [],
    );

    expect(collapsed).toEqual([]);
  });
});

describe("the strong role outweighs the body it emphasises", () => {
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
  const stored = (role: "h1" | "bodyStrong", fontWeight: number) => ({
    ...lightTheme,
    typography: {
      ...lightTheme.typography,
      [role]: { ...lightTheme.typography[role], fontWeight },
    },
  });

  it("reports a heading weight the serialised batch would drop", () => {
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
      "| `density` | `rowHeight` | finite, `>= 24` (`targetSize.minimum`), and at least the line a row paints (`fits`) |",
    );

    expect(catalogue).toContain(
      `// [{ group: "density", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );
  });

  it("prints the row's fit, with a report the code actually returns", () => {
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(shavedRowTheme);

    expect(failure).toBeDefined();
    expect(catalogue).toContain(
      `// [{ group: "density", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );

    expect(catalogue).toContain("`packages/data/src/tree/row.tsx`");
    expect(catalogue).toContain("`packages/files/src/log/log-viewer.tsx`");
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

    expect(catalogue).toContain("`iconSize.md`");
  });

  it("prints the strong-border rule in the catalogue, with a report the code actually returns", () => {
    const catalogue = page("../../../docs/tokens.md");
    const [failure] = invalidNumbers(brand({ borderWidth: { strong: 0 } }));

    expect(failure).toBeDefined();
    expect(catalogue).toContain(
      "| `borderWidth` | `strong` | finite, `> 0` — the focus ring's width |",
    );

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

    expect(catalogue).toContain(
      `// [{ group: "typography", path: "${failure?.path}", value: ${failure?.value}, rule: "${failure?.rule}" }]`,
    );

    const design = page("../../../docs/design-system.md");
    expect(design).toContain(
      "the strong role must share the body's size and leading and\nweigh more",
    );
    expect(design).toContain(
      "the strong body role must share the body's size and leading and weigh more",
    );
  });

  it("prints the emphasis size report, not only the weight's", () => {
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

describe("a row's box fits the line it paints", () => {
  const row = (
    overrides: ThemeOverrides,
  ): ReadonlyArray<readonly [string, string]> =>
    invalidNumbers(brand(overrides)).map(({ path, rule }) => [path, rule]);

  it("reports a row shorter than the body leading a tree row carries", () => {
    expect(
      row({
        density: { rowHeight: 24 },
        typography: {
          body: { lineHeight: 26 },
          bodyStrong: { lineHeight: 26 },
        },
      }),
    ).toEqual([["rowHeight", "fits"]]);
  });

  it("reports a row shorter than the glyph slot it leads with", () => {
    expect(
      row({ density: { rowHeight: 24 }, iconSize: { md: 26, lg: 28, xl: 30 } }),
    ).toEqual([["rowHeight", "fits"]]);
  });

  it("measures the code role a log viewer paints, not only the tree's body", () => {
    expect(
      row({
        density: { rowHeight: 24 },
        typography: { code: { lineHeight: 26 } },
      }),
    ).toEqual([["rowHeight", "fits"]]);
  });

  it("accepts a row exactly as tall as the line, where it fills the box", () => {
    expect(
      invalidNumbers(
        brand({
          density: { rowHeight: targetSize.minimum },
          typography: {
            body: { lineHeight: targetSize.minimum },
            bodyStrong: { lineHeight: targetSize.minimum },
          },
        }),
      ),
    ).toEqual([]);
  });

  it("reports a row under the floor once, as the pressable one", () => {
    expect(
      row({
        density: { rowHeight: 20 },
        typography: {
          body: { lineHeight: 26 },
          bodyStrong: { lineHeight: 26 },
        },
      }),
    ).toEqual([["rowHeight", "pressable"]]);
  });

  it("holds every shipped preset above the lines its rows paint", () => {
    expect(
      densityNames.filter(
        (name) =>
          densityPresets[name].rowHeight <
          Math.max(
            typography.body.lineHeight,
            typography.code.lineHeight,
            iconSize.md,
          ),
      ),
    ).toEqual([]);
  });

  it("reads the two painters that put the type scale in a row", () => {
    const tree = readFileSync(
      new URL("../../data/src/tree/row.tsx", import.meta.url),
      "utf8",
    );
    const log = readFileSync(
      new URL("../../files/src/log/log-viewer.tsx", import.meta.url),
      "utf8",
    );

    expect(tree).toContain('textStyle(theme, "body")');

    expect(
      tree.includes("height: height ?? theme.density.rowHeight") ||
        tree.includes("height ?? rowHeightOf(theme)"),
    ).toBe(true);

    expect(
      tree.includes("width: theme.iconSize.md") ||
        tree.includes('width: iconSideOf(theme, "md")'),
    ).toBe(true);
    expect(log).toContain('textStyle(theme, "code")');
    expect(log).toContain("theme.density.rowHeight");
  });

  it("fails the gate on a shaved row, with no colour report involved", () => {
    const audit = shavedRowAudit;

    expect(audit.invalidNumbers.map(({ path, rule }) => [path, rule])).toEqual([
      ["rowHeight", "fits"],
    ]);
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.passed).toBe(false);
  });
});

describe("a control's box fits the text it carries", () => {
  it("reports the size whose box is shorter than its body text", () => {
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
    expect(
      invalidNumbers(brand({ spacing: { md: Number.parseFloat("auto") } })),
    ).toEqual([
      { group: "spacing", path: "md", value: Number.NaN, rule: "nonNegative" },
    ]);
  });
});

describe("the focus ring's width paints", () => {
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

describe("a theme that lost a type role", () => {
  const withoutTypeRole = (role: TextRole) => {
    const { [role]: _gone, ...typography } = lightTheme.typography;
    return { ...lightTheme, typography };
  };

  it("skips a role the theme does not carry, instead of throwing", () => {
    (["body", "bodyStrong", "label", "h1"] as const).forEach((role) => {
      expect(invalidNumbers(withoutTypeRole(role)), role).toEqual([]);
    });
  });

  it("still reports the numbers the theme does carry", () => {
    const shortened = brand({ density: { controlHeight: { sm: 20 } } });
    const { label: _gone, ...typography } = shortened.typography;

    expect(invalidNumbers({ ...shortened, typography })).toEqual([
      {
        group: "density",
        path: "controlHeight.sm",
        value: 20,
        rule: "pressable",
      },
    ]);
  });

  it("names the absent role as the gate's refusal", () => {
    expect(() => auditTheme(withoutTypeRole("bodyStrong"))).toThrow(
      "`typography.bodyStrong` is missing",
    );
  });

  it("is what the catalogue promises the report does", () => {
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(page).toContain("including the two pairs it compares");
  });
});

describe("a theme that lost a whole numeric group", () => {
  const lost = missingTokens({}).filter(({ kind }) => kind === "group");

  const without = (group: (typeof lost)[number]["group"]) =>
    ({ ...lightTheme, [group]: undefined }) as unknown as Theme;

  it("refuses every group it lost, by name", () => {
    expect(lost.length).toBeGreaterThan(0);
    lost.forEach(({ group }) => {
      expect(() => invalidNumbers(without(group)), group).toThrow(
        `a theme must carry every numeric group: \`${group}\` is missing`,
      );

      expect(() => invalidNumbers(without(group)), group).not.toThrow(
        TypeError,
      );
    });
  });

  it("reads a nulled group as the group it lost", () => {
    const nulled = { ...lightTheme, density: null } as unknown as Theme;

    expect(() => invalidNumbers(nulled)).toThrow(
      "a theme must carry every numeric group: `density` is missing",
    );
  });

  it("still walks a theme that carries every group", () => {
    expect(invalidNumbers(lightTheme)).toEqual([]);
  });

  it("is what the catalogue promises the reports do", () => {
    const page = (path: string): string =>
      readFileSync(
        new URL(`../../../${path}`, import.meta.url),
        "utf8",
      ).replace(/\s+/g, " ");

    expect(page("docs/tokens.md")).toContain(
      "a report that cannot open a group makes the same refusal",
    );
    expect(page("docs/design-system.md")).toContain(
      "The two numeric reports make that refusal themselves",
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

  it("skips the scale it cannot read, instead of throwing", () => {
    metrics.forEach((metric) =>
      shapes.forEach((shape) => {
        const stored = lostScale(metric, shape);

        expect(invalidNumbers(stored), `${metric} ${shape}`).toEqual([]);

        expect(() => invalidNumbers(stored), `${metric} ${shape}`).not.toThrow(
          TypeError,
        );
      }),
    );
  });

  it("names every step of the lost scale as the gate's refusal", () => {
    metrics.forEach((metric) => {
      expect(() => auditTheme(lostScale(metric, "dropped"))).toThrow(
        `\`density.${metric}.sm\``,
      );
      expect(() => auditTheme(lostScale(metric, "nulled"))).toThrow(
        `\`density.${metric}.md\``,
      );
    });
  });

  it("still reports the scale the theme carries beside the one it lost", () => {
    const stored = {
      ...lostScale("controlPaddingX", "dropped"),
      density: {
        ...lightTheme.density,
        controlPaddingX: undefined,
        controlHeight: { sm: 20, md: 32, lg: 36 },
      },
    } as unknown as Theme;

    expect(invalidNumbers(stored)).toEqual([
      {
        group: "density",
        path: "controlHeight.sm",
        value: 20,
        rule: "pressable",
      },
    ]);
  });

  it("leaves an absent step inside a carried scale to the refusal too", () => {
    const stored = {
      ...lightTheme,
      density: {
        ...lightTheme.density,
        controlHeight: { sm: 28, lg: 36 },
      },
    } as unknown as Theme;

    expect(invalidNumbers(stored)).toEqual([]);
    expect(() => auditTheme(stored)).toThrow(
      "`density.controlHeight.md` is missing",
    );
  });

  it("is what the catalogue promises the reports do", () => {
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(page).toContain(
      "`invalidNumbers` walks only the control-size scales a theme carries",
    );
  });
});

describe("a length a store wrote as something else", () => {
  const stored = (overrides: Partial<Record<keyof Theme, unknown>>): Theme =>
    ({ ...lightTheme, ...overrides }) as Theme;

  const written = stored({
    spacing: { ...lightTheme.spacing, md: "8" },
    radius: { ...lightTheme.radius, md: "6" },
    iconSize: { ...lightTheme.iconSize, md: "16" },
    density: {
      ...lightTheme.density,
      controlPaddingX: { ...lightTheme.density.controlPaddingX, md: "10" },
    },
  });

  it("reports every length group's value by path, as the store wrote it", () => {
    expect(invalidNumbers(written)).toEqual([
      { group: "spacing", path: "md", value: "8", rule: "finite" },
      { group: "radius", path: "md", value: "6", rule: "finite" },
      { group: "iconSize", path: "md", value: "16", rule: "finite" },
      {
        group: "density",
        path: "controlPaddingX.md",
        value: "10",
        rule: "finite",
      },
    ]);
  });

  it("fails the gate on the numbers alone", () => {
    const audit = auditTheme(written);

    expect(audit.invalidRoles).toEqual([]);
    expect(audit.invalidShadows).toEqual([]);
    expect(audit.contrast).toEqual([]);
    expect(audit.decorative).toEqual([]);
    expect(audit.passed).toBe(false);
  });

  it("reports a stored value of any shape, not only a string", () => {
    const holed = stored({
      spacing: { ...lightTheme.spacing, sm: true, lg: "8px" },
    });

    expect(invalidNumbers(holed)).toEqual([
      { group: "spacing", path: "sm", value: true, rule: "finite" },
      { group: "spacing", path: "lg", value: "8px", rule: "finite" },
    ]);
  });

  it("leaves an absent step to the refusal that names it", () => {
    const dropped = stored({
      spacing: { ...lightTheme.spacing, sm: undefined, lg: null },
    });

    expect(invalidNumbers(dropped)).toEqual([]);
    expect(() => auditTheme(dropped)).toThrow(
      "`spacing.sm`, `spacing.lg` are missing",
    );
    expect(missingTokens(dropped).map(({ path }) => path)).toEqual([
      "sm",
      "lg",
    ]);
  });

  it("leaves a scale a brand wrote with numbers alone", () => {
    expect(invalidNumbers(brand({ radius: { md: 0 } }))).toEqual([]);
    expect(invalidNumbers(lightTheme)).toEqual([]);
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

    expect(page).toContain("A **value that is not a number**");
    expect(page).toContain('value: "8", rule: "finite"');
    expect(page).toContain("the value the store wrote");
    expect(system).toContain(
      "reported under `finite` with the value the store wrote",
    );
    expect(inventory).toContain("the value as written");

    [page, system, inventory].forEach((document) => {
      expect(document).not.toContain("skips a value that is not a number");
    });
  });
});

describe("the audit gates on the numbers", () => {
  it("fails a brand whose only defect is a dropped radius", () => {
    const audit = auditTheme(unmeasuredBrandTheme);

    expect(audit.invalidNumbers).toEqual([
      { group: "radius", path: "md", value: Number.NaN, rule: "nonNegative" },
    ]);

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
    const square = brand({ radius: { sm: 0, md: 0, lg: 0, xl: 0 } });

    expect(auditTheme(square).invalidNumbers).toEqual([]);
    expect(auditTheme(square).scales).toEqual([]);
    expect(auditTheme(square).passed).toBe(true);
  });

  it("reports a radius that inverts the ladder, where the number is fine", () => {
    const inverted = brand({ radius: { md: 0 } });

    expect(auditTheme(inverted).invalidNumbers).toEqual([]);
    expect(auditTheme(inverted).scales).toEqual([
      {
        group: "radius",
        path: "md",
        value: 0,
        previous: { path: "sm", value: 4 },
      },
    ]);
    expect(auditTheme(inverted).passed).toBe(false);
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
