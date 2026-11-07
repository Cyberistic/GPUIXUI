import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import { stylesheetOf } from "./theme-stylesheet";

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
