import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { stylesheetOf } from "./theme-stylesheet";

/**
 * The stylesheet a reader copies from `/themes`.
 *
 * Bug guarded: the page promised "the CSS they compile to" and offered none.
 * The block must be a single file a shadcn project pastes: Tailwind's import,
 * the light `:root`, the dark `.dark`, and the `@theme inline` bridge that maps
 * each variable to a Tailwind colour — without the bridge the variables are
 * defined and no utility reads them.
 */

const css = stylesheetOf({ light: lightTheme, dark: darkTheme });

describe("the theme stylesheet", () => {
  it("is one file, in the order a shadcn project reads it", () => {
    expect(css.startsWith('@import "tailwindcss";')).toBe(true);
    expect(css).toContain("@custom-variant dark");
    expect(css.indexOf(":root {")).toBeLessThan(css.indexOf(".dark {"));
    expect(css.indexOf(".dark {")).toBeLessThan(css.indexOf("@theme inline {"));
  });

  it("carries both modes' values", () => {
    expect(css).toContain(`--background: ${lightTheme.colors.background};`);
    expect(css).toContain(`--background: ${darkTheme.colors.background};`);
    expect(css).toContain(`--primary: ${lightTheme.colors.primary};`);
    expect(css).toContain(`--radius: ${lightTheme.radius.md}px;`);
  });

  it("bridges every variable to a Tailwind colour", () => {
    const missing = [
      "background",
      "foreground",
      "primary",
      "muted-foreground",
      "chart-1",
      "chart-5",
    ].filter((role) => !css.includes(`--color-${role}: var(--${role});`));

    expect(missing).toEqual([]);
  });
});
