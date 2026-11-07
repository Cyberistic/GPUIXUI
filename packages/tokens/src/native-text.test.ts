import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import {
  blend,
  colorRoles,
  darkColors,
  invalidColorRoles,
  type ThemeColors,
} from "./color.js";
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
  type NativeTextSource,
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

const ones = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;
const tens = ["", "", "twenty", "thirty", "forty"] as const;

const spelled = (count: number): string =>
  count < 20
    ? (ones[count] ?? String(count))
    : count % 10 === 0
      ? (tens[Math.floor(count / 10)] ?? String(count))
      : `${tens[Math.floor(count / 10)] ?? ""}-${ones[count % 10] ?? ""}`;

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

    expect(darkColors.background).not.toBe(lightTheme.colors.background);
  });

  it("reads a mode this release does not ship from the page it carries", () => {
    const stored = (mode: unknown): Theme => ({ ...darkTheme, mode }) as Theme;

    expect(nativeTextTheme(stored("Dark")).appearance).toBe("dark");
  });

  it("names the fill its value and placeholder sit on", () => {
    const onInput = nativeTextTheme(lightTheme, "input");
    const onPage = nativeTextTheme(lightTheme, "background");

    expect(onPage.bg).toBe(lightTheme.colors.background);
    expect(onInput.bg).toBe(lightTheme.colors.input);
    expect(onPage.text).toBe(onInput.text);
    expect(onPage.textFaint).toBe(onInput.textFaint);

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
    const failures = shipped.flatMap(({ label, theme }) =>
      documentPlacements(theme)
        .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
        .map(
          ({ claim, ratio, floor }) =>
            `${label} ${claim}: ${ratio?.toFixed(2) ?? "unmeasurable"} < ${floor}`,
        ),
    );

    expect(failures).toEqual([]);

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
    const inventory = read("../../../.agents/slop/COMPONENTS.md");

    [
      "| `metrics.mdBlockGap` / `mdTableCellPadding` | `spacing.lg` — a document's block gap / a cell's inset |",
      "| `metrics.mdCodePaddingX` / `mdCodePaddingY` | `spacing.lg` / `spacing.md` — a fence's own inset |",
      "| `metrics.mdCodeHeaderPaddingY` | `spacing.xs` — a fence's language strip |",
      "| `metrics.diffRowPaddingX` / `diffBodyBottomPad` | `spacing.xl` / `spacing.md` |",
      "| `metrics.codeGutterPaddingRight` | `spacing.lg` — the gutter's gap |",
    ].forEach((row) => expect(catalogue).toContain(row));

    expect(catalogue).not.toContain("a diff's paddings and accent bar");
    expect(catalogue).toContain("the block gap are not a row model");
    expect(readme).toContain("insets and gaps are the spacing scale's");
    expect(readme).not.toContain("gutter widths stay the runtime's");
    expect(inventory).toContain("insets and gaps are the spacing scale's");
    expect(inventory).not.toContain("diff paddings and table column minima");
  });

  it("teaches the code host's type, not only its palette", () => {
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

    expect(catalogue).toContain("### The type a window measured");
    expect(catalogue).toContain(`${codeSize}/${codeLeading}`);
    expect(catalogue).toContain(`${runtimeCodeSize}/${runtimeCodeLeading}`);
    expect(catalogue).toContain(
      `the caption **${captionSize}** against ${runtimeHeaderSize}`,
    );
    expect(catalogue).toContain(`${checks} checks`);
    expect(readme).toContain(`${checks} checks`);

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

    expect(catalogue).toContain(
      `${4 * (codeLeading - runtimeDiffLeading)}** taller`,
    );
    expect(catalogue).toContain(`${2 * codeLeading} tall`);
    expect(catalogue).toContain(`${2 * runtimeCodeLeading} tall`);

    expect(catalogue).toContain("macOS at scale 2");
    expect(catalogue).toContain("one-row antialias slack");
  });

  it("teaches that a field's value is the element's colour, not the object's text", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(catalogue).toContain("### What a field's value actually paints");
    expect(catalogue).toContain(
      "paints its value from the element's `style.color`",
    );
    expect(catalogue).toContain("color: theme.colors.inputForeground");
    expect(catalogue).toContain("47.5");
    expect(catalogue).toContain("240.7");
  });
});

describe("the diff host's colours", () => {
  const ink = (value: string | undefined): string => value ?? "";

  const rowWash = (ink: string, fill: string) =>
    blend(ink, fill, 1 - nativeDiffWash);

  const placements = (theme: Theme) =>
    nativeTextFills.flatMap((fill) => {
      const host = nativeTextTheme(theme, fill);
      const floors = contrastFloorsFor(theme);
      const wash = (line: string | undefined) =>
        rowWash(ink(line), ink(host.bg));
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

    expect(catalogue).toContain("### The diff host");
    expect(catalogue).toContain("`nativeDiffWash` (0.055)");
    expect(catalogue).toContain("`diffHunkBg`");

    expect(catalogue).toContain("### The document host");
    expect(catalogue).toContain("prose in a chip");
    expect(catalogue).toContain("`diffTextSize`");

    expect(catalogue).toContain("syntax palette is this package's");
    expect(catalogue).not.toContain("is not filled by `nativeTextTheme`");

    expect(catalogue).toContain("`#8F8F8F`");
    expect(catalogue).toContain("2.84:1");
    expect(catalogue).not.toContain(
      "host.textFaint; // placeholder host.caret",
    );
  });
});

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

    expect(hosts.length).toBeGreaterThanOrEqual(8);
    const missing = hosts
      .filter(({ text }) => !text.includes("nativeTextTheme("))
      .map(({ file }) => file);

    expect(missing).toEqual([]);
  });

  it("names one of the two fills at every call site", () => {
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

    expect(named.length).toBeGreaterThanOrEqual(9);
    expect(unknown).toEqual([]);
  });

  it("re-exports the seam from the primitives instead of copying it", () => {
    const primitives = readFileSync(
      new URL("../../primitives/src/core/style.ts", import.meta.url),
      "utf8",
    );

    expect(primitives).toContain("nativeTextTheme");
    expect(primitives).toContain("nativeTextFills");

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

    expect(catalogue).toContain("render the hint through the published");
    expect(catalogue).toContain("`fieldHint`/`renderFieldHint`");
    expect(catalogue).not.toContain(
      "The components package's fields pass the host's",
    );
    expect(catalogue).not.toContain("adopting the painted hint is recorded");

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

describe("the accent a document host paints", () => {
  it("holds a list number and a bullet to the label floor on every fill", () => {
    const under = shipped.flatMap(({ label, theme }) => {
      const floors = contrastFloorsFor(theme);

      const accent = nativeTextTheme(theme).accent;
      return nativeAccentSurfaces.flatMap((surface) => {
        const fill = theme.colors[surface];
        const marker = blend(fill, accent ?? "", nativeAccentShares.marker);
        const rail = blend(fill, accent ?? "", nativeAccentShares.rail);
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

    expect(
      shipped.every(({ theme }) => (nativeAccent(theme) ?? "").startsWith("#")),
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

    expect(
      under.filter(({ stepped }) => !stepped).map(({ label }) => label),
    ).toEqual([]);
    expect(
      over
        .filter(({ stepped }) => stepped)
        .map(({ label, worst }) => `${label} ${worst}`),
    ).toEqual([]);

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

    const worstOf = (label: string) =>
      under.find((entry) => entry.label === label)?.worst;
    const pages = [
      readFileSync(new URL("../../../docs/tokens.md", import.meta.url), "utf8"),
      readFileSync(
        new URL("../../../docs/design-system.md", import.meta.url),
        "utf8",
      ),
      readFileSync(new URL("../README.md", import.meta.url), "utf8"),
    ].map((text) => text.replace(/\s+/g, " "));

    pages.forEach((page, at) => {
      expect(page, `surface ${at}`).toContain(
        `${under.length} of the ${shipped.length}`,
      );
      expect(page, `surface ${at}`).toContain(
        `Dark · macOS (${worstOf("darwin dark")}:1)`,
      );
      expect(page, `surface ${at}`).toContain(
        `Dark · Linux (${worstOf("linux dark")}:1)`,
      );
    });
  });

  it("steps by the smallest share that clears, never past it", () => {
    const source = readFileSync(
      new URL("./native-text.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("const ACCENT_STEPS = 50;");
    const shares = Array.from({ length: 51 }, (_, at) => at / 50);

    const wrong = shipped.flatMap(({ label, theme }) => {
      const colors = theme.colors;
      const floors = contrastFloorsFor(theme);
      const primary = colors.primary;
      const rest = colors.foreground ?? primary;
      const carries = (colour: string): boolean =>
        nativeAccentSurfaces.every((surface) => {
          const fill = colors[surface];
          if (fill === undefined) {
            return true;
          }
          const marker = contrastRatio(
            blend(fill, colour, nativeAccentShares.marker),
            fill,
          );
          const rail = contrastRatio(
            blend(fill, colour, nativeAccentShares.rail),
            fill,
          );
          return (
            (marker === undefined || marker >= floors.secondary) &&
            (rail === undefined || rail >= decorativeFloor)
          );
        });
      const first = shares.find((share) =>
        carries(blend(primary, rest, share)),
      );
      const expected = first === undefined ? rest : blend(primary, rest, first);
      return nativeAccent(theme) === expected ? [] : [label];
    });

    expect(wrong).toEqual([]);
  });

  it("keeps the caret a mark on the field, not the document's label", () => {
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

describe("the fence a document host paints", () => {
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

  const stripPlacements = () =>
    shipped.flatMap(({ label, theme }) =>
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

  it("holds the runtime's own shares and composites them over the fill", () => {
    expect(nativeFenceInk).toBe(0.035);
    expect(nativeFenceHeaderInk).toBe(0.02);

    expect(nativeFenceFill(lightTheme.colors.background)).toBe(
      blend(lightTheme.colors.background, "#000000", nativeFenceInk),
    );
    expect(nativeFenceFill(darkTheme.colors.background)).toBe(
      blend(darkTheme.colors.background, "#FFFFFF", nativeFenceInk),
    );

    const body = nativeFenceFill(lightTheme.colors.background);
    expect(nativeFenceHeaderFill(lightTheme.colors.background)).toBe(
      blend(body ?? "", "#000000", nativeFenceHeaderInk),
    );

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

    expect(shipped.length * nativeTextFills.length * 25).toBe(900);

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

    for (const style of [linuxDark, windowsDark, macOSDark]) {
      expect(
        contrastRatio(identity, style.colors.background),
      ).toBeGreaterThanOrEqual(contrastFloorsFor(style).body);
    }

    for (const theme of [linuxDark, windowsDark, macOSDark]) {
      expect(syntaxColors(theme).keyword).toBe("#B0B2FF");
    }
    expect(darkSyntax.keyword).toBe(identity);
    expect(syntaxColors(darkTheme).keyword).toBe(identity);

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

    expect(
      contrastRatio(syntaxColors(brand).keyword, brand.colors.background),
    ).toBeGreaterThanOrEqual(contrastFloorsFor(brand).body);
    expect(fence).not.toBeUndefined();
  });

  it("measures the strip as a wash the rule carries, not a boundary", () => {
    const strips = stripPlacements();
    const low = strips.reduce((worst, cell) =>
      (cell.ratio ?? 1) < (worst.ratio ?? 1) ? cell : worst,
    );
    const hidden = strips.filter(({ ratio }) => (ratio ?? 0) < decorativeFloor);

    expect(hidden.length).toBeGreaterThan(0);
    expect([low.label, low.fill, Number((low.ratio ?? 0).toFixed(3))]).toEqual([
      "high-contrast dark",
      "background",
      1.031,
    ]);

    expect(
      strips.filter(({ overPage }) => (overPage ?? 0) < decorativeFloor),
    ).toEqual([]);
  });

  it("prints the strip's washed placements from the sweep it walks", () => {
    const strips = stripPlacements();
    const hidden = strips.filter(({ ratio }) => (ratio ?? 0) < decorativeFloor);
    const washedStyles = new Set(hidden.map(({ label }) => label));
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(washedStyles.size).toBeGreaterThan(0);
    expect(washedStyles.size).toBeLessThan(shipped.length);
    expect(catalogue).toContain(
      `under the ${decorativeFloor}:1 perceptibility floor in ${spelled(washedStyles.size)} of the ${spelled(shipped.length)} styles (${spelled(hidden.length)} of the ${spelled(strips.length)} fill placements`,
    );
    expect(catalogue).toContain(
      `The tightest placement over the ${spelled(shipped.length)} styles`,
    );

    expect(catalogue).not.toContain("nine of the sixteen");
    expect(catalogue).not.toContain("thirty-two fill placements");
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
      new URL("../../../.agents/slop/COMPONENTS.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const readme = readFileSync(
      new URL("../README.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(catalogue).toContain("### The fence a document paints");
    expect(catalogue).toContain("`nativeFenceInk` (0.035)");
    expect(catalogue).toContain("`nativeFenceFill(fill)`");
    expect(catalogue).toContain("6.49:1");

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
      new URL("../../../.agents/slop/COMPONENTS.md", import.meta.url),
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

    expect(record).toContain("`#8F96ED`");
    expect(page).toContain("`#8F96ED` (**988** px)");

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

describe("a theme a store gave back", () => {
  const without = <Record_ extends object>(
    record: Record_,
    key: keyof Record_,
  ): Partial<Record_> => {
    const partial: Partial<Record_> = { ...record };
    delete partial[key];
    return partial;
  };

  const stored = (overrides: Partial<Record<keyof Theme, unknown>>): Theme =>
    ({ ...lightTheme, ...overrides }) as Theme;

  const colorsWithout = (role: keyof ThemeColors) =>
    stored({ colors: without(lightTheme.colors, role) });

  it("is a theme the gate reports, not one it refuses", () => {
    const report = auditTheme(colorsWithout("success"));

    expect(report.invalidRoles).toEqual([
      { role: "success", value: undefined },
    ]);
    expect(report.passed).toBe(false);
  });

  it("drops a diff ink the tone it reads lost, instead of throwing", () => {
    const tones = (["success", "destructive"] as const).flatMap((tone) =>
      [tone, `${tone}Soft`, `${tone}SoftForeground`].map((role) => ({
        tone,
        role: role as keyof ThemeColors,
      })),
    );

    const wrong = tones.flatMap(({ tone, role }) => {
      const host = nativeTextTheme(colorsWithout(role), "background");
      const ink = tone === "success" ? host.diffAdd : host.diffDel;

      const other = tone === "success" ? host.diffDel : host.diffAdd;
      return ink === undefined && typeof other === "string"
        ? []
        : [
            `${role}: diff ${tone} ink ${String(ink)}, sibling ${String(other)}`,
          ];
    });

    expect(wrong).toEqual([]);
  });

  it("drops the field a role feeds, and keeps the ones the theme still has", () => {
    const noValueInk = nativeTextTheme(colorsWithout("inputForeground"));
    expect(noValueInk.text).toBeUndefined();
    expect(noValueInk.bg).toBe(lightTheme.colors.input);
    expect(noValueInk.codeText).toBe(lightTheme.colors.foreground);

    const noBrand = nativeTextTheme(colorsWithout("primary"));
    expect(noBrand.caret).toBeUndefined();
    expect(noBrand.accent).toBeUndefined();
    expect(nativeAccent(colorsWithout("primary"))).toBeUndefined();

    const noChrome = nativeTextTheme(colorsWithout("muted"));
    expect(noChrome.codeWash).toBeUndefined();
    expect(noChrome.diffHunkBg).toBeUndefined();

    expect(nativeTextTheme(colorsWithout("border")).border).toBeUndefined();
  });

  it("answers a theme that lost the whole colour group", () => {
    const theme = stored({ colors: undefined });
    const host = nativeTextTheme(theme);

    expect(auditTheme(theme).passed).toBe(false);
    expect(host.bg).toBeUndefined();
    expect(host.text).toBeUndefined();
    expect(host.diffAdd).toBeUndefined();
    expect(host.accent).toBeUndefined();

    expect(host.appearance).toBe("light");
    expect(host.metrics.codeTextSize).toBe(
      lightTheme.typography.codeBlock.fontSize,
    );
    expect(host.syntax).toBe(lightSyntax);
  });

  it("answers the library's type for a theme that lost it", () => {
    const host = nativeTextTheme(stored({ typography: undefined }));
    const complete = nativeTextTheme(lightTheme);

    expect(host.fontSans).toBe(lightTheme.typography.sans);
    expect(host.fontMono).toBe(lightTheme.typography.mono);
    expect(host.metrics).toEqual(complete.metrics);

    const nulled = nativeTextTheme(stored({ radius: null, spacing: null }));
    expect(nulled.metrics).toEqual(complete.metrics);
    const blank = nativeTextTheme(
      stored({ typography: { ...lightTheme.typography, mono: "" } }),
    );
    expect(blank.fontMono).toBe(lightTheme.typography.mono);
    const dropped = nativeTextTheme(
      stored({
        typography: {
          ...lightTheme.typography,
          h1: { ...lightTheme.typography.h1, lineHeight: Number.NaN },
        },
      }),
    );
    expect(dropped.metrics.mdHeadingLineHeights[0]).toBe(
      lightTheme.typography.h1.lineHeight,
    );

    const brand = nativeTextTheme(
      extendTheme(lightTheme, {
        typography: { codeBlock: { fontSize: 20, lineHeight: 28 } },
        radius: { lg: 12 },
        spacing: { xl: 24 },
      }),
    );
    expect(brand.metrics.codeTextSize).toBe(20);
    expect(brand.metrics.codeLineHeight).toBe(28);
    expect(brand.metrics.mdCodeRadius).toBe(12);
    expect(brand.metrics.diffRowPaddingX).toBe(24);
  });

  it("paints the shape a store hands back, without a cast", () => {
    const stored: NativeTextSource = {
      colors: { background: "#11141A" },
      typography: {
        sans: "Inter",
        body: { fontSize: 18, lineHeight: 26, fontWeight: 500 },
      },
      radius: null,
      spacing: null,
      mode: "Dark",
    };
    const host = nativeTextTheme(stored);

    expect(host.appearance).toBe("dark");
    expect(host.fontSans).toBe("Inter");
    expect(host.metrics.mdTextSize).toBe(18);
    expect(host.metrics.mdCodeRadius).toBe(lightTheme.radius.lg);
    expect(host.metrics.diffRowPaddingX).toBe(lightTheme.spacing.xl);

    expect(host.accent).toBeUndefined();
    expect(nativeAccent(stored)).toBeUndefined();
  });

  it("never throws for a role any shipped style lost", () => {
    const wrong = colorRoles.flatMap((role) => {
      const broken = {
        ...lightTheme,
        colors: without(lightTheme.colors, role),
      } as Theme;
      const named = invalidColorRoles(broken).map((at) => at.role);
      nativeTextFills.forEach((fill) => nativeTextTheme(broken, fill));
      return named.length === 1 && named[0] === role ? [] : [role];
    });

    expect(wrong).toEqual([]);
  });

  it("still hands a complete theme every field, in every style", () => {
    const lossy = shipped.flatMap(({ label, theme }) =>
      nativeTextFills.flatMap((fill) => {
        const host = nativeTextTheme(theme, fill);
        const colours = [
          host.bg,
          host.text,
          host.textMuted,
          host.textFaint,
          host.accent,
          host.caret,
          host.diffAdd,
          host.diffDel,
          host.diffHunkBg,
          host.textDim,
          host.codeText,
          host.codeWash,
          host.border,
        ];
        return colours.every((value) => typeof value === "string")
          ? []
          : [`${label} · ${fill}`];
      }),
    );

    expect(lossy).toEqual([]);
    expect(nativeTextTheme(lightTheme)).toMatchObject({
      text: lightTheme.colors.inputForeground,
      diffAdd: lightTheme.colors.successSoftForeground,
      diffDel: lightTheme.colors.destructiveSoftForeground,
    });
  });

  it("is taught on both token pages, the README and the inventory", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");

    expect(catalogue).toContain(
      "**A role a stored theme lost is dropped, not thrown on.**",
    );
    expect(catalogue).toContain(
      "Cannot read properties of undefined (reading 'foreground')",
    );
    expect(catalogue).toContain("`nativeAccent(theme)` answers `undefined`");
    expect(designSystem).toContain("**stored theme's absence**");
    expect(readme).toContain(
      "**A role a stored theme lost is dropped, not thrown on.**",
    );
    expect(inventory).toContain(
      "A role a stored theme lost is dropped, not thrown on",
    );
  });
});
