import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyStyle, highContrastThemes, themes, type Theme } from "./theme.js";
import { darkSyntax, syntaxRoles } from "./syntax.js";
import {
  platformStyles,
  systemUiFont,
  type PlatformStyle,
  type PlatformStyleSource,
} from "./platforms.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const flat = (text: string): string => text.replace(/\s+/g, " ");

const catalogue = flat(read("../../../docs/tokens.md"));
const designSystem = flat(read("../../../docs/design-system.md"));
const readme = flat(read("../README.md"));
const seam = flat(read("./theme.ts"));

const darwin: PlatformStyle = platformStyles.darwin;

const stored = (overrides: PlatformStyleSource): PlatformStyleSource => ({
  ...darwin,
  ...overrides,
});

const paintedOn = (
  theme: Theme,
  role: "primary" | "background",
): string | undefined => theme.colors[role];

describe("a platform style a store hands back", () => {
  it("applies the authored table exactly as it ships", () => {
    const resolved = applyStyle(themes.dark, darwin);

    expect(paintedOn(resolved, "primary")).toBe(darwin.colors.dark?.primary);
    expect(paintedOn(resolved, "background")).toBe(
      darwin.colors.dark?.background,
    );
    expect(resolved.radius.lg).toBe(darwin.radius.lg);
    expect(resolved.density.name).toBe(darwin.density);
    expect(resolved.name).toBe(`${themes.dark.name} · ${darwin.label}`);
    expect(resolved.switch).toEqual(darwin.switch?.dark);
    expect(resolved.switchMetrics).toEqual(darwin.switchMetrics);
  });

  it("keeps the palette of a style that lost its contrast label", () => {
    const lostLabel = stored({
      contrast: null,
      colors: {
        ...darwin.colors,
        dark: { ...darwin.colors.dark, primary: "#FF0000" },
      },
    });
    const resolved = applyStyle(themes.dark, lostLabel);

    expect(paintedOn(resolved, "primary")).toBe("#FF0000");

    expect(resolved.contrast).toBe(themes.dark.contrast);

    expect(
      paintedOn(
        applyStyle(themes.dark, stored({ contrast: "HIGH" })),
        "primary",
      ),
    ).toBe(darwin.colors.dark?.primary);

    const high = applyStyle(
      highContrastThemes.dark,
      stored({ colors: { ...darwin.colors, dark: { primary: "#FF0000" } } }),
    );

    expect(paintedOn(high, "primary")).toBe(
      highContrastThemes.dark.colors.primary,
    );
  });

  it("keeps the base's groups when the style lost them, instead of throwing", () => {
    const lostGroups = stored({
      colors: null,
      radius: null,
      density: null,
      switchMetrics: null,
      switch: null,
    });
    const resolved = applyStyle(themes.dark, lostGroups);

    expect(paintedOn(resolved, "background")).toBe(
      themes.dark.colors.background,
    );
    expect(resolved.radius.lg).toBe(themes.dark.radius.lg);
    expect(resolved.density).toEqual(themes.dark.density);

    expect(resolved.switch).toBeUndefined();
    expect(resolved.switchMetrics).toBeUndefined();

    expect(
      paintedOn(
        applyStyle(themes.dark, { ...darwin, colors: undefined }),
        "background",
      ),
    ).toBe(themes.dark.colors.background);
  });

  it("keeps the steps a stored style carries when it lost the rest of a scale", () => {
    const resolved = applyStyle(themes.dark, stored({ radius: { lg: 20 } }));

    expect(resolved.radius).toEqual({ ...themes.dark.radius, lg: 20 });
  });

  it("names the theme after the base when the style's label is not a name", () => {
    const unnamed: ReadonlyArray<unknown> = [null, undefined, "", "  ", 42];
    const names = unnamed.map(
      (label) => applyStyle(themes.dark, stored({ label })).name,
    );

    expect(names).toEqual(unnamed.map(() => themes.dark.name));
    expect(applyStyle(themes.dark, stored({ label: "House" })).name).toBe(
      `${themes.dark.name} · House`,
    );
  });

  it("reads a base whose name is not a name, instead of throwing", () => {
    const built = (name: unknown): Theme => ({ ...themes.dark, name }) as Theme;
    const unnamed: ReadonlyArray<unknown> = [JSON.parse("42"), "", "   ", true];
    const names = unnamed.map((name) => applyStyle(built(name), darwin).name);

    expect(names).toEqual(unnamed.map(() => `Theme · ${darwin.label}`));

    expect(applyStyle(themes.dark, darwin).name).toBe(
      `${themes.dark.name} · ${darwin.label}`,
    );
  });

  it("keeps the base's face when the style's family is not a name", () => {
    const baseFace = systemUiFont;
    const resolved = [null, undefined, "", "  ", 42].map((sans) =>
      applyStyle(themes.dark, stored({ sans })),
    );

    expect(themes.dark.typography.sans).toBe(baseFace);
    expect(resolved.map(({ typography }) => typography.sans)).toEqual(
      resolved.map(() => baseFace),
    );
    expect(
      applyStyle(themes.dark, stored({ sans: "Inter" })).typography.sans,
    ).toBe("Inter");
  });

  it("still refuses a density preset this release does not ship", () => {
    const stale = JSON.parse('{"density":"tiny"}') as PlatformStyleSource;

    expect(() => applyStyle(themes.dark, stale)).toThrow(
      "is not a density preset",
    );
  });

  it("completes a look's palette from the base, token by token", () => {
    const edited = stored({ syntax: { dark: { keyword: "#C7CBFF" } } });
    const resolved = applyStyle(themes.dark, edited);

    expect(resolved.syntax?.keyword).toBe("#C7CBFF");
    expect(resolved.syntax?.number).toBe(darkSyntax.number);
    expect(Object.keys(resolved.syntax ?? {})).toHaveLength(syntaxRoles.length);

    expect(applyStyle(themes.dark, darwin).syntax?.keyword).toBe(
      darwin.syntax?.dark?.keyword,
    );
  });

  it("teaches the stored style where the platform styles are documented", () => {
    expect(seam).toContain("style: PlatformStyleSource");
    expect(seam).toContain(
      "const applies = contrast === styleContrastOf(style)",
    );
    const pages: ReadonlyArray<readonly [string, string]> = [
      ["docs/tokens.md", catalogue],
      ["the package README", readme],
    ];
    const missing = pages.flatMap(([page, text]) => [
      ...(text.includes("PlatformStyleSource")
        ? []
        : [`${page} does not name PlatformStyleSource`]),
      ...(text.includes("states no variant")
        ? []
        : [`${page} does not teach the absent variant`]),
    ]);

    expect(missing).toEqual([]);
    expect(
      designSystem.includes("PlatformStyleSource"),
      "docs/design-system.md does not name PlatformStyleSource",
    ).toBe(true);
  });
});
