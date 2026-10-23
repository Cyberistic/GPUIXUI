/**
 * Guards the native text-host seam.
 *
 * A GPUix `<input>`, `<textarea>` or `<code>` takes its palette through a
 * `theme` prop, not through the properties `styles.ts` resolves — and a host
 * given no theme layers on the runtime's **built-in dark theme** (the pinned
 * typings say so). Before this seam existed the components package's fields
 * passed no host theme, so their placeholder and caret were painted for a dark
 * surface in a light theme: a role the contrast table measures was skipped, and
 * the caret was a mark nobody checked.
 *
 * `nativeTextTheme` is the one place the answer lives, and it names the fill the
 * host's value and placeholder sit on, because the library's fields paint two:
 * `input` for a plain field, the page role for a composite one. The cases below
 * hold the mapping, the fill, the floors the roles must clear on that fill, and
 * the adoption both packages carry.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: the last cases read the
 * catalogue and the two packages' sources, and the package keeps zero runtime
 * dependencies by design.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blend, darkColors } from "./color.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { diffHostTheme } from "./native-diff.example.js";
import {
  nativeAccent,
  nativeAccentShares,
  nativeAccentSurfaces,
  nativeDiffWash,
  nativeFenceFill,
  nativeFenceHeaderFill,
  nativeFenceHeaderInk,
  nativeFenceInk,
  nativeTextFills,
  nativeTextTheme,
  type NativeTextFill,
} from "./native-text.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkSyntax,
  lightSyntax,
  syntaxColors,
  syntaxRoleFloors,
} from "./syntax.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themeModes,
  themes,
  type Theme,
} from "./theme.js";

/** Every theme the library ships: both base modes, both contrast variants, each platform and each authored look. */
const shipped = [
  { label: "light", theme: lightTheme },
  { label: "dark", theme: darkTheme },
  { label: "high-contrast light", theme: highContrastLightTheme },
  { label: "high-contrast dark", theme: highContrastDarkTheme },
  ...platformNames.flatMap((platform) =>
    themeModes.map((mode) => ({
      label: `${platform} ${mode}`,
      theme: platformTheme(themes[mode], platform),
    })),
  ),
  ...retroNames.flatMap((look) =>
    themeModes.map((mode) => ({
      label: `${look} ${mode}`,
      theme: retroTheme(themes[mode], look),
    })),
  ),
];

/**
 * The three surfaces a rendered document paints from the theme: inline code's
 * ink on its chip, the chip on the page, and a table rule. Each is measured on
 * the surface it is drawn on, so a brand that makes its chip the ink is reported
 * rather than silently painting one block.
 */
const documentPlacements = (theme: Theme) => {
  const host = nativeTextTheme(theme);
  const floors = contrastFloorsFor(theme);
  return [
    {
      claim: "inline code ink on its chip",
      ratio: contrastRatio(host.codeText, host.codeWash),
      floor: floors.body,
    },
    {
      claim: "inline code chip on the page",
      ratio: contrastRatio(host.codeWash, theme.colors.background),
      floor: decorativeFloor,
    },
    {
      claim: "table rule on the page",
      ratio: contrastRatio(host.border, theme.colors.background),
      floor: decorativeFloor,
    },
  ] satisfies ReadonlyArray<{
    claim: string;
    ratio: number | undefined;
    floor: number;
  }>;
};

describe("nativeTextTheme", () => {
  it("maps every role the host reads from the theme", () => {
    expect(nativeTextTheme(lightTheme)).toEqual({
      appearance: "light",
      bg: lightTheme.colors.input,
      text: lightTheme.colors.inputForeground,
      textMuted: lightTheme.colors.mutedForeground,
      textFaint: lightTheme.colors.placeholder,
      accent: nativeAccent(lightTheme),
      caret: lightTheme.colors.primary,
      fontSans: lightTheme.typography.sans,
      fontMono: lightTheme.typography.mono,
      metrics: {
        codeTextSize: lightTheme.typography.codeBlock.fontSize,
        codeLineHeight: lightTheme.typography.codeBlock.lineHeight,
        diffTextSize: lightTheme.typography.codeBlock.fontSize,
        diffLineHeight: lightTheme.typography.codeBlock.lineHeight,
        mdTextSize: lightTheme.typography.body.fontSize,
        mdLineHeight: lightTheme.typography.body.lineHeight,
        mdHeadingSizes: [
          lightTheme.typography.h1.fontSize,
          lightTheme.typography.h2.fontSize,
          lightTheme.typography.h3.fontSize,
          lightTheme.typography.body.fontSize,
        ],
        mdHeadingLineHeights: [
          lightTheme.typography.h1.lineHeight,
          lightTheme.typography.h2.lineHeight,
          lightTheme.typography.h3.lineHeight,
          lightTheme.typography.body.lineHeight,
        ],
        mdCodeRadius: lightTheme.radius.lg,
        mdCodeHeaderTextSize: lightTheme.typography.caption.fontSize,
        mdInlineCodeRadius: lightTheme.radius.sm,
        codeGutterPaddingRight: lightTheme.spacing.lg,
        diffRowPaddingX: lightTheme.spacing.xl,
        diffBodyBottomPad: lightTheme.spacing.md,
        mdBlockGap: lightTheme.spacing.lg,
        mdTableCellPadding: lightTheme.spacing.lg,
        mdCodePaddingX: lightTheme.spacing.lg,
        mdCodePaddingY: lightTheme.spacing.md,
        mdCodeHeaderPaddingY: lightTheme.spacing.xs,
      },
      diffAdd: lightTheme.colors.successSoftForeground,
      diffDel: lightTheme.colors.destructiveSoftForeground,
      diffHunkBg: lightTheme.colors.muted,
      textDim: lightTheme.colors.mutedForeground,
      codeText: lightTheme.colors.foreground,
      codeWash: lightTheme.colors.muted,
      border: lightTheme.colors.border,
      syntax: lightSyntax,
    });
  });

  it("carries the mode, so the host's own defaults do not fall back to dark", () => {
    expect(nativeTextTheme(darkTheme).appearance).toBe("dark");
    expect(nativeTextTheme(highContrastLightTheme).appearance).toBe("light");
    expect(nativeTextTheme(highContrastDarkTheme).appearance).toBe("dark");
    // The premise: the runtime's built-in default is the dark one. A host has
    // to be told which appearance to paint, not only which colours.
    expect(darkColors.background).not.toBe(lightTheme.colors.background);
  });

  it("names the fill its value and placeholder sit on", () => {
    const onInput = nativeTextTheme(lightTheme, "input");
    const onPage = nativeTextTheme(lightTheme, "background");

    expect(onPage.bg).toBe(lightTheme.colors.background);
    expect(onInput.bg).toBe(lightTheme.colors.input);
    expect(onPage.text).toBe(onInput.text);
    expect(onPage.textFaint).toBe(onInput.textFaint);
    // The fill is read, not decorative: the base theme's page and field whites
    // give the placeholder two different ratios.
    expect(contrastRatio(onPage.textFaint, onPage.bg)).not.toBeCloseTo(
      contrastRatio(onInput.textFaint, onInput.bg) ?? 0,
      2,
    );
  });

  it("names the two fills a field paints, and reads the one it is given", () => {
    expect(nativeTextFills).toEqual(["input", "background"]);
    nativeTextFills.forEach((fill: NativeTextFill) =>
      expect(nativeTextTheme(lightTheme, fill).bg).toBe(
        lightTheme.colors[fill],
      ),
    );
  });

  it("hands a brand's own values to the host", () => {
    const brand = {
      ...lightTheme,
      colors: {
        ...lightTheme.colors,
        placeholder: "#123456",
        primary: "#654321",
      },
      mode: "dark" as const,
    };
    const host = nativeTextTheme(brand, "background");
    expect(host.textFaint).toBe("#123456");
    expect(host.accent).toBe("#654321");
    expect(host.caret).toBe("#654321");
    expect(host.appearance).toBe("dark");
  });

  it("fills every key the runtime's theme object takes", () => {
    expect(Object.keys(nativeTextTheme(lightTheme)).toSorted()).toEqual([
      "accent",
      "appearance",
      "bg",
      "border",
      "caret",
      "codeText",
      "codeWash",
      "diffAdd",
      "diffDel",
      "diffHunkBg",
      "fontMono",
      "fontSans",
      "metrics",
      "syntax",
      "text",
      "textDim",
      "textFaint",
      "textMuted",
    ]);
  });

  it("gives the document hosts the scale's own type", () => {
    // A native host lays its rows out from the runtime theme's `metrics`, not
    // from a style property, so a seam that fills only the palette paints the
    // runtime's own numbers — 12.5/18 for a code block, 12/21 for a diff line,
    // 14/22 with 19/16/15/14 headings for a document — whatever the theme says.
    const host = nativeTextTheme(lightTheme);
    const { typography } = lightTheme;

    expect(host.metrics).toEqual({
      codeTextSize: typography.codeBlock.fontSize,
      codeLineHeight: typography.codeBlock.lineHeight,
      diffTextSize: typography.codeBlock.fontSize,
      diffLineHeight: typography.codeBlock.lineHeight,
      mdTextSize: typography.body.fontSize,
      mdLineHeight: typography.body.lineHeight,
      mdHeadingSizes: [
        typography.h1.fontSize,
        typography.h2.fontSize,
        typography.h3.fontSize,
        typography.body.fontSize,
      ],
      mdHeadingLineHeights: [
        typography.h1.lineHeight,
        typography.h2.lineHeight,
        typography.h3.lineHeight,
        typography.body.lineHeight,
      ],
      mdCodeRadius: lightTheme.radius.lg,
      mdCodeHeaderTextSize: typography.caption.fontSize,
      mdInlineCodeRadius: lightTheme.radius.sm,
      codeGutterPaddingRight: lightTheme.spacing.lg,
      diffRowPaddingX: lightTheme.spacing.xl,
      diffBodyBottomPad: lightTheme.spacing.md,
      mdBlockGap: lightTheme.spacing.lg,
      mdTableCellPadding: lightTheme.spacing.lg,
      mdCodePaddingX: lightTheme.spacing.lg,
      mdCodePaddingY: lightTheme.spacing.md,
      mdCodeHeaderPaddingY: lightTheme.spacing.xs,
    });

    const brand = extendTheme(lightTheme, {
      typography: {
        codeBlock: { fontSize: 14, lineHeight: 22 },
        body: { fontSize: 15, lineHeight: 23 },
        h1: { fontSize: 30, lineHeight: 38 },
      },
      radius: { lg: 10, sm: 3 },
    });
    const branded = nativeTextTheme(brand).metrics;
    expect(branded.codeTextSize).toBe(14);
    expect(branded.diffTextSize).toBe(14);
    expect(branded.mdTextSize).toBe(15);
    expect(branded.mdHeadingSizes[0]).toBe(30);
    expect(branded.mdHeadingLineHeights[0]).toBe(38);
    expect(branded.mdCodeRadius).toBe(10);
    expect(branded.mdInlineCodeRadius).toBe(3);

    // Every shipped style resolves its own scale: the four hosts read the same
    // roles, so one comparison per theme covers the metrics a fill cannot move.
    const drifted = shipped.flatMap(({ label, theme }) => {
      const { metrics } = nativeTextTheme(theme);
      const { typography } = theme;
      const wanted: ReadonlyArray<readonly [string, unknown, unknown]> = [
        ["codeTextSize", metrics.codeTextSize, typography.codeBlock.fontSize],
        [
          "codeLineHeight",
          metrics.codeLineHeight,
          typography.codeBlock.lineHeight,
        ],
        ["diffTextSize", metrics.diffTextSize, typography.codeBlock.fontSize],
        [
          "diffLineHeight",
          metrics.diffLineHeight,
          typography.codeBlock.lineHeight,
        ],
        ["mdTextSize", metrics.mdTextSize, typography.body.fontSize],
        ["mdLineHeight", metrics.mdLineHeight, typography.body.lineHeight],
        [
          "mdHeadingSizes",
          metrics.mdHeadingSizes.join(),
          [
            typography.h1.fontSize,
            typography.h2.fontSize,
            typography.h3.fontSize,
            typography.body.fontSize,
          ].join(),
        ],
        [
          "mdHeadingLineHeights",
          metrics.mdHeadingLineHeights.join(),
          [
            typography.h1.lineHeight,
            typography.h2.lineHeight,
            typography.h3.lineHeight,
            typography.body.lineHeight,
          ].join(),
        ],
        ["mdCodeRadius", metrics.mdCodeRadius, theme.radius.lg],
        [
          "mdCodeHeaderTextSize",
          metrics.mdCodeHeaderTextSize,
          typography.caption.fontSize,
        ],
        ["mdInlineCodeRadius", metrics.mdInlineCodeRadius, theme.radius.sm],
        [
          "codeGutterPaddingRight",
          metrics.codeGutterPaddingRight,
          theme.spacing.lg,
        ],
        ["diffRowPaddingX", metrics.diffRowPaddingX, theme.spacing.xl],
        ["diffBodyBottomPad", metrics.diffBodyBottomPad, theme.spacing.md],
        ["mdBlockGap", metrics.mdBlockGap, theme.spacing.lg],
        ["mdTableCellPadding", metrics.mdTableCellPadding, theme.spacing.lg],
        ["mdCodePaddingX", metrics.mdCodePaddingX, theme.spacing.lg],
        ["mdCodePaddingY", metrics.mdCodePaddingY, theme.spacing.md],
        [
          "mdCodeHeaderPaddingY",
          metrics.mdCodeHeaderPaddingY,
          theme.spacing.xs,
        ],
      ];
      return wanted
        .filter(([, actual, expected]) => actual !== expected)
        .map(
          ([name, actual, expected]) =>
            `${label} ${name}: ${actual} not ${expected}`,
        );
    });

    expect(drifted).toEqual([]);
  });

  it("paints inline code as prose in a chip, and a document's rules", () => {
    // A `<markdown>` host draws inline code in its own violet ink over a 10%
    // violet wash — a second syntax palette no token owns. The seam hands it the
    // page ink on the `muted` surface instead, which is the pair the contrast
    // table already measures at the body floor, and the table rule the `border`
    // role a divider is held to.
    const failures = shipped.flatMap(({ label, theme }) =>
      documentPlacements(theme)
        .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
        .map(
          ({ claim, ratio, floor }) =>
            `${label} ${claim}: ${ratio?.toFixed(2) ?? "unmeasurable"} < ${floor}`,
        ),
    );

    expect(failures).toEqual([]);

    // A brand whose chip is its own ink paints one block: the report names it.
    const flat = extendTheme(lightTheme, {
      colors: { muted: lightTheme.colors.foreground },
    });
    const reported = documentPlacements(flat)
      .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
      .map(({ claim }) => claim);

    expect(reported).toContain("inline code ink on its chip");
  });

  it("paints the value, placeholder and caret at their floors on every shipped theme and fill", () => {
    const failures = shipped.flatMap(({ label, theme }) => {
      const floors = contrastFloorsFor(theme);
      return nativeTextFills.flatMap((fill) => {
        const host = nativeTextTheme(theme, fill);
        const measured: ReadonlyArray<
          readonly [string, number | undefined, number]
        > = [
          ["value", contrastRatio(host.text, host.bg), floors.body],
          [
            "placeholder",
            contrastRatio(host.textFaint, host.bg),
            floors.secondary,
          ],
          ["caret", contrastRatio(host.caret, host.bg), floors.boundary],
        ];
        return measured
          .filter(([, ratio, floor]) => ratio === undefined || ratio < floor)
          .map(
            ([role, ratio, floor]) =>
              `${label} ${fill} ${role}: ${ratio?.toFixed(2) ?? "unmeasurable"} < ${floor}`,
          );
      });
    });

    expect(failures).toEqual([]);
    expect(shipped.length).toBe(18);
  });

  it("keeps the placeholder visibly fainter than secondary text", () => {
    // A placeholder is a hint, not a label; matching `mutedForeground` would
    // make an empty field read as a filled one.
    shipped.forEach(({ label, theme }) => {
      nativeTextFills.forEach((fill) => {
        const host = nativeTextTheme(theme, fill);
        const faint = contrastRatio(host.textFaint, host.bg) ?? 0;
        const secondary = contrastRatio(host.textMuted, host.bg) ?? 0;
        expect(faint, `${label} ${fill}`).toBeLessThan(secondary);
      });
    });
  });

  it("matches the shipped placeholder the palette moved for", () => {
    // The pair found Aero light's placeholder at 4.35:1 on its own window and
    // the inherited base value at 4.49:1 on macOS's, both under the 4.5:1 floor.
    const aero = retroTheme(lightTheme, "aero");
    const darwin = platformTheme(lightTheme, "darwin");
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(contrastRatio("#5F7181", aero.colors.background)).toBeCloseTo(
      4.35,
      2,
    );
    expect(contrastRatio("#66707F", darwin.colors.background)).toBeCloseTo(
      4.49,
      2,
    );
    // The page prints the tightest placement, computed here, so a palette edit
    // or a stale sentence fails by number — and by name, because which style is
    // tightest moves with the palette.
    const tightest = shipped
      .flatMap(({ theme }) =>
        nativeTextFills.map((fill) => {
          const host = nativeTextTheme(theme, fill);
          return {
            where: `${theme.name}'s placeholder on ${
              fill === "input" ? "its own field fill" : "the page role"
            }`,
            ratio:
              contrastRatio(host.textFaint, host.bg) ??
              Number.POSITIVE_INFINITY,
          };
        }),
      )
      .reduce((lowest, row) => (row.ratio < lowest.ratio ? row : lowest));

    expect(catalogue).toContain(
      `The tightest placement over both fills is ${tightest.where} at ${tightest.ratio.toFixed(2)}:1`,
    );
  });

  it("sizes a code card's language strip from the scale", () => {
    // A fence's language strip is a label over the block, and the runtime sizes
    // it from `md_code_header_text_size` — `11` at the pinned release
    // (`packages/native/src/theme.rs`) — which no role in the scale carries. A
    // seam that left it to the runtime painted a brand's code card header at a
    // size the brand never chose, while the block under it followed the scale.
    const metrics = nativeTextTheme(lightTheme).metrics;
    expect(metrics.mdCodeHeaderTextSize).toBe(
      lightTheme.typography.caption.fontSize,
    );
    expect(metrics.mdCodeHeaderTextSize).not.toBe(11);

    const rescaled = nativeTextTheme(
      extendTheme(lightTheme, {
        typography: { caption: { fontSize: 15, lineHeight: 19 } },
      }),
    ).metrics;
    expect(rescaled.mdCodeHeaderTextSize).toBe(15);
  });

  it("gives a document host's insets the spacing scale", () => {
    // A host's insets are padding, so they are the spacing scale's — the
    // runtime's own are Comet's numbers (`theme.rs`'s `Metrics`), and two of
    // them are not steps here at all, so a brand that retunes `spacing` grew the
    // component tree and left a rendered document at another rhythm. Every
    // inset is read against the theme's own steps rather than a literal.
    const insets = (theme: Theme) => {
      const { metrics } = nativeTextTheme(theme);
      return {
        codeGutterPaddingRight: metrics.codeGutterPaddingRight,
        diffRowPaddingX: metrics.diffRowPaddingX,
        diffBodyBottomPad: metrics.diffBodyBottomPad,
        mdBlockGap: metrics.mdBlockGap,
        mdTableCellPadding: metrics.mdTableCellPadding,
        mdCodePaddingX: metrics.mdCodePaddingX,
        mdCodePaddingY: metrics.mdCodePaddingY,
        mdCodeHeaderPaddingY: metrics.mdCodeHeaderPaddingY,
      };
    };

    const offScale = shipped.flatMap(({ label, theme }) => {
      const steps = Object.values(theme.spacing);
      return Object.entries(insets(theme))
        .filter(([, value]) => !steps.includes(value))
        .map(([name, value]) => `${label} ${name}: ${value} is not a step`);
    });

    expect(offScale).toEqual([]);

    // The inset is chosen, not one number for every surface: a language strip is
    // tighter than a code card's own padding, which is tighter than a diff row's.
    const base = insets(lightTheme);
    expect(base.mdCodeHeaderPaddingY).toBeLessThan(base.mdCodePaddingY);
    expect(base.mdCodePaddingY).toBeLessThan(base.mdCodePaddingX);
    expect(base.mdCodePaddingX).toBeLessThan(base.diffRowPaddingX);
  });

  it("moves a document's insets with the brand's spacing", () => {
    const insets = (theme: Theme) => {
      const { metrics } = nativeTextTheme(theme);
      return {
        codeGutterPaddingRight: metrics.codeGutterPaddingRight,
        diffRowPaddingX: metrics.diffRowPaddingX,
        diffBodyBottomPad: metrics.diffBodyBottomPad,
        mdBlockGap: metrics.mdBlockGap,
        mdTableCellPadding: metrics.mdTableCellPadding,
        mdCodePaddingX: metrics.mdCodePaddingX,
        mdCodePaddingY: metrics.mdCodePaddingY,
        mdCodeHeaderPaddingY: metrics.mdCodeHeaderPaddingY,
      };
    };

    // A brand that doubles every step moves every inset with it.
    const doubled = extendTheme(lightTheme, {
      spacing: {
        "2xs": lightTheme.spacing["2xs"] * 2,
        xs: lightTheme.spacing.xs * 2,
        sm: lightTheme.spacing.sm * 2,
        md: lightTheme.spacing.md * 2,
        lg: lightTheme.spacing.lg * 2,
        xl: lightTheme.spacing.xl * 2,
        "2xl": lightTheme.spacing["2xl"] * 2,
        "3xl": lightTheme.spacing["3xl"] * 2,
        "4xl": lightTheme.spacing["4xl"] * 2,
        "5xl": lightTheme.spacing["5xl"] * 2,
      },
    });
    const before = insets(lightTheme);
    const after = insets(doubled);
    expect(after).toEqual(
      Object.fromEntries(
        Object.entries(before).map(([name, value]) => [name, value * 2]),
      ),
    );

    // A brand that raises one step moves only the insets that read it, so the
    // mapping is a choice per surface rather than one shared number.
    const wider = insets(extendTheme(lightTheme, { spacing: { lg: 20 } }));
    expect(wider.mdCodePaddingX).toBe(20);
    expect(wider.mdTableCellPadding).toBe(20);
    expect(wider.mdBlockGap).toBe(20);
    expect(wider.codeGutterPaddingRight).toBe(20);
    expect(wider.mdCodePaddingY).toBe(before.mdCodePaddingY);
    expect(wider.mdCodeHeaderPaddingY).toBe(before.mdCodeHeaderPaddingY);
    expect(wider.diffRowPaddingX).toBe(before.diffRowPaddingX);
    expect(wider.diffBodyBottomPad).toBe(before.diffBodyBottomPad);
  });

  it("teaches the document host's insets, and retracts the padding it left out", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const readme = read("../README.md");
    const inventory = read("../../../COMPONENTS.md");

    [
      "| `metrics.mdBlockGap` / `mdTableCellPadding` | `spacing.lg` — a document's block gap / a cell's inset |",
      "| `metrics.mdCodePaddingX` / `mdCodePaddingY` | `spacing.lg` / `spacing.md` — a fence's own inset |",
      "| `metrics.mdCodeHeaderPaddingY` | `spacing.xs` — a fence's language strip |",
      "| `metrics.diffRowPaddingX` / `diffBodyBottomPad` | `spacing.xl` / `spacing.md` |",
      "| `metrics.codeGutterPaddingRight` | `spacing.lg` — the gutter's gap |",
    ].forEach((row) => expect(catalogue).toContain(row));

    // The retracted claim, on each surface that carried it: the paddings are a
    // spacing step, and only the row model is left to the runtime.
    expect(catalogue).not.toContain("a diff's paddings and accent bar");
    expect(catalogue).toContain("the block gap are not a row model");
    expect(readme).toContain("insets and gaps are the spacing scale's");
    expect(readme).not.toContain("gutter widths stay the runtime's");
    expect(inventory).toContain("insets and gaps are the spacing scale's");
    expect(inventory).not.toContain("diff paddings and table column minima");
  });

  it("teaches the code host's type, not only its palette", () => {
    // A `<code>` host is the one host whose type comes from the theme object, so
    // a reader has to know both what the seam fills in and why the runtime's own
    // number is not the library's scale.
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(catalogue).toContain(
      "| `metrics.codeTextSize` / `codeLineHeight` | `typography.codeBlock`'s size / leading |",
    );
    expect(catalogue).toContain(
      "| `metrics.mdCodeHeaderTextSize` | `typography.caption`'s size — a fence's language strip |",
    );
    expect(catalogue).toContain("its default is 12.5/18");
    expect(catalogue).toContain("syntax palette");
  });

  it("prints the type a window measured, not only the source read", () => {
    // The cases above hold what the seam hands a host. Whether a host *paints*
    // those numbers was a read of the pinned Rust source until the playground's
    // `document-type` probe measured it off a captured frame on 0.11.0 (11
    // checks). This page is the one that says the seam carries a document host's
    // type, so it has to carry the measurement: the probe's own record and the
    // page's table are compared row by row, and the theme pairs are derived from
    // the fixture, so a stale page number or a moved probe value fails.
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    const readme = readFileSync(
      new URL("../../../apps/playground/README.md", import.meta.url),
      "utf8",
    );
    const probe = readFileSync(
      new URL(
        "../../../apps/playground/src/live/document-type.ts",
        import.meta.url,
      ),
      "utf8",
    );

    const constant = (name: string): number =>
      Number(
        new RegExp(`export const ${name} = ([\\d.]+)`).exec(probe)?.[1] ??
          Number.NaN,
      );

    const codeSize = constant("CODE_SIZE");
    const codeLeading = constant("CODE_LEADING");
    const captionSize = constant("CAPTION_SIZE");
    const runtimeCodeSize = constant("RUNTIME_CODE_SIZE");
    const runtimeCodeLeading = constant("RUNTIME_CODE_LEADING");
    const runtimeDiffLeading = constant("RUNTIME_DIFF_LEADING");
    const runtimeHeaderSize = constant("RUNTIME_HEADER_SIZE");
    const checks = constant("DOCUMENT_TYPE_CHECKS");

    // The pairs the page opens with, read off the fixture rather than retyped.
    expect(catalogue).toContain("### The type a window measured");
    expect(catalogue).toContain(`${codeSize}/${codeLeading}`);
    expect(catalogue).toContain(`${runtimeCodeSize}/${runtimeCodeLeading}`);
    expect(catalogue).toContain(
      `the caption **${captionSize}** against ${runtimeHeaderSize}`,
    );
    expect(catalogue).toContain(`${checks} checks`);
    expect(readme).toContain(`${checks} checks`);

    // The four rows are the probe's record; the page cites it with the same
    // numbers, in the same order. A palette or font move that changes a band
    // fails here instead of leaving the sentence true of nothing.
    const rows = [
      "| `<code>`, themed |",
      "| `<code>`, no theme |",
      "| `<diff>`, themed vs plain |",
      "| `<markdown>` strip, themed |",
    ];
    const numbersIn = (text: string, prefix: string): ReadonlyArray<string> =>
      (text.split("\n").find((line) => line.startsWith(prefix)) ?? "").match(
        /\d+(?:\.\d+)?/g,
      ) ?? [];

    rows.forEach((prefix) => {
      expect(numbersIn(catalogue, prefix), prefix).toEqual(
        numbersIn(readme, prefix),
      );
    });

    // The two leading gains are arithmetic, not measurements.
    expect(catalogue).toContain(
      `${4 * (codeLeading - runtimeDiffLeading)}** taller`,
    );
    expect(catalogue).toContain(`${2 * codeLeading} tall`);
    expect(catalogue).toContain(`${2 * runtimeCodeLeading} tall`);

    // The honest half: the host, the scale and the antialias slack.
    expect(catalogue).toContain("macOS at scale 2");
    expect(catalogue).toContain("one-row antialias slack");
  });

  it("teaches that a field's value is the element's colour, not the object's text", () => {
    // The bug this holds: this page and the seam's own snippet showed
    // `<input theme={nativeTextTheme(theme)} />` and said the object carries the
    // value. At the pinned `@gpuix/native@0.11.0` an `<input>`/`<textarea>`
    // paints its value from the element's `style.color`
    // (`custom_elements/input.rs`), so `text` never reaches a field: the
    // playground's `field-ink` probe typed into a host given only the seam and
    // its brightest pixel was the field's **47.5** border luminance — darker than
    // its own fill — while the same host with `color: inputForeground` peaked at
    // **240.7**, the ink's own. Following the page shipped a near-black value on
    // a dark fill.
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const seam = readFileSync(
      new URL("./native-text.ts", import.meta.url),
      "utf8",
    );

    expect(catalogue).toContain("### What a field's value actually paints");
    expect(catalogue).toContain(
      "paints its value from the element's `style.color`",
    );
    expect(catalogue).toContain("color: theme.colors.inputForeground");
    expect(catalogue).toContain("47.5");
    expect(catalogue).toContain("240.7");
    // The seam's own example is what a consumer copies, so it carries the role
    // too, and its `text` field says which hosts read it.
    expect(seam).toContain("color: theme.colors.inputForeground");
    expect(seam).toContain("paints its value from the element's");
  });
});

/**
 * A `<diff>` host paints its own colours unless the theme object carries them:
 * at `@gpuix/native@0.11.0` an added line's ink and the 5.5% wash under it are
 * one field (`diffAdd`), a removed line's the other, a hunk header a fill and
 * its file path the dim chrome role. So one value does two jobs, and the
 * contract has to measure both: the ink as text, and the wash it derives as a
 * surface — an ink that matches the pane erases the line, and a wash that
 * matches the pane hides that the line changed at all.
 */
describe("the diff host's colours", () => {
  /** The wash the runtime paints under a changed line: its own ink at 5.5%. */
  const rowWash = (ink: string, fill: string) =>
    blend(ink, fill, 1 - nativeDiffWash);

  /** Every placement the diff contract measures, with the ratio and floor. */
  const placements = (theme: Theme) =>
    nativeTextFills.flatMap((fill) => {
      const host = nativeTextTheme(theme, fill);
      const floors = contrastFloorsFor(theme);
      const wash = (ink: string) => rowWash(ink, host.bg);
      return [
        {
          claim: `added ink on ${fill}`,
          ratio: contrastRatio(host.diffAdd, host.bg),
          floor: floors.body,
        },
        {
          claim: `added ink on its row wash over ${fill}`,
          ratio: contrastRatio(host.diffAdd, wash(host.diffAdd)),
          floor: floors.body,
        },
        {
          claim: `added row wash on ${fill}`,
          ratio: contrastRatio(wash(host.diffAdd), host.bg),
          floor: decorativeFloor,
        },
        {
          claim: `removed ink on ${fill}`,
          ratio: contrastRatio(host.diffDel, host.bg),
          floor: floors.body,
        },
        {
          claim: `removed ink on its row wash over ${fill}`,
          ratio: contrastRatio(host.diffDel, wash(host.diffDel)),
          floor: floors.body,
        },
        {
          claim: `removed row wash on ${fill}`,
          ratio: contrastRatio(wash(host.diffDel), host.bg),
          floor: decorativeFloor,
        },
        {
          claim: `hunk stripe on ${fill}`,
          ratio: contrastRatio(host.diffHunkBg, host.bg),
          floor: decorativeFloor,
        },
        {
          claim: `faint text on the hunk stripe over ${fill}`,
          ratio: contrastRatio(host.textFaint, host.diffHunkBg),
          floor: floors.secondary,
        },
        {
          claim: `file path on ${fill}`,
          ratio: contrastRatio(host.textDim, host.bg),
          floor: floors.secondary,
        },
      ];
    });

  it("holds the runtime's own wash share", () => {
    // The share is the runtime's, not a design choice: a `<diff>` row tints
    // itself 0.055 of its ink over the fill (`custom_elements/diff.rs` at the
    // pinned release), so the contract measures the wash it actually paints.
    expect(nativeDiffWash).toBe(0.055);
  });

  it("keeps the ink readable on the fill and on the wash it derives", () => {
    const failures = shipped.flatMap(({ label, theme }) =>
      placements(theme)
        .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
        .map(
          ({ claim, ratio, floor }) =>
            `${label} ${claim}: ${ratio?.toFixed(2) ?? "unmeasurable"} < ${floor}`,
        ),
    );

    expect(failures).toEqual([]);
    expect(shipped.length).toBe(18);
  });

  it("lets the tone's readable role carry the ink, not its solid fill", () => {
    // The premise: a status *fill* is designed to carry its own on-colour, not
    // to be read on the page. Light `success` measures 4.26:1 there, under the
    // secondary floor a 11px count needs, while the tone's readable role clears
    // the body floor by a wide margin.
    expect(
      contrastRatio(lightTheme.colors.success, lightTheme.colors.background),
    ).toBeCloseTo(4.26, 2);
    expect(
      contrastRatio(
        lightTheme.colors.successSoftForeground,
        lightTheme.colors.background,
      ),
    ).toBeCloseTo(11.98, 2);
    expect(nativeTextTheme(lightTheme).diffAdd).toBe(
      lightTheme.colors.successSoftForeground,
    );
    expect(nativeTextTheme(lightTheme).diffDel).toBe(
      lightTheme.colors.destructiveSoftForeground,
    );
  });

  it("found the faint role without room on a chrome stripe", () => {
    // The hunk header's text is the runtime's `text_faint`, so the faint role
    // sits on the `muted` stripe it paints, not only on the page it sits on.
    // Measured before the fix: the dark base's placeholder on its own toolbar,
    // and every light style's on the platform toolbars and the two looks.
    expect(contrastRatio("#7C8595", darkTheme.colors.muted)).toBeCloseTo(
      4.29,
      2,
    );
    expect(
      contrastRatio(
        "#626C7B",
        platformTheme(lightTheme, "darwin").colors.muted,
      ),
    ).toBeCloseTo(4.4, 2);
    expect(
      contrastRatio("#5C6470", retroTheme(lightTheme, "luna").colors.muted),
    ).toBeCloseTo(4.35, 2);
    expect(
      contrastRatio("#5B6C7B", retroTheme(lightTheme, "aero").colors.muted),
    ).toBeCloseTo(4.37, 2);
  });

  it("reports a brand whose diff ink is its own pane", () => {
    const brand = extendTheme(lightTheme, {
      colors: { successSoftForeground: lightTheme.colors.background },
    });
    const reported = placements(brand)
      .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
      .map(({ claim }) => claim);

    expect(reported).toContain("added ink on input");
    expect(reported).toContain("added ink on its row wash over background");
  });

  it("reports faint text painted in the stripe it sits on", () => {
    const brand = extendTheme(lightTheme, {
      colors: { placeholder: lightTheme.colors.muted },
    });
    const reported = placements(brand)
      .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
      .map(({ claim }) => claim);

    expect(reported.filter((claim) => claim.includes("hunk stripe"))).toEqual(
      expect.arrayContaining([
        "faint text on the hunk stripe over input",
        "faint text on the hunk stripe over background",
      ]),
    );
  });

  it("executes the documented diff host", () => {
    const resolved = diffHostTheme(lightTheme);

    expect(resolved.host).toEqual(nativeTextTheme(lightTheme, "background"));
    expect(resolved.hunk.backgroundColor).toBe(lightTheme.colors.muted);
    expect(resolved.hunk.color).toBe(lightTheme.colors.placeholder);
    expect(resolved.filePath.color).toBe(lightTheme.colors.mutedForeground);
    expect(resolved.counts.added.color).toBe(
      lightTheme.colors.successSoftForeground,
    );
    expect(resolved.counts.removed.color).toBe(
      lightTheme.colors.destructiveSoftForeground,
    );
  });

  it("teaches the diff mapping and the placeholder the runtime fixes", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const seam = readFileSync(
      new URL("./native-text.ts", import.meta.url),
      "utf8",
    );

    // The page names the share the contract composites and the roles the host
    // takes, so a reader can build the same check for a brand.
    expect(catalogue).toContain("### The diff host");
    expect(catalogue).toContain("`nativeDiffWash` (0.055)");
    expect(catalogue).toContain("`diffHunkBg`");
    // The document host: a rendered document's type and its chip both come from
    // the theme, and the page says which numbers still do not.
    expect(catalogue).toContain("### The document host");
    expect(catalogue).toContain("prose in a chip");
    expect(catalogue).toContain("`diffTextSize`");
    // The syntax palette is the package's now: the page says so, and the old
    // "not filled" claim would send a reader to the runtime's own dark table.
    expect(catalogue).toContain("syntax palette is this package's");
    expect(catalogue).not.toContain("is not filled by `nativeTextTheme`");
    // The placeholder is fixed by the runtime, so the seam and the page must say
    // so instead of promising a role the host never reads.
    expect(seam).toContain("#8F8F8F");
    expect(catalogue).toContain("`#8F8F8F`");
    expect(catalogue).toContain("2.84:1");
    expect(catalogue).not.toContain(
      "host.textFaint; // placeholder host.caret",
    );
  });
});

/**
 * The seam is only worth its mapping if the hosts actually take it. Both
 * packages carry it now: the primitives re-export the functions rather than
 * copying them, and every components host passes the theme and names the fill it
 * paints. The catalogue used to say the components' fields "pass no host theme
 * at all", which would have sent a reader to fix a defect that was already
 * closed, so the page is held to the sources here.
 */
describe("the adoption both packages carry", () => {
  const componentsDir = new URL("../../components/src/", import.meta.url);
  const sources = readdirSync(componentsDir)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => ({
      file,
      text: readFileSync(new URL(file, componentsDir), "utf8"),
    }));

  it("gives every components host the theme and the fill its value sits on", () => {
    const hosts = sources.filter(({ text }) =>
      /<(input|textarea|code)[\s>]/.test(text),
    );

    // A rule that finds no host would pass by measuring nothing.
    expect(hosts.length).toBeGreaterThanOrEqual(9);
    const missing = hosts
      .filter(({ text }) => !text.includes("nativeTextTheme("))
      .map(({ file }) => file);

    expect(missing).toEqual([]);
  });

  it("names one of the two fills at every call site", () => {
    // The pattern is built rather than written as a literal: `scripts/check-tests.ts`
    // walks a regex written mid-expression into the code after it and reports the
    // whole test as assertionless.
    const call = new RegExp("nativeTextTheme\\(([^)]*)\\)", "g");
    const quoted = new RegExp('"(\\w+)"');
    const named = sources.flatMap(({ file, text }) =>
      [...text.matchAll(call)].map((match) => ({
        file,
        fill: quoted.exec(match[1] ?? "")?.[1],
      })),
    );
    const unknown = named.filter(
      ({ fill }) =>
        fill !== undefined && !nativeTextFills.some((known) => known === fill),
    );

    expect(named.length).toBeGreaterThanOrEqual(10);
    expect(unknown).toEqual([]);
  });

  it("re-exports the seam from the primitives instead of copying it", () => {
    const primitives = readFileSync(
      new URL("../../primitives/src/core/style.ts", import.meta.url),
      "utf8",
    );

    expect(primitives).toContain("nativeTextTheme");
    expect(primitives).toContain("nativeTextFills");
    // A local re-implementation would be the duplication the boundaries forbid.
    expect(primitives).not.toMatch(/function nativeTextTheme/);
  });

  it("teaches both halves on the catalogue, and retracts the stale one", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(catalogue).toContain("Both packages carry the seam");
    expect(catalogue).toContain("`ComboboxInput`");
    expect(catalogue).not.toContain(
      "the components package's fields pass no host theme",
    );
  });

  it("paints the hint instead of handing the host one", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const seam = readFileSync(
      new URL("../../primitives/src/components/hint.tsx", import.meta.url),
      "utf8",
    );

    // The page taught an owed adoption ("the fields pass the host's placeholder
    // today") after every hinted host had moved to the painted seam.
    expect(catalogue).toContain("render the hint through the published");
    expect(catalogue).toContain("`fieldHint`/`renderFieldHint`");
    expect(catalogue).not.toContain(
      "The components package's fields pass the host's",
    );
    expect(catalogue).not.toContain("adopting the painted hint is recorded");

    // The seam is the paint the page names, and every host that takes a
    // placeholder paints through it — bare of the exceptions the page records.
    expect(seam).toContain("export const fieldHint");
    const hinted = sources.filter(
      ({ text }) =>
        /<(input|textarea)[\s>]/.test(text) && text.includes("placeholder"),
    );

    expect(hinted.length).toBeGreaterThanOrEqual(7);
    expect(
      hinted
        .filter(({ file }) => file !== "inline-edit.tsx")
        .filter(({ text }) => !text.includes("fieldHint("))
        .map(({ file }) => file),
    ).toEqual([]);
    expect(catalogue).toContain("`InlineEdit`");
    expect(catalogue).toContain("`ColorPicker`'s hex field is never empty");
  });
});

/**
 * Guards the accent a **document** host paints its own marks in. The runtime
 * draws an ordered list's number and a bullet as `opacity(accent, 0.85)`, a
 * block quote's rail as `0.6` and the wash behind its copy as `0.05`
 * (`packages/native/src/markdown/render.rs` at the pinned release), so the role
 * is read through the composite rather than as a solid mark — and the fill role
 * is not readable there. Measured over the sixteen shipped styles, `primary` at
 * the marker share lands under the 4.5:1 label floor in every light style (the
 * tightest, Windows XP (Luna) light on `muted`, is 3.09:1) while the same role
 * as a solid mark clears the 3:1 floor that the mark contract measures.
 */
describe("the accent a document host paints", () => {
  it("holds a list number and a bullet to the label floor on every fill", () => {
    const under = shipped.flatMap(({ label, theme }) => {
      const floors = contrastFloorsFor(theme);
      // Read the seam, not the helper: the host is handed `accent`.
      const accent = nativeTextTheme(theme).accent;
      return nativeAccentSurfaces.flatMap((surface) => {
        const fill = theme.colors[surface];
        const marker = blend(fill, accent, nativeAccentShares.marker);
        const rail = blend(fill, accent, nativeAccentShares.rail);
        const checks: ReadonlyArray<
          readonly [string, number | undefined, number]
        > = [
          [
            `${label} marker on ${surface}`,
            contrastRatio(marker, fill),
            floors.secondary,
          ],
          [
            `${label} rail on ${surface}`,
            contrastRatio(rail, fill),
            decorativeFloor,
          ],
        ];
        return checks
          .filter(([, ratio, floor]) => ratio === undefined || ratio < floor)
          .map(([name, ratio, floor]) => `${name}: ${ratio} (needs ${floor})`);
      });
    });

    expect(under).toEqual([]);
    // Every style resolves, and the derivation returns an opaque colour.
    expect(
      shipped.every(
        ({ theme }) => !nativeAccent(theme).includes("#") === false,
      ),
    ).toBe(true);
    expect(
      shipped.filter(
        ({ theme }) => nativeAccent(theme) === theme.colors.primary,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("steps only the fills the marker share leaves under the floor", () => {
    const measured = shipped.map(({ label, theme }) => {
      const floors = contrastFloorsFor(theme);
      // The derivation answers the least readable strip, so the premise is the
      // worst of them rather than the page alone.
      const worst = nativeAccentSurfaces.reduce((low, surface) => {
        const fill = theme.colors[surface];
        const ratio = contrastRatio(
          blend(fill, theme.colors.primary, nativeAccentShares.marker),
          fill,
        );
        return ratio === undefined ? low : Math.min(low, ratio);
      }, Number.POSITIVE_INFINITY);
      return {
        label,
        stepped: nativeTextTheme(theme).accent !== theme.colors.primary,
        worst: worst.toFixed(2),
        floor: floors.secondary,
      };
    });
    const under = measured.filter(({ worst, floor }) => Number(worst) < floor);
    const over = measured.filter(({ worst, floor }) => Number(worst) >= floor);

    // The derivation is the exception, not a repaint: every style the fill role
    // cannot carry steps, and every style it can carry keeps the brand.
    expect(
      under.filter(({ stepped }) => !stepped).map(({ label }) => label),
    ).toEqual([]);
    expect(
      over
        .filter(({ stepped }) => stepped)
        .map(({ label, worst }) => `${label} ${worst}`),
    ).toEqual([]);
    // Eleven of the eighteen styles cannot carry it — every light one, and the two
    // dark platform rows whose accent is a light blue on a near-black page.
    expect(under.map(({ label, worst }) => `${label} ${worst}`)).toEqual([
      "light 4.00",
      "high-contrast light 6.54",
      "darwin light 3.37",
      "darwin dark 3.97",
      "linux light 3.36",
      "linux dark 4.10",
      "win32 light 3.13",
      "default light 4.00",
      "luna light 3.09",
      "aero light 3.34",
      "omarchy light 3.90",
    ]);

    // The seam's own JSDoc prints the same set and share, so a style that joins
    // it cannot leave the documentation teaching the previous count.
    const seam = readFileSync(
      new URL("./native-text.ts", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(seam).toContain(`Measured over the ${shipped.length} shipped,`);
    expect(seam).toContain(`in **${under.length} of them**`);
  });

  it("keeps the caret a mark on the field, not the document's label", () => {
    // A caret is drawn solid on the field's own fill and held to the 3:1 mark
    // floor, so it stays the fill role: stepping it would dull the one colour a
    // reader tracks while typing.
    expect(nativeTextTheme(lightTheme).caret).toBe(lightTheme.colors.primary);
    expect(nativeTextTheme(lightTheme).accent).not.toBe(
      lightTheme.colors.primary,
    );
  });

  it("states the shares it derives against on the catalogue", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(catalogue).toContain("nativeAccent");
    expect(catalogue).toContain(`${nativeAccentShares.marker * 100}%`);
    expect(catalogue).toContain(`${nativeAccentShares.rail * 100}%`);
    expect(catalogue).toContain("3.09");
  });
});

/**
 * Guards the fill a **fenced code block** paints inside a rendered document.
 *
 * The syntax contract measures a token on the two fills a caller can hand a
 * host (`syntaxSurfaces`), but a `<markdown>` host's fence is a surface of its
 * own: the runtime lays `0.035` of a neutral ink over the document's fill
 * (`packages/native/src/markdown/render.rs` at the pinned
 * `@gpuix/native@0.11.0`) and another `0.02` under the language strip. Nothing
 * named that composite, so a token that cleared the page could miss its floor on
 * the fence the same theme paints — and the dark `keyword` did, in macOS, Linux
 * and Windows dark.
 */
describe("the fence a document host paints", () => {
  /** Every token and the language label on the fence, with the ratio and floor. */
  const fencePlacements = (theme: Theme) =>
    nativeTextFills.flatMap((fill) => {
      const fence = nativeFenceFill(theme.colors[fill]);
      const strip = nativeFenceHeaderFill(theme.colors[fill]);
      const floors = contrastFloorsFor(theme);
      const tokens = Object.entries(syntaxColors(theme)).map(
        ([role, colour]) => ({
          claim: `${role} on the fence over ${fill}`,
          ratio: fence === undefined ? undefined : contrastRatio(colour, fence),
          floor:
            floors[syntaxRoleFloors[role as keyof typeof syntaxRoleFloors]],
        }),
      );
      return [
        ...tokens,
        {
          claim: `language label on the strip over ${fill}`,
          ratio:
            strip === undefined
              ? undefined
              : contrastRatio(theme.colors.mutedForeground, strip),
          floor: floors.secondary,
        },
      ];
    });

  it("holds the runtime's own shares and composites them over the fill", () => {
    expect(nativeFenceInk).toBe(0.035);
    expect(nativeFenceHeaderInk).toBe(0.02);
    // The ink is neutral and its direction is the host's own `bg` lightness: a
    // light fill takes black, a dark one white.
    expect(nativeFenceFill(lightTheme.colors.background)).toBe(
      blend(lightTheme.colors.background, "#000000", nativeFenceInk),
    );
    expect(nativeFenceFill(darkTheme.colors.background)).toBe(
      blend(darkTheme.colors.background, "#FFFFFF", nativeFenceInk),
    );
    // The strip is a second wash over the block, not over the page.
    const body = nativeFenceFill(lightTheme.colors.background);
    expect(nativeFenceHeaderFill(lightTheme.colors.background)).toBe(
      blend(body ?? "", "#000000", nativeFenceHeaderInk),
    );
    // A value the contract cannot measure is answered with absence, the rule
    // every derived colour in this package follows.
    expect(nativeFenceFill("oklch(0.5 0.1 250)")).toBeUndefined();
    expect(nativeFenceHeaderFill("oklch(0.5 0.1 250)")).toBeUndefined();
  });

  it("keeps every token and the language label readable on the fence", () => {
    const failures = shipped.flatMap(({ label, theme }) =>
      fencePlacements(theme)
        .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
        .map(
          ({ claim, ratio, floor }) =>
            `${label} ${claim}: ${ratio?.toFixed(2) ?? "unmeasurable"} < ${floor}`,
        ),
    );

    expect(failures).toEqual([]);
    // 18 styles × 2 fills × (24 tokens + the strip's label): a sweep that
    // measured nothing would otherwise pass.
    expect(shipped.length * nativeTextFills.length * 25).toBe(900);

    // The tightest is the smallest margin over its own floor: the comment sits
    // at a lower ratio but answers the secondary floor.
    const cells = shipped.flatMap(({ label, theme }) =>
      fencePlacements(theme).map((placement) => ({
        label,
        ...placement,
        margin: (placement.ratio ?? 0) - placement.floor,
      })),
    );
    const low = cells.reduce((worst, cell) =>
      cell.margin < worst.margin ? cell : worst,
    );

    expect([low.label, low.claim, Number((low.ratio ?? 0).toFixed(2))]).toEqual(
      ["linux dark", "macroName on the fence over background", 7.07],
    );
  });

  it("found the dark keyword without room on the fence", () => {
    // The identity's dark keyword cleared the page in every style and missed the
    // body floor on the fence the three platform styles paint — a page lighter
    // than the base theme's is what lifts it.
    const identity = darkSyntax.keyword;
    const place = (theme: Theme, fill: NativeTextFill, colour: string) => {
      const fence = nativeFenceFill(theme.colors[fill]);
      return contrastRatio(colour, fence);
    };
    const linuxDark = platformTheme(themes.dark, "linux");
    const windowsDark = platformTheme(themes.dark, "win32");
    const macOSDark = platformTheme(themes.dark, "darwin");

    expect(place(linuxDark, "background", identity)).toBeCloseTo(6.49, 2);
    expect(place(linuxDark, "input", identity)).toBeCloseTo(6.76, 2);
    expect(place(windowsDark, "background", identity)).toBeCloseTo(6.85, 2);
    expect(place(windowsDark, "input", identity)).toBeCloseTo(6.94, 2);
    expect(place(macOSDark, "input", identity)).toBeCloseTo(6.92, 2);
    // Each of them clears its own page, so only the fence placement sees it.
    for (const style of [linuxDark, windowsDark, macOSDark]) {
      expect(
        contrastRatio(identity, style.colors.background),
      ).toBeGreaterThanOrEqual(contrastFloorsFor(style).body);
    }
    // A style that repaints the page owns the table for it: the three platforms
    // carry the smallest 2% step toward white, and the identity keeps its own.
    for (const theme of [linuxDark, windowsDark, macOSDark]) {
      expect(syntaxColors(theme).keyword).toBe("#B0B2FF");
    }
    expect(darkSyntax.keyword).toBe(identity);
    expect(syntaxColors(darkTheme).keyword).toBe(identity);
    // Every dark style clears the fence now.
    const dark = shipped.filter(({ theme }) => theme.mode === "dark");
    const under = dark.flatMap(({ label, theme }) =>
      nativeTextFills
        .map((fill) => ({
          label,
          ratio: contrastRatio(
            syntaxColors(theme).keyword,
            nativeFenceFill(theme.colors[fill]),
          ),
        }))
        .filter(
          ({ ratio }) =>
            ratio === undefined || ratio < contrastFloorsFor(theme).body,
        ),
    );

    expect(under).toEqual([]);
  });

  it("reports a brand whose page lifts the fence under its keyword", () => {
    // A brand owns the page the fence is drawn over, so the contract is about
    // the composite and not about the shipped palettes: this page is light
    // enough to lift the fence past the token that clears the base theme's.
    const brand = extendTheme(darkTheme, {
      colors: { background: "#1C1F26" },
    });
    const fence = nativeFenceFill(brand.colors.background);
    const failures = fencePlacements(brand).filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );

    expect(failures.map(({ claim }) => claim)).toContain(
      "keyword on the fence over background",
    );
    // The same token clears the page it was measured on before, so only the
    // fence placement sees this.
    expect(
      contrastRatio(syntaxColors(brand).keyword, brand.colors.background),
    ).toBeGreaterThanOrEqual(contrastFloorsFor(brand).body);
    expect(fence).not.toBeUndefined();
  });

  it("measures the strip as a wash the rule carries, not a boundary", () => {
    const strips = shipped.flatMap(({ label, theme }) =>
      nativeTextFills.map((fill) => ({
        label,
        fill,
        ratio: contrastRatio(
          nativeFenceHeaderFill(theme.colors[fill]),
          nativeFenceFill(theme.colors[fill]),
        ),
        overPage: contrastRatio(
          nativeFenceFill(theme.colors[fill]),
          theme.colors[fill],
        ),
      })),
    );
    const low = strips.reduce((worst, cell) =>
      (cell.ratio ?? 1) < (worst.ratio ?? 1) ? cell : worst,
    );
    const hidden = strips.filter(({ ratio }) => (ratio ?? 0) < decorativeFloor);

    // Two washes three points apart are not a boundary, and the runtime does not
    // ask them to be: the rule under the strip and around the block is. The
    // number is recorded so a page cannot claim the fill divides anything.
    expect(hidden.length).toBeGreaterThan(0);
    expect([low.label, low.fill, Number((low.ratio ?? 0).toFixed(3))]).toEqual([
      "high-contrast dark",
      "background",
      1.031,
    ]);
    // The fence itself *is* a surface: every style's block is perceivable
    // against the page it sits on.
    expect(
      strips.filter(({ overPage }) => (overPage ?? 0) < decorativeFloor),
    ).toEqual([]);
  });

  it("states the fence on the catalogue, the design system and the inventory", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const design = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const inventory = readFileSync(
      new URL("../../../COMPONENTS.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const readme = readFileSync(
      new URL("../README.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    // The shares and the composite, so a reader can build the same check.
    expect(catalogue).toContain("### The fence a document paints");
    expect(catalogue).toContain("`nativeFenceInk` (0.035)");
    expect(catalogue).toContain("`nativeFenceFill(fill)`");
    expect(catalogue).toContain("6.49:1");
    // The strip is a wash the rule carries, and the page says so rather than
    // counting it as a boundary.
    expect(catalogue).toContain("1.031:1");
    expect(design).toContain("fence");
    expect(design).toContain("7.66:1");
    expect(inventory).toContain("nativeFenceFill");
    expect(readme).toContain("nativeFenceFill");
  });

  it("prints the fence the window measured, not only the source read", () => {
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const design = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const inventory = readFileSync(
      new URL("../../../COMPONENTS.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const record = readFileSync(
      new URL("../../../apps/playground/README.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const probe = readFileSync(
      new URL(
        "../../../apps/playground/src/live/markdown-fence.ts",
        import.meta.url,
      ),
      "utf8",
    );

    const checks = /MARKDOWN_FENCE_CHECKS = (\d+)/.exec(probe)?.[1];
    expect(checks).toBeDefined();
    expect(page).toContain(`(**${checks}** checks)`);

    // Every paint the two themed blocks own, derived from the seam the probe
    // paints through: a palette or wash change moves the page with it.
    const macOSDark = platformTheme(themes.dark, "darwin");
    const paints = [themes.dark, macOSDark].flatMap((theme) =>
      [
        theme.colors.background,
        nativeFenceFill(theme.colors.background),
        nativeFenceHeaderFill(theme.colors.background),
        syntaxColors(theme).keyword,
      ].filter((colour): colour is string => colour !== undefined),
    );
    expect(paints.length).toBe(8);
    paints.forEach((colour) => {
      expect(page).toContain(colour);
      expect(record).toContain(colour);
    });

    // The printed rows are the record's rows: the block's page, body, strip and
    // keyword, and the pixel counts a window counted. The section is sliced so
    // an unrelated table's `base dark` cell cannot answer for it.
    const start = page.indexOf("What a window measured");
    const section = page.slice(start, page.indexOf("### What a field", start));
    const row = (text: string, block: string) => {
      const found =
        new RegExp(`\\| ${block} \\|([^|]*\\|){3}[^|]*\\|`).exec(text)?.[0] ??
        "";
      return {
        hexes: found.match(/#[0-9A-F]{6}/g) ?? [],
        counts: found.match(/\*\*[\d ]+\*\* px/g) ?? [],
      };
    };
    ["base dark", "macOS dark"].forEach((block) => {
      expect(row(section, block)).toEqual(row(record, block));
      expect(row(section, block).hexes.length).toBe(4);
      expect(row(section, block).counts.length).toBe(3);
    });

    // The unthemed control is what keeps a missing handover visible.
    expect(record).toContain("`#8F96ED`");
    expect(page).toContain("`#8F96ED` (**988** px)");

    // The rule a consumer needs, where they read it.
    const rule = "a fence composites over the fill behind the host";
    expect(page).toContain(rule);
    expect(page).toContain("nativeFenceFill(card)");
    expect(design).toContain(rule);
    expect(design).toContain("nativeFenceFill(card)");
    expect(inventory).toContain(rule);
    expect(inventory).toContain("nativeFenceFill(card)");
    expect(page).toContain("markdown-fence");
  });
});
