import { getTheme, themeContrasts, themeModes } from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThemeMatrix, builtInThemes } from "./theme-matrix";

/**
 * The built-in-theme specimen.
 *
 * The four themes were written out by hand on two pages and nothing held either
 * table to `@gpuixui/tokens`, so a fifth theme or a renamed export left the docs
 * describing a library that no longer shipped them. The specimen is generated,
 * and this guard is the proof that it is: every row comes from the package's
 * own indexes, every row names the call a reader writes, and every swatch
 * paints the theme it belongs to rather than a copied palette.
 */

const markup = renderToStaticMarkup(<ThemeMatrix />);

/** The rows the specimen rendered, keyed by the theme they draw. */
const rows = (): ReadonlyMap<string, string> =>
  new Map(
    markup
      .split('data-theme="')
      .slice(1)
      .map((section) => [
        section.slice(0, section.indexOf('"')),
        section.slice(section.indexOf('"')),
      ]),
  );

/** The HTML entities the renderer writes, read back as the text they mean. */
const text = (markup: string): string =>
  markup
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

describe("the built-in-theme specimen", () => {
  it("draws one row for every mode and contrast the package ships", () => {
    // The row count is the package's, so a mode or a contrast variant the
    // library adds appears here without a docs edit.
    expect(builtInThemes()).toHaveLength(
      themeModes.length * themeContrasts.length,
    );
    expect(rows().size).toBe(themeModes.length * themeContrasts.length);
  });

  it("names each theme the way the package names it", () => {
    const wrong = builtInThemes().flatMap(({ theme }) =>
      rows().get(theme.name) === undefined
        ? [`${theme.name} is not drawn`]
        : [],
    );

    expect(wrong).toEqual([]);
  });

  it("prints the call a reader writes, in the package's own order", () => {
    const wrong = builtInThemes().flatMap(({ theme, call }) => {
      const row = rows().get(theme.name) ?? "";
      const printed = /<code>([^<]+)<\/code>/.exec(row)?.[1];
      return printed !== undefined && text(printed) === call
        ? []
        : [`${theme.name}: expected ${call}, printed ${printed ?? "nothing"}`];
    });

    expect(wrong).toEqual([]);
  });

  it("paints each row with the theme it belongs to", () => {
    // A specimen that carried a copied palette would show one theme's colours
    // under another's name — the exact drift the generated rows prevent.
    const wrong = builtInThemes().flatMap(({ theme }) => {
      const row = rows().get(theme.name) ?? "";
      const missing = [
        theme.colors.background,
        theme.colors.primary,
        theme.colors.foreground,
      ].filter((color) => !row.includes(color));

      return missing.length === 0
        ? []
        : [`${theme.name}: missing ${missing.join(", ")}`];
    });

    expect(wrong).toEqual([]);
  });

  it("draws the high-contrast themes as their own themes", () => {
    // High contrast is a second axis, not a third mode: the same layout with a
    // different palette, so the specimen must not show the default theme's
    // colours under the high-contrast name.
    const missing = themeContrasts.flatMap((contrast) =>
      themeModes.flatMap((mode) => {
        const theme = getTheme(mode, contrast);
        return rows().get(theme.name) === undefined
          ? [`${theme.name} is not drawn`]
          : [];
      }),
    );

    expect(missing).toEqual([]);

    const highContrast = getTheme("dark", "high");
    const standard = getTheme("dark", "default");
    expect(rows().get(highContrast.name)).not.toBe(rows().get(standard.name));
  });
});
