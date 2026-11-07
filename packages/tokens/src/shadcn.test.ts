import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme } from "./theme.js";
import {
  parseShadcnStyles,
  shadcnColour,
  shadcnOverrides,
} from "./shadcn-vars.js";
import {
  shadcnCss,
  shadcnPlatformTheme,
  shadcnStylesheet,
  shadcnTheme,
} from "./shadcn.js";

const V4 = `
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --border: oklch(1 0 0 / 10%);
}
`;

const V3 = `
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
}
`;

describe("reading a shadcn stylesheet", () => {
  it("splits :root from .dark", () => {
    const styles = parseShadcnStyles(V4);

    expect(styles.light.background).toBe("oklch(1 0 0)");
    expect(styles.dark.background).toBe("oklch(0.145 0 0)");
    expect(styles.light.primary).not.toBe(styles.dark.primary);
  });

  it("ignores comments and Tailwind v4's --color-* aliases", () => {
    const styles = parseShadcnStyles(`
      /* a comment naming --primary: red */
      :root { --primary: #123456; --color-primary: var(--primary); }
    `);

    expect(styles.light.primary).toBe("#123456");
    expect(styles.light["color-primary"]).toBeUndefined();
  });

  it("reads a dark prefers-color-scheme block as dark", () => {
    const styles = parseShadcnStyles(`
      :root { --background: #ffffff; }
      @media (prefers-color-scheme: dark) {
        :root { --background: #000000; }
      }
    `);

    expect(styles.light.background).toBe("#ffffff");
    expect(styles.dark.background).toBe("#000000");
  });

  it("wraps bare HSL channels, and leaves a colour function alone", () => {
    expect(shadcnColour("222.2 84% 4.9%")).toBe("hsl(222.2 84% 4.9%)");
    expect(shadcnColour("hsl(222.2 84% 4.9%)")).toBe("hsl(222.2 84% 4.9%)");
    expect(shadcnColour("#0a0a0a")).toBe("#0a0a0a");
    expect(shadcnColour("oklch(0.145 0 0)")).toBe("oklch(0.145 0 0)");
  });
});

describe("a shadcn palette as a theme", () => {
  it("paints the roles the stylesheet names", () => {
    const theme = shadcnTheme(V4, "dark");

    expect(theme.colors.background).toBe("oklch(0.145 0 0)");
    expect(theme.colors.foreground).toBe("oklch(0.985 0 0)");
    expect(theme.colors.primary).toBe("oklch(0.922 0 0)");
    expect(theme.mode).toBe("dark");
  });

  it("keeps the shipped theme for a role the stylesheet omits", () => {
    const theme = shadcnTheme(V4, "dark");

    expect(theme.colors.success).toBe(darkTheme.colors.success);
    expect(theme.colors.warning).toBe(darkTheme.colors.warning);
  });

  it("reads a v3 stylesheet's HSL channels", () => {
    const theme = shadcnTheme(V3, "light");

    expect(theme.colors.background).toBe("hsl(0 0% 100%)");
    expect(theme.colors.foreground).toBe("hsl(222.2 84% 4.9%)");
    expect(theme.colors.primary).toBe("hsl(221.2 83.2% 53.3%)");
  });

  it("derives the rest of a family from the roles it has", () => {
    const overrides = shadcnOverrides(parseShadcnStyles(V3).light);
    const colours = overrides.colors ?? {};

    expect(colours.inputForeground).toBe(colours.foreground);
    expect(colours.borderStrong).toBe(colours.border);
    expect(colours.hover).toBe(colours.muted);

    expect(colours.selection).toMatch(/^#[0-9A-F]{8}$/i);
    expect(colours.selection).not.toBe(colours.primary);
  });

  it("takes the radius and the five chart marks", () => {
    const light = shadcnOverrides(parseShadcnStyles(V4).light);

    expect(light.radius).toEqual({ md: 10 });
    expect(light.series).toEqual([
      "oklch(0.646 0.222 41.116)",
      "oklch(0.6 0.118 184.704)",
      "oklch(0.398 0.07 227.392)",
      "oklch(0.828 0.189 84.429)",
      "oklch(0.769 0.188 70.08)",
    ]);

    expect(shadcnOverrides(parseShadcnStyles(V3).light).radius).toEqual({
      md: 8,
    });
  });

  it("leaves the theme alone when the stylesheet has no block for the mode", () => {
    const theme = shadcnTheme(":root { --primary: #123456; }", "dark");

    expect(theme.colors.primary).toBe(darkTheme.colors.primary);
  });
});

describe("a shadcn palette under a platform style", () => {
  it("keeps the palette's colours and takes the platform's type and radius", () => {
    const theme = shadcnPlatformTheme(V4, "win32", "dark");

    expect(theme.colors.background).toBe("oklch(0.145 0 0)");
    expect(theme.colors.primary).toBe("oklch(0.922 0 0)");
    expect(theme.radius.md).toBe(4);
    expect(theme.mode).toBe("dark");
  });

  it("still repaints the palette when the caller asks for the platform's", () => {
    const theme = shadcnPlatformTheme(V4, "win32", "dark", {
      keepPalette: false,
    });

    expect(theme.colors.background).not.toBe("oklch(0.145 0 0)");
    expect(theme.radius.md).toBe(4);
  });
});

describe("writing a theme back out", () => {
  it("emits the variables a shadcn project reads", () => {
    const css = shadcnCss(lightTheme);

    expect(css.startsWith(":root {")).toBe(true);
    expect(css).toContain("--background:");
    expect(css).toContain("--card-foreground:");
    expect(css).toContain("--chart-1:");
    expect(css).toContain("--radius:");
    expect(css.trimEnd().endsWith("}")).toBe(true);
  });

  it("round-trips a theme's colours through its own stylesheet", () => {
    const value = shadcnCss(darkTheme);
    const theme = shadcnTheme(value, "light");

    expect(theme.colors.background).toBe(darkTheme.colors.background);
    expect(theme.colors.primary).toBe(darkTheme.colors.primary);
    expect(theme.colors.mutedForeground).toBe(darkTheme.colors.mutedForeground);
    expect(theme.radius.md).toBe(darkTheme.radius.md);
  });

  it("writes light and dark as the two blocks a site swaps", () => {
    const css = shadcnStylesheet(lightTheme, darkTheme);

    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");

    const styles = parseShadcnStyles(css);
    expect(styles.light.primary).toBe(lightTheme.colors.primary);
    expect(styles.dark.primary).toBe(darkTheme.colors.primary);
  });
});
