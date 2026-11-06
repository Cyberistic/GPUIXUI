/**
 * The film and the docs say a theme from shadcn's builders just works. The bugs
 * this guards: a builder's `oklch()` read wrongly, a typo becoming a colour, and
 * the dark block's values leaking into the light theme.
 */
import { describe, expect, it } from "vitest";
import { cssColorToHex, shadcnTheme } from "./shadcn-css.js";
import { lightTheme } from "./theme.js";

const CSS = `
:root {
  --background: oklch(1 0 0);
  --primary: oklch(0.205 0 0);
  --accent: 222 47% 11%;
  --border: not-a-colour;
  --radius: 0.75rem;
}
.dark {
  --primary: oklch(0.922 0 0);
}`;

describe("a colour", () => {
  it("reads oklch against known values", () => {
    expect(cssColorToHex("oklch(1 0 0)")).toBe("#FFFFFF");
    expect(cssColorToHex("oklch(0 0 0)")).toBe("#000000");
    // shadcn's own neutral primary is #171717.
    expect(cssColorToHex("oklch(0.205 0 0)")).toBe("#171717");
  });

  it("reads hsl, bare hsl and hex, and refuses the rest", () => {
    expect(cssColorToHex("hsl(0 100% 50%)")).toBe("#FF0000");
    expect(cssColorToHex("120 100% 50%")).toBe("#00FF00");
    expect(cssColorToHex("#3b82f6")).toBe("#3B82F6");
    expect(cssColorToHex("not-a-colour")).toBeUndefined();
  });
});

describe("a builder's file", () => {
  it("sets the roles it names and keeps the base's others", () => {
    const { theme } = shadcnTheme(CSS, lightTheme);
    expect(theme.colors.primary).toBe("#171717");
    expect(theme.colors.background).toBe("#FFFFFF");
    expect(theme.colors.success).toBe(lightTheme.colors.success);
  });

  it("reports a value it cannot read, and the role keeps the base", () => {
    const { theme, problems } = shadcnTheme(CSS, lightTheme);
    expect(problems).toEqual(["--border"]);
    expect(theme.colors.border).toBe(lightTheme.colors.border);
  });

  it("reads the block its mode names, and the radius in pixels", () => {
    expect(shadcnTheme(CSS, lightTheme, "dark").theme.colors.primary).toBe(
      "#E5E5E5",
    );
    expect(shadcnTheme(CSS, lightTheme).theme.radius.lg).toBe(12);
  });
});
