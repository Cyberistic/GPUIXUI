import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  extendTheme,
  lightTheme,
  platformTheme,
  darkTheme,
} from "@gpuixui/tokens";
import { previewMode, previewVars } from "./theme-surface";

/**
 * Guards the token surface behind every labelled preview (plan 434). The
 * load-bearing failures are a preview that hard-codes a palette, and a surface
 * that reads only part of the theme — the latter would silently ignore the real
 * per-platform values when `packages/tokens` ships them.
 *
 * Plan 444 adds the mode rule: a dark docs page used to paint light previews
 * because the surface took `next-themes`' pre-hydration `undefined` and never
 * re-rendered. The three cases below pin both halves of the fix — the server
 * render stays light (or React hydrates mismatched HTML) and the hydrated
 * render follows the docs.
 */

const vars = previewVars(lightTheme);

const source = (file: string): string =>
  readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");

describe("previewMode", () => {
  it("paints the docs' dark palette once hydrated", () => {
    expect(previewMode(true, "dark")).toBe("dark");
  });

  it("stays light before hydration so the client render matches the HTML", () => {
    expect(previewMode(false, "dark")).toBe("light");
  });

  it("falls back to light when the mode is unknown or light", () => {
    expect(previewMode(true, undefined)).toBe("light");
    expect(previewMode(true, "light")).toBe("light");
  });
});

describe("previewVars", () => {
  it("maps every colour role, scale and metric the theme carries", () => {
    const expected = [
      ...Object.keys(lightTheme.colors).map(
        (role) => `--preview-color-${role}`,
      ),
      ...Object.keys(lightTheme.spacing).map(
        (step) => `--preview-space-${step}`,
      ),
      ...Object.keys(lightTheme.radius).map(
        (step) => `--preview-radius-${step}`,
      ),
      ...Object.keys(lightTheme.borderWidth).map(
        (step) => `--preview-border-${step}`,
      ),
      ...Object.keys(lightTheme.iconSize).map(
        (step) => `--preview-icon-${step}`,
      ),
      "--preview-font-sans",
      "--preview-font-mono",
      "--preview-control-height-sm",
      "--preview-control-height-md",
      "--preview-control-height-lg",
      "--preview-control-padding-x-sm",
      "--preview-control-padding-x-md",
      "--preview-control-padding-x-lg",
      "--preview-row-height",
      "--preview-shadow-sm",
      "--preview-shadow-md",
      "--preview-shadow-lg",
      "--preview-shadow-overlay",
    ];
    expect(expected.filter((name) => !(name in vars))).toEqual([]);
  });

  it("takes its values from the package, never a docs copy", () => {
    expect(vars["--preview-color-primary"]).toBe(lightTheme.colors.primary);
    expect(vars["--preview-color-background"]).toBe(
      lightTheme.colors.background,
    );
    expect(vars["--preview-space-md"]).toBe(`${lightTheme.spacing.md}px`);
    expect(vars["--preview-radius-md"]).toBe(`${lightTheme.radius.md}px`);
    expect(previewVars(darkTheme)["--preview-color-background"]).toBe(
      darkTheme.colors.background,
    );
    expect(previewVars(darkTheme)["--preview-color-background"]).not.toBe(
      vars["--preview-color-background"],
    );
  });

  it("reads the platform theme the toggle selects", () => {
    const darwin = previewVars(platformTheme(lightTheme, "darwin"));
    const win32 = previewVars(platformTheme(lightTheme, "win32"));

    expect(darwin["--preview-font-mono"]).toBe("Menlo");
    expect(win32["--preview-font-mono"]).toBe("Consolas");
    expect(win32["--preview-color-primary"]).toBe(
      darwin["--preview-color-primary"],
    );
  });

  it("carries every group a real platform variant will change", () => {
    const platform = extendTheme(lightTheme, {
      name: "Fixture platform",
      colors: { primary: "#123456" },
      spacing: { md: 99 },
      radius: { md: 99 },
      density: {
        controlHeight: { sm: 1, md: 2, lg: 3 },
        controlPaddingX: { sm: 4, md: 5, lg: 6 },
        rowHeight: 7,
      },
      borderWidth: { thin: 8, strong: 9 },
      iconSize: { xs: 10, sm: 11, md: 12, lg: 13, xl: 14 },
    });
    const next = previewVars(platform);

    expect(next["--preview-color-primary"]).toBe("#123456");
    expect(next["--preview-space-md"]).toBe("99px");
    expect(next["--preview-radius-md"]).toBe("99px");
    expect(next["--preview-control-height-md"]).toBe("2px");
    expect(next["--preview-control-padding-x-md"]).toBe("5px");
    expect(next["--preview-row-height"]).toBe("7px");
    expect(next["--preview-border-thin"]).toBe("8px");
    expect(next["--preview-icon-md"]).toBe("12px");
  });

  it("keeps a colour literal out of the preview source", () => {
    const forbidden = /#[0-9a-fA-F]{3,8}\b|\brgb|\bhsl|\boklch/;
    expect(source("./theme-surface.tsx")).not.toMatch(forbidden);
    expect(source("./approximations.tsx")).not.toMatch(forbidden);
  });
});
