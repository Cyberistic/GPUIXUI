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
 * at 3.5%). Plan 583 publishes them through `themeNativeTextFailures` on every
 * `nativeTextSurfaces` tone; this suite holds the bridge's own mapping and the
 * figures the catalogue quotes.
 *
 * Plan 574: the syntax palette was held on `card` only while `nativeTextTheme`
 * said every role was measured on all four `Surface` tones `bg` may name. On
 * Windows XP (Luna) light the inherited `infoText` and `warningText` measured
 * **6.903:1** and **6.951:1** on the beige canvas, and the runtime's 3.5% ink
 * wash put six more pairs under the 7:1 body floor across XP and Aero, while
 * every check returned `[]`. The suite now holds the palette on all four tones,
 * opaque and painted, and the platform styles own the steps their canvases need.
 *
 * Plan 585: the documents told a brand to set the runtime's two token-less
 * chrome metrics "on the returned object", but `NativeTextMetrics` declared
 * neither `codeGutterMinWidth` nor `diffAccentBarWidth`, so the documented
 * override failed `check-types` with TS2561. Both are optional members now and
 * the bridge leaves them unset; the same paragraphs no longer call the derived
 * per-digit width and table floors runtime defaults.
 *
 * Plan 792: the palette's only table is a paragraph that groups captures by
 * role, and the policy case below read the **names**, not the assignments — so
 * moving `property` from `foreground` to `warningText` in the prose left 244
 * tests green while every name and role still appeared somewhere. The three
 * sentences that state the palette's size ("The 24 syntax capture colours", "a
 * 24-capture syntax palette" and the ledger's copy) had no owner either: a
 * capture added to `nativeSyntaxRoles` would leave all three saying 24. One case
 * now parses each group, compares the whole `capture → role` map with the
 * palette both ways, rejects a duplicate, and derives the three counts from the
 * palette's keys.
 *
 * Plan 793: the field table above that paragraph is the only field-to-role
 * mapping for a hand-built native document, and the policy case checked its
 * names the same way — changing `bg` from `card` to `foreground` left 264 tests
 * green. One case now parses the table rows, order included, and compares them
 * with `nativeTextRoles` plus the three non-role rows.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  nativeFieldTheme,
  nativeSyntaxPairs,
  nativeSyntaxRoles,
  nativeTextRoles,
  nativeTextSurfaces,
  nativeTextTheme,
  themeContrastFailures,
  themeFailures,
  themeNativeTextFailures,
  type ContrastPair,
  type Theme,
  type ThemeColors,
} from "./index.js";
import {
  canvasDocument,
  customChromeTheme,
  diffViewer,
  largeCodeTheme,
  markdownDocument,
} from "./native-text.example.js";
import { nativeInk } from "./native-ink.js";
import { shippedThemes } from "./shipped-themes.js";

/**
 * Read a documentation page. `node:fs` is deliberate: these are policy tests
 * over the tree's own prose, and the tokens package ships zero runtime
 * dependencies.
 */
const readDoc = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

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

  it("leaves the two runtime-only metrics unset and lets a brand own them", () => {
    const shipped = nativeTextTheme(getTheme("dark")).metrics;
    expect(Object.hasOwn(shipped, "codeGutterMinWidth")).toBe(false);
    expect(Object.hasOwn(shipped, "diffAccentBarWidth")).toBe(false);

    const custom = customChromeTheme.theme.metrics;
    expect(custom.codeGutterMinWidth).toBe(36);
    expect(custom.diffAccentBarWidth).toBe(2);
    // The derived metrics still come from the theme.
    expect(custom.codeGutterDigitWidth).toBe(shipped.codeGutterDigitWidth);
    expect(custom.diffGutterWidth).toBe(shipped.diffGutterWidth);
  });

  it("names the two metrics the runtime owns and not the ones the bridge derives", () => {
    const pages = [
      ["docs/tokens.md", readDoc("../../../docs/tokens.md")],
      ["docs/design-system.md", readDoc("../../../docs/design-system.md")],
    ] as const;
    pages.forEach(([name, doc]) => {
      expect(doc, name).toContain("`codeGutterMinWidth`");
      expect(doc, name).toContain("`diffAccentBarWidth`");
      expect(doc, name).toMatch(/optional members of\s+`NativeTextMetrics`/);
      // The per-digit width and the table floors are derived since plan 572.
      expect(doc, name).not.toContain("the table's max-content share");
      expect(doc, name).not.toContain("max-content estimates");
    });
  });

  it("holds the syntax palette to the body floor on every painted document surface", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(
        themeNativeTextFailures(theme).filter(
          (failure) => failure.ink !== undefined,
        ),
        theme.name,
      ).toEqual([]);
    });
  });

  it("publishes the syntax palette on every document surface", () => {
    const expected = [...new Set(Object.values(nativeSyntaxRoles))]
      .filter((role) => role !== "foreground")
      .flatMap((role) =>
        nativeTextSurfaces.map(
          (background) => [role, background, "body"] as const,
        ),
      );
    expect(nativeSyntaxPairs).toHaveLength(expected.length);
    expected.forEach((pair) => expect(nativeSyntaxPairs).toContainEqual(pair));
  });

  it("holds the opaque palette on every document surface", () => {
    shippedThemes.forEach(({ theme }) => {
      const floor = contrastFloors[theme.contrast].body;
      nativeSyntaxPairs.forEach(([foreground, background]) => {
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${theme.name}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("reports a syntax role erased on a non-card surface", () => {
    const planted = extendTheme(lightTheme, {
      colors: { infoText: lightTheme.colors.background },
    });
    expect(
      themeContrastFailures(planted).some(
        (failure) =>
          failure.foreground === "infoText" &&
          failure.background === "background" &&
          failure.pairClass === "body",
      ),
    ).toBe(true);
  });

  it("names the platform steps the canvas and ink wash required", () => {
    const identity = getTheme("light");
    const macos = getPlatformTheme("darwin", "light");
    const windows = getPlatformTheme("win32", "light");
    const xp = getPlatformRecipeTheme("xp", "light");
    const aero = getPlatformRecipeTheme("aero", "light");
    const steps: ReadonlyArray<
      readonly [string, Theme, keyof ThemeColors, string]
    > = [
      ["macOS", macos, "infoText", "#173A88"],
      ["macOS", macos, "warningText", "#4B3100"],
      ["Windows", windows, "infoText", "#173A88"],
      ["Windows", windows, "warningText", "#4B3100"],
      ["XP", xp, "infoText", "#173A88"],
      ["XP", xp, "warningText", "#4B3100"],
      ["XP", xp, "successText", "#0A3A26"],
      ["XP", xp, "destructiveText", "#7E1D21"],
      ["Aero", aero, "infoText", "#173A88"],
      ["Aero", aero, "warningText", "#4B3100"],
      ["Aero", aero, "successText", "#0A3A26"],
    ];
    steps.forEach(([label, theme, role, value]) => {
      expect(theme.colors[role], `${label} ${role}`).toBe(value);
      expect(theme.colors[role], `${label} ${role} is not inherited`).not.toBe(
        identity.colors[role],
      );
    });
    [macos, windows, xp, aero].forEach((theme) =>
      expect(themeFailures(theme), theme.name).toEqual([]),
    );
  });

  it("quotes the derived tightest syntax figures", () => {
    const docs = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replaceAll(/\s+/g, " ");

    const opaque = shippedThemes
      .flatMap(({ theme }) =>
        nativeSyntaxPairs.map(([foreground, background]) => ({
          theme: theme.name,
          foreground,
          ratio: contrastRatio(
            theme.colors[foreground],
            theme.colors[background],
          ),
        })),
      )
      .reduce((a, b) => (b.ratio < a.ratio ? b : a));

    const inked = shippedThemes
      .flatMap(({ theme }) =>
        nativeTextSurfaces.flatMap((surface) =>
          syntaxRoles.map((role) => ({
            theme: theme.name,
            role,
            ratio: contrastRatio(theme.colors[role], nativeInk(theme, surface)),
          })),
        ),
      )
      .reduce((a, b) => (b.ratio < a.ratio ? b : a));

    expect(docs).toContain(
      `the tightest is \`${opaque.foreground}\` at **${opaque.ratio.toFixed(3)}:1** (\`${opaque.theme}\`)`,
    );
    expect(docs).toContain(
      `the tightest is \`${inked.role}\` at **${inked.ratio.toFixed(3)}:1** (\`${inked.theme}\`)`,
    );
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
          failure.foreground === "infoText" &&
          failure.background === "card" &&
          failure.pairClass === "body",
      ),
    ).toBe(false);
    const failure = themeNativeTextFailures(planted).find(
      (candidate) =>
        candidate.role === "infoText" &&
        candidate.surface === "card" &&
        candidate.ink !== undefined,
    );
    expect(failure?.ratio).toBeCloseTo(6.384, 3);
  });

  it("runs the example", () => {
    const dark = getTheme("dark");
    expect(markdownDocument.theme.appearance).toBe("dark");
    expect(markdownDocument.theme.text).toBe(dark.colors.foreground);
    expect(canvasDocument.theme.bg).toBe(dark.colors.background);
    expect(diffViewer.theme.diffAdd).toBe(dark.colors.successText);
  });

  it("names every native field and syntax capture in the reference", () => {
    // This is a documentation policy test over the tree's own source; the
    // package ships zero runtime dependencies (see `readDoc`).
    const docs = readDoc("../../../docs/tokens.md");
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
      "nativeTextSurfaces",
      "nativeSyntaxRoles",
      "nativeSyntaxPairs",
      "appearance",
      "nativeHighlight",
      "nativeHighlightPairs",
      "NativeHighlight",
    ].forEach((name) =>
      expect(
        new RegExp(`(^|[^A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`).test(docs),
        name,
      ).toBe(true),
    );
  });

  it("maps every documented capture to the role the palette gives it", () => {
    const docs = readDoc("../../../docs/tokens.md").replaceAll(/\s+/g, " ");
    const marker = "`nativeSyntaxRoles` owns the capture palette:";
    const start = docs.indexOf(marker);
    const end = docs.indexOf("The captures are held", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const groups = docs
      .slice(start + marker.length, end)
      .split(";")
      .map((group) => {
        const names = Array.from(
          group.matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g),
          (match) => match[1],
        );
        const role = names.at(-1);
        return { role, captures: names.slice(0, -1) };
      });

    const named = groups.flatMap((group) => group.captures);
    expect(new Set(named).size, "a capture is listed twice").toBe(named.length);

    const documented = Object.fromEntries(
      groups.flatMap(({ role, captures }) =>
        captures.map((capture) => [capture, role]),
      ),
    );
    expect(documented).toEqual({ ...nativeSyntaxRoles });

    const captures = Object.keys(nativeSyntaxRoles).length;
    expect(docs).toContain(`The ${captures} syntax capture colours`);
    expect(docs).toContain(`a ${captures}-capture syntax palette`);
    expect(readDoc("../../../COMPONENTS.md")).toContain(
      `the ${captures}-capture syntax palette`,
    );
  });

  it("maps every documented native field to the role the bridge reads", () => {
    const page = readDoc("../../../docs/tokens.md");
    const start = page.indexOf("| Native field | Role |");
    const end = page.indexOf("`nativeTextRoles` owns that table", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const rows = page
      .slice(start, end)
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .slice(2)
      .map((line) =>
        line
          .split("|")
          .map((cell) => cell.trim().replaceAll("`", ""))
          .filter((cell) => cell.length > 0),
      );

    expect(rows).toEqual<string[][]>([
      ["appearance", "theme.mode"],
      ...Object.entries(nativeTextRoles),
      ["fontSans", "typography.sans"],
      ["fontMono", "typography.mono"],
    ]);
  });
});
