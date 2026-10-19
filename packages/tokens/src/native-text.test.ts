/**
 * Guards the defect this plan fixes: the pinned runtime paints `<code>`,
 * `<diff>` and `<markdown>` with a built-in **dark** theme unless the caller
 * passes a `theme` prop, and the package shipped only the field caret. The
 * shipped `components/message.tsx` renders `<markdown source={text} />` with no
 * prop, so an assistant message in the light identity, in every light platform
 * variant and in both AAA light sets is painted dark while every theme check
 * returned `[]`. `nativeTextTheme` is the missing prop: it maps the semantic
 * roles, the syntax palette and the type/spacing/radius scales into the shape
 * the runtime reads.
 *
 * The runtime also fades some values at fixed fractions (a diff line at 92%, a
 * marker at 90%, the accent bar at 55%, the row wash at 5.5%, a list marker at
 * 85%, the quote rail at 60% and its wash at 5%, and the code block's ink wash
 * at 3.5%). Those fractions are not tokens, so this suite holds the chosen
 * roles through each composition on every shipped set, and holds the syntax
 * palette to the body floor on the painted ink wash — a stricter surface than
 * the opaque `card` pair the public checker owns.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  alpha,
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  lightTheme,
  nativeFieldTheme,
  nativeSyntaxRoles,
  nativeTextRoles,
  nativeTextTheme,
  relativeLuminance,
  themeContrastFailures,
  type ContrastPair,
  type Theme,
  type ThemeColors,
} from "./index.js";
import {
  canvasDocument,
  diffViewer,
  largeCodeTheme,
  markdownDocument,
} from "./native-text.example.js";
import { shippedThemes } from "./shipped-themes.js";

type NativeColourField =
  | "border"
  | "text"
  | "textMuted"
  | "textFaint"
  | "textDim"
  | "accent"
  | "codeText"
  | "codeWash"
  | "diffAdd"
  | "diffDel"
  | "diffHunkBg";

/** Each native colour field and the published pair that holds its role. */
const nativeColourFields: ReadonlyArray<{
  readonly field: NativeColourField;
  readonly pair: ContrastPair;
}> = [
  { field: "border", pair: ["border", "card", "divider"] },
  { field: "text", pair: ["foreground", "card", "body"] },
  { field: "textMuted", pair: ["mutedForeground", "card", "secondary"] },
  { field: "textFaint", pair: ["placeholder", "card", "secondary"] },
  { field: "textDim", pair: ["mutedForeground", "card", "secondary"] },
  { field: "accent", pair: ["primaryText", "card", "secondary"] },
  { field: "codeText", pair: ["primaryText", "accent", "secondary"] },
  { field: "codeWash", pair: ["accent", "card", "surface"] },
  { field: "diffAdd", pair: ["successText", "card", "secondary"] },
  { field: "diffDel", pair: ["destructiveText", "card", "secondary"] },
  { field: "diffHunkBg", pair: ["hover", "card", "surface"] },
];

/**
 * The syntax spec, by role. A capture class is a use of a semantic text role,
 * never a solid fill: `success` as a string colour would be a fill painted as a
 * glyph, the defect plan 057 fixed for status labels.
 */
const syntaxSpec: ReadonlyArray<
  readonly [keyof ThemeColors, ReadonlyArray<keyof typeof nativeSyntaxRoles>]
> = [
  ["mutedForeground", ["comment", "operator", "punctuation"]],
  ["primaryText", ["keyword", "function", "functionBuiltin", "label"]],
  ["successText", ["string"]],
  [
    "warningText",
    [
      "stringSpecial",
      "escape",
      "number",
      "boolean",
      "constant",
      "variableSpecial",
      "attribute",
    ],
  ],
  ["infoText", ["typeName", "typeBuiltin", "constructor"]],
  ["destructiveText", ["macroName", "tag", "invalid"]],
  ["foreground", ["property", "variable", "parameter"]],
];

const syntaxRoles: ReadonlyArray<keyof ThemeColors> = syntaxSpec.map(
  ([role]) => role,
);

/** The runtime's fixed fractions, cited in `theme.rs`/`markdown/render.rs`. */
const runtimeFades = {
  codeBlockInkWashOpacity: 0.035,
  diffLineOpacity: 0.92,
  diffMarkerOpacity: 0.9,
  diffBarOpacity: 0.55,
  diffRowWashOpacity: 0.055,
  listMarkerOpacity: 0.85,
  quoteRailOpacity: 0.6,
  quoteWashOpacity: 0.05,
} as const;

/** The ink the runtime paints over `bg` for a code block: `ink()` in `render.rs`. */
const inkWash = (theme: Theme): string => {
  const ink =
    relativeLuminance(theme.colors.card) < 0.5 ? "#FFFFFF" : "#000000";
  return compositeOver(
    alpha(ink, runtimeFades.codeBlockInkWashOpacity),
    theme.colors.card,
  );
};

/** The syntax roles that miss the body floor on the painted code surface. */
const inkFailures = (
  theme: Theme,
): ReadonlyArray<readonly [keyof ThemeColors, number]> => {
  const floor = contrastFloors[theme.contrast].body;
  return syntaxRoles.flatMap((role) => {
    const ratio = contrastRatio(theme.colors[role], inkWash(theme));
    return ratio >= floor ? [] : [[role, ratio] as const];
  });
};

const faded = (color: string, opacity: number, surface: string): number =>
  contrastRatio(compositeOver(alpha(color, opacity), surface), surface);

const fadedOverWash = (
  color: string,
  opacity: number,
  wash: string,
  washOpacity: number,
  surface: string,
): number => {
  const painted = compositeOver(alpha(wash, washOpacity), surface);
  return contrastRatio(compositeOver(alpha(color, opacity), painted), painted);
};

describe("native text theme", () => {
  it("selects the runtime base from the theme's mode", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(nativeTextTheme(theme).appearance, theme.name).toBe(theme.mode);
    });
  });

  it("maps every colour to a role the contract measures on the code plane", () => {
    shippedThemes.forEach(({ theme }) => {
      const native = nativeTextTheme(theme);
      expect(native.bg, theme.name).toBe(theme.colors.card);
      expect(native.caret, theme.name).toBe(nativeFieldTheme(theme).caret);
      expect(native.fontSans, theme.name).toBe(theme.typography.sans);
      expect(native.fontMono, theme.name).toBe(theme.typography.mono);

      nativeColourFields.forEach(({ field, pair }) => {
        expect(native[field], `${theme.name} ${field}`).toBe(
          theme.colors[pair[0]],
        );
        expect(contrastPairs, `${theme.name} ${pair.join("/")}`).toContainEqual(
          pair,
        );
      });
    });
  });

  it("maps every syntax capture to a text role, never a fill", () => {
    const covered = syntaxSpec.flatMap(([, captures]) => captures);
    expect(covered.toSorted()).toEqual(
      Object.keys(nativeSyntaxRoles).toSorted(),
    );

    const solidFills: ReadonlyArray<keyof ThemeColors> = [
      "primary",
      "secondary",
      "success",
      "warning",
      "info",
      "destructive",
    ];

    syntaxSpec.forEach(([role, captures]) => {
      expect(solidFills, role).not.toContain(role);
      captures.forEach((capture) => {
        shippedThemes.forEach(({ theme }) => {
          expect(nativeTextTheme(theme).syntax[capture], theme.name).toBe(
            theme.colors[role],
          );
        });
      });
    });
  });

  it("derives the layout from the theme's type, spacing and radius scales", () => {
    const edited = extendTheme(lightTheme, {
      typography: {
        body: { fontSize: 16, lineHeight: 24 },
        h1: { fontSize: 30, lineHeight: 40 },
        codeBlock: { fontSize: 24, lineHeight: 34 },
        code: { fontSize: 26, lineHeight: 36 },
      },
      spacing: { lg: 15 },
      radius: { sm: 5 },
    });
    const native = nativeTextTheme(edited);

    expect(native.metrics.mdTextSize).toBe(16);
    expect(native.metrics.mdLineHeight).toBe(24);
    expect(native.metrics.mdHeadingSizes[0]).toBe(30);
    expect(native.metrics.mdHeadingLineHeights[0]).toBe(40);
    expect(native.metrics.mdHeadingSizes[3]).toBe(16);
    expect(native.metrics.diffFileHeaderHeight).toBe(
      edited.typography.label.lineHeight + 2 * edited.spacing.md,
    );
    expect(native.metrics.mdBlockGap).toBe(15);
    expect(native.metrics.mdCodePaddingX).toBe(15);
    expect(native.metrics.mdInlineCodeRadius).toBe(5);
    expect(native.metrics.codeTextSize).toBe(
      edited.typography.codeBlock.fontSize,
    );
    expect(native.metrics.mdCodeHeaderTextSize).toBe(
      edited.typography.caption.fontSize,
    );
    // The runtime's own proportions, resolved against the edited roles: 7px at
    // 12.5px code, 36px at 12px diff and 96/48px at 14px body.
    expect(native.metrics.codeGutterDigitWidth).toBe(14);
    expect(native.metrics.diffGutterWidth).toBe(72);
    expect(native.metrics.mdTableMinColumnWidth).toBe(110);
    expect(native.metrics.mdTableMinColumnContent).toBe(55);
  });

  it("keeps the runtime's shipped metrics at the shipped type sizes", () => {
    shippedThemes.forEach(({ theme }) => {
      const { metrics } = nativeTextTheme(theme);
      expect(metrics.codeGutterDigitWidth, theme.name).toBe(7);
      expect(metrics.diffGutterWidth, theme.name).toBe(36);
      expect(metrics.mdTableMinColumnWidth, theme.name).toBe(96);
      expect(metrics.mdTableMinColumnContent, theme.name).toBe(48);
    });
  });

  it("scales the code gutter with the example's larger code role", () => {
    const shipped = markdownDocument.theme.metrics;
    const larger = largeCodeTheme.theme.metrics;

    expect(larger.codeGutterDigitWidth).toBeGreaterThan(
      shipped.codeGutterDigitWidth,
    );
    expect(larger.codeGutterDigitWidth).toBe(14);
    expect(larger.diffGutterWidth).toBe(72);
  });

  it("holds the syntax palette to the body floor on the painted code surface", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(inkFailures(theme), theme.name).toEqual([]);
    });
  });

  it("reports a code role that is only secondary-strength", () => {
    // 4.755:1 on the darkest light wash, so every existing secondary pair
    // passes; 6.008:1 on the code plane, under the body floor.
    const planted = extendTheme(lightTheme, {
      colors: { infoText: "#636363" },
    });
    expect(
      themeContrastFailures(planted).some(
        (failure) =>
          failure.foreground === "infoText" &&
          failure.background === "card" &&
          failure.pairClass === "body",
      ),
    ).toBe(true);
  });

  it("can fail the painted-composite guard the opaque pair passes", () => {
    // 7.018:1 on the dark card clears the public body pair; the 3.5% white ink
    // the runtime paints over it drops the same role to 6.384:1.
    const planted = extendTheme(getTheme("dark"), {
      colors: { infoText: "#A7A7A7" },
    });
    expect(
      themeContrastFailures(planted).some(
        (failure) =>
          failure.foreground === "infoText" && failure.pairClass === "body",
      ),
    ).toBe(false);
    const failure = inkFailures(planted).find(([role]) => role === "infoText");
    expect(failure?.[1]).toBeCloseTo(6.384, 3);
  });

  it("holds the runtime's fixed fades on every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      const card = theme.colors.card;
      const floor = contrastFloors[theme.contrast];
      const colors = theme.colors;

      expect(
        faded(colors.foreground, runtimeFades.diffLineOpacity, card),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.body);
      expect(
        faded(colors.successText, runtimeFades.diffMarkerOpacity, card),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.secondary);
      expect(
        faded(colors.destructiveText, runtimeFades.diffMarkerOpacity, card),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.secondary);
      expect(
        faded(colors.successText, runtimeFades.diffBarOpacity, card),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.surface);
      expect(
        faded(colors.destructiveText, runtimeFades.diffBarOpacity, card),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.surface);
      expect(
        faded(colors.successText, runtimeFades.diffRowWashOpacity, card),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.surface);
      expect(
        faded(colors.primaryText, runtimeFades.listMarkerOpacity, card),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.mark);
      expect(
        faded(colors.primaryText, runtimeFades.quoteRailOpacity, card),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.surface);
      expect(
        faded(colors.primaryText, runtimeFades.quoteWashOpacity, card),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.surface);
      expect(
        fadedOverWash(
          colors.foreground,
          runtimeFades.diffLineOpacity,
          colors.successText,
          runtimeFades.diffRowWashOpacity,
          card,
        ),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.body);
      expect(
        fadedOverWash(
          colors.foreground,
          runtimeFades.diffLineOpacity,
          colors.destructiveText,
          runtimeFades.diffRowWashOpacity,
          card,
        ),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.body);
      expect(
        fadedOverWash(
          colors.mutedForeground,
          1,
          colors.primaryText,
          runtimeFades.quoteWashOpacity,
          card,
        ),
        theme.name,
      ).toBeGreaterThanOrEqual(floor.body);
    });
  });

  it("runs the example", () => {
    const dark = getTheme("dark");
    expect(markdownDocument.theme.appearance).toBe("dark");
    expect(markdownDocument.theme.text).toBe(dark.colors.foreground);
    expect(canvasDocument.theme.bg).toBe(dark.colors.background);
    expect(diffViewer.theme.diffAdd).toBe(dark.colors.successText);
  });

  it("names every native field and syntax capture in the reference", () => {
    // This is a documentation policy test over the tree's own source. `node:fs`
    // is deliberate: the tokens package ships zero runtime dependencies and has
    // no Effect FileSystem to borrow.
    const docs = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    Object.entries(nativeTextRoles).forEach(([field, role]) => {
      expect(docs, field).toContain(`\`${field}\``);
      expect(docs, role).toContain(`\`${role}\``);
    });
    Object.entries(nativeSyntaxRoles).forEach(([capture, role]) => {
      expect(docs, capture).toContain(`\`${capture}\``);
      expect(docs, role).toContain(`\`${role}\``);
    });
    [
      "nativeTextTheme",
      "nativeTextRoles",
      "nativeSyntaxRoles",
      "nativeSyntaxPairs",
      "appearance",
    ].forEach((name) =>
      expect(
        new RegExp(`(^|[^A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`).test(docs),
        name,
      ).toBe(true),
    );
  });
});
