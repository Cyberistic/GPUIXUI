/**
 * Guards the figures the copyable examples state in their own headers.
 *
 * Plan 717 closed the package's JSDoc and plan 539 the two pages, but a
 * `*.example.ts` header — the file a consumer copies and edits — was read by no
 * suite: bumping every ratio digit across nine example files left 7071 of 7075
 * tests green, and `styles.ts`'s copy of the same three disabled figures left
 * the whole suite green on its own. Four sentences were already wrong: the Toast
 * groove counted the AAA dark sets as 1.000:1 (they are 1.058:1), the unchecked
 * control called both roles 1.000:1 in identity light and on every platform dark
 * card (they are 1.027:1 and 1.221:1 in the two sets the sentence named), and
 * the platform example quoted two figures measured on hexes the file no longer
 * contains.
 *
 * The figures measured on a shipped theme live in `figures.ts`; this suite owns
 * the ones an example theme produces and the sweeps a single figure cannot
 * state.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  quietHighContrastFailures,
  quietHighContrastTheme,
} from "./contrast.example.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  themeContrastFailures,
} from "./contrast.js";
import { deriveFigure, documentedFigures } from "./figures.js";
import { resolveEditedPlatformTheme } from "./platform-styles.example.js";
import {
  invertedRowPressTheme,
  rowPressFailures,
} from "./row-press.example.js";
import { shippedThemes, type ShippedTheme } from "./shipped-themes.js";
import { getPlatformTheme, getTheme } from "./theme.js";

/** A source module's comment block read as one paragraph. */
const proseOf = (url: URL): string =>
  readFileSync(url, "utf8")
    .replaceAll(/^[ \t]*\*(?!\*)[ \t]?/gm, "")
    .replaceAll(/\s+/g, " ");

/** A module beside this suite. */
const prose = (file: string): string => proseOf(new URL(file, import.meta.url));

/** A document named from the repository root. */
const documentProse = (path: string): string =>
  proseOf(new URL(`../../../${path}`, import.meta.url));

const figure = (value: number, digits: number): string => value.toFixed(digits);

/** A default-contrast dark set. */
const isDefaultDark = (entry: ShippedTheme): boolean =>
  entry.theme.mode === "dark" && entry.theme.contrast === "default";

/** The macOS dark platform variant's shipped entry. */
const isMacDark = (entry: ShippedTheme): boolean =>
  entry.source === "platform" && entry.platform === "darwin";

const darkSets = shippedThemes.filter((entry) => entry.theme.mode === "dark");

describe("the figures the copyable examples state", () => {
  it("derives the quiet AAA theme's two figures and the floors it misses", () => {
    const colors = quietHighContrastTheme.colors;
    const pressed = contrastRatio(colors.mutedForeground, colors.active);
    const washed = contrastRatio(
      colors.mutedForeground,
      compositeOver(colors.selection, colors.background),
    );
    const floor = contrastFloors.high.secondary;

    expect(figure(pressed, 2)).toBe("6.70");
    expect(figure(washed, 2)).toBe("6.65");
    expect(pressed).toBeLessThan(floor);
    expect(washed).toBeLessThan(floor);

    expect(quietHighContrastFailures.length).toBeGreaterThan(0);
    expect(
      quietHighContrastFailures.every(
        ({ ratio }) => ratio >= contrastFloors.default.secondary,
      ),
      "the header's 'still passing the default floors on every pair'",
    ).toBe(true);
    expect(themeContrastFailures(quietHighContrastTheme)).toEqual([
      ...quietHighContrastFailures,
    ]);

    expect(prose("contrast.example.ts")).toContain(
      `then loses them: ${figure(pressed, 2)}:1 on the pressed wash and ` +
        `${figure(washed, 2)}:1 through the selection wash, under the ` +
        `${floor}:1 it was built for, while still passing the default floors ` +
        `on every pair.`,
    );
  });

  it("derives the row press's step, which the direction check rejects", () => {
    const { accent, active } = invertedRowPressTheme.colors;
    const step = contrastRatio(accent, active);

    expect(figure(step, 3)).toBe("1.094");
    expect(step).toBeGreaterThanOrEqual(contrastFloors.default.step);
    expect(rowPressFailures.map(({ ladder }) => ladder)).toEqual(["rowPress"]);
    expect(prose("row-press.example.ts")).toContain(
      `the two are a ${figure(step, 3)}:1 step`,
    );
  });

  it("derives the Windows foreground the platform example would inherit", () => {
    const inherited = getPlatformTheme("win32", "dark").colors.foreground;
    const family = resolveEditedPlatformTheme("dark").colors;
    const fill = contrastRatio(inherited, family.primary);
    const hover = contrastRatio(inherited, family.primaryHover);
    const floor = contrastFloors.default.secondary;

    expect(figure(fill, 3)).toBe("1.900");
    expect(figure(hover, 3)).toBe("1.485");
    expect(fill).toBeLessThan(floor);
    expect(hover).toBeLessThan(floor);
    expect(prose("platform-styles.example.ts")).toContain(
      `inheriting the Windows dark foreground on this family's fill measures ` +
        `**${figure(fill, 3)}:1** and **${figure(hover, 3)}:1** on its hover, ` +
        `under the **${floor}:1** on-colour floor`,
    );
  });

  it("scopes the Toast groove to the default-contrast dark sets", () => {
    const defaultDark = darkSets.filter(isDefaultDark);
    const highDark = darkSets.filter((entry) => !isDefaultDark(entry));

    expect(defaultDark.length).toBeGreaterThan(0);
    expect(highDark.length).toBeGreaterThan(0);
    defaultDark.forEach(({ theme }) => {
      expect(theme.colors.muted, `${theme.name}: muted is popover`).toBe(
        theme.colors.popover,
      );
      expect(
        figure(contrastRatio(theme.colors.muted, theme.colors.popover), 3),
        theme.name,
      ).toBe("1.000");
    });
    highDark.forEach(({ theme }) => {
      expect(
        figure(contrastRatio(theme.colors.muted, theme.colors.popover), 3),
        theme.name,
      ).toBe("1.059");
    });

    const header = prose("toast-countdown.example.ts");
    expect(header).toContain(
      "every default-contrast platform and recipe dark set",
    );
    expect(header).not.toContain("and every platform and recipe dark set");
    expect(header).toContain("the AAA dark sets step it to **1.059:1**");
  });

  it("holds the unchecked control's two roles on every card", () => {
    const light = getTheme("light");
    const dark = getTheme("dark");
    expect(
      figure(contrastRatio(light.colors.input, light.colors.card), 3),
    ).toBe("1.000");
    expect(
      figure(contrastRatio(light.colors.muted, light.colors.card), 3),
    ).toBe("1.027");
    expect(
      figure(contrastRatio(dark.colors.muted, dark.colors.card), 3),
      "identity dark: track on card",
    ).toBe("1.126");

    const defaultDark = darkSets.filter(isDefaultDark);
    defaultDark
      .filter((entry) => entry.source !== "identity")
      .forEach(({ theme }) => {
        expect(
          figure(contrastRatio(theme.colors.muted, theme.colors.card), 3),
          `${theme.name}: track on card`,
        ).toBe("1.000");
      });

    const mac = getPlatformTheme("darwin", "dark");
    expect(
      figure(contrastRatio(mac.colors.input, mac.colors.card), 3),
      "macOS dark: edge on card",
    ).toBe("1.221");
    defaultDark
      .filter((entry) => !isMacDark(entry))
      .forEach(({ theme }) => {
        expect(
          figure(contrastRatio(theme.colors.input, theme.colors.card), 3),
          `${theme.name}: edge on card`,
        ).toBe("1.000");
      });

    const header = prose("unchecked-selection.example.ts");
    ["1.000", "1.221", "1.027", "1.126"].forEach((value) =>
      expect(header, `the header quotes ${value}`).toContain(value),
    );
    expect(header).toContain(
      `**${contrastFloors.default.surface}:1** surface floor`,
    );
  });

  it("reads the same three disabled figures in the helper and its example", () => {
    const documents = [
      "packages/tokens/src/disabled-state.example.ts",
      "packages/tokens/src/styles.ts",
    ] as const;
    const figuresOf = (document: (typeof documents)[number]) =>
      documentedFigures
        .filter((entry) => entry.document === document && entry.kind === "dim")
        .map((entry) => {
          const derived = deriveFigure(entry);
          expect(derived.kind, entry.name).toBe("derived");
          return derived.kind === "derived" ? derived.figure : "";
        })
        .toSorted();

    expect(figuresOf(documents[0])).toEqual(figuresOf(documents[1]));
    documents.forEach((document) => {
      const text = documentProse(document);
      figuresOf(document).forEach((value) =>
        expect(text, `${document} quotes ${value}`).toContain(value),
      );
      expect(text, document).toContain(`${contrastFloors.default.inactive}:1`);
    });
  });

  it("rejects the pre-805 sentences", () => {
    const platform = prose("platform-styles.example.ts");
    expect(platform).not.toContain("2.96:1");
    expect(platform).not.toContain("2.12:1");

    const toast = prose("toast-countdown.example.ts");
    expect(toast).not.toContain("and every platform and recipe dark set");

    const unchecked = prose("unchecked-selection.example.ts");
    expect(unchecked).not.toContain(
      "the two measure **1.000:1** in identity light and on every platform dark card",
    );
  });
});
