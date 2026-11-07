import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { brandText, brandTextOn, brandTextSurfaces } from "./brand-text.js";
import {
  linkStyles,
  messageLinkStyles,
  paleBrand,
} from "./brand-text.example.js";
import { alpha, isColorRole } from "./color.js";
import { contrastFloorsFor } from "./contrast.js";
import { contrastFloors, contrastRatio } from "./contrast.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
} from "./theme.js";

const shippedThemes = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["high-contrast light", highContrastLightTheme],
  ["high-contrast dark", highContrastDarkTheme],
] as const;

const platformThemes = platformNames.flatMap(
  (name) =>
    [
      [`${name} light`, platformTheme(themes.light, name)],
      [`${name} dark`, platformTheme(themes.dark, name)],
    ] as const,
);

const retroThemes = retroNames.flatMap(
  (look) =>
    [
      [`${look} light`, retroTheme(themes.light, look)],
      [`${look} dark`, retroTheme(themes.dark, look)],
    ] as const,
);

const everyTheme = [...shippedThemes, ...platformThemes, ...retroThemes];

const source = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const worstRatio = (theme: (typeof everyTheme)[number][1], colour: string) =>
  brandTextSurfaces.reduce<number | undefined>((worst, surface) => {
    const ratio = contrastRatio(colour, theme.colors[surface]);
    return worst === undefined || ratio === undefined
      ? undefined
      : Math.min(worst, ratio);
  }, Number.POSITIVE_INFINITY);

const channelAt = (colour: string, at: number): number =>
  Number.parseInt(colour.slice(at, at + 2), 16);

describe("the surfaces a brand-coloured run can sit on", () => {
  it("names the page, the washes a link tints and the washes a row paints", () => {
    expect([...brandTextSurfaces].sort()).toEqual([
      "accent",
      "active",
      "background",
      "card",
      "hover",
      "muted",
      "popover",
      "selected",
    ]);
  });

  it("measures the fill role below the text floor on the pressed wash", () => {
    const pressed = contrastRatio(
      lightTheme.colors.primary,
      lightTheme.colors.active,
    );
    expect(pressed).toBeCloseTo(4.3, 1);
    expect(pressed).toBeLessThan(contrastFloors.secondary);
    const popover = contrastRatio(
      platformTheme(themes.dark, "darwin").colors.primary,
      platformTheme(themes.dark, "darwin").colors.popover,
    );
    expect(popover).toBeCloseTo(4.94, 1);
  });
});

describe("the washes a row paints under brand text", () => {
  const surfaces = source("../../primitives/src/core/style.ts");
  const recipes = source("../../primitives/src/recipe/index.ts");
  const row = source("../../components/src/list.tsx");

  it("reads the two painters that put brand text on a row", () => {
    expect(surfaces).toContain('"accent",\n  "selected",');

    expect(recipes).toContain('primary: "text-brand"');
    expect(recipes).toContain('link: "text-brand ');

    expect(row).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(row).toContain("backgroundColor: theme.colors.selected");
  });

  it("finds the fill role under the floor on the washes a row paints", () => {
    const darwinDark = platformTheme(themes.dark, "darwin");
    expect(
      contrastRatio(darwinDark.colors.primary, darwinDark.colors.accent),
    ).toBeCloseTo(3.96, 2);
    const linuxLight = platformTheme(themes.light, "linux");
    expect(
      contrastRatio(linuxLight.colors.primary, linuxLight.colors.accent),
    ).toBeCloseTo(3.88, 2);
    const lunaDark = retroTheme(themes.dark, "luna");
    expect(
      contrastRatio(lunaDark.colors.primary, lunaDark.colors.selected),
    ).toBeCloseTo(4.45, 2);
    expect(lunaDark.colors.primary).not.toBe(brandText(lunaDark));
  });

  it("prints the row-wash measurements on the catalogue page", () => {
    const page = source("../../../docs/tokens.md").replace(/\s+/g, " ");
    const darwinDark = platformTheme(themes.dark, "darwin");
    const lunaDark = retroTheme(themes.dark, "luna");
    const accent = contrastRatio(
      darwinDark.colors.primary,
      darwinDark.colors.accent,
    );
    const selected = contrastRatio(
      lunaDark.colors.primary,
      lunaDark.colors.selected,
    );
    expect(accent).toBeCloseTo(3.96, 2);
    expect(selected).toBeCloseTo(4.45, 2);
    expect(page).toContain("the two washes a **row** paints");
    expect(page).toContain(
      `| \`primary\` on the \`accent\` wash a hovered row paints | macOS dark | ${(accent ?? 0).toFixed(2)}:1 |`,
    );
    expect(page).toContain(
      `| \`primary\` on \`selected\` | Windows XP (Luna) dark | ${(selected ?? 0).toFixed(2)}:1 |`,
    );
  });

  it("holds the derived colour on both row washes in every style", () => {
    everyTheme.forEach(([label, theme]) => {
      const text = brandText(theme);
      const floor = contrastFloorsFor(theme).secondary;
      (["accent", "selected"] as const).forEach((surface) => {
        const ratio = contrastRatio(text, theme.colors[surface]);
        expect(ratio, `${label} on ${surface}`).toBeDefined();
        expect(ratio ?? 0, `${label} on ${surface}`).toBeGreaterThanOrEqual(
          floor,
        );
      });
    });
  });

  it("moves the one shipped brand that landed under the floor on a row", () => {
    const luna = retroTheme(themes.dark, "luna");
    const floor = contrastFloorsFor(luna).secondary;
    expect(contrastRatio("#7CB1FF", luna.colors.selected) ?? 0).toBeLessThan(
      floor,
    );
    expect(brandText(luna)).not.toBe("#7CB1FF");
    expect(
      contrastRatio(brandText(luna), luna.colors.selected) ?? 0,
    ).toBeGreaterThanOrEqual(floor);
  });
});

describe("brand text", () => {
  it("clears the text floor on every surface in every shipped style", () => {
    everyTheme.forEach(([label, theme]) => {
      const text = brandText(theme);
      const floor = contrastFloorsFor(theme).secondary;
      brandTextSurfaces.forEach((surface) => {
        const ratio = contrastRatio(text, theme.colors[surface]);
        expect(ratio, `${label} on ${surface}`).toBeDefined();
        expect(ratio ?? 0, `${label} on ${surface}`).toBeGreaterThanOrEqual(
          floor,
        );
      });
    });
  });

  it("paints an opaque colour the renderer can lay out", () => {
    everyTheme.forEach(([label, theme]) => {
      expect(brandText(theme), label).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  it("keeps a brand that already reads, and moves the one that does not", () => {
    expect(brandText(darkTheme)).toBe(darkTheme.colors.primary);
    expect(brandText(lightTheme)).not.toBe(lightTheme.colors.primary);
    expect(brandText(lightTheme)).toBe("#5B48D0");
  });

  it("follows the theme's contrast variant rather than one fixed floor", () => {
    const raw = contrastRatio(
      highContrastDarkTheme.colors.primary,
      highContrastDarkTheme.colors.active,
    );
    expect(raw).toBeCloseTo(6.94, 1);
    expect(brandText(highContrastDarkTheme)).not.toBe(
      highContrastDarkTheme.colors.primary,
    );
    expect(
      worstRatio(highContrastDarkTheme, brandText(highContrastDarkTheme)) ?? 0,
    ).toBeGreaterThanOrEqual(
      contrastFloorsFor(highContrastDarkTheme).secondary,
    );
  });

  it("moves toward the theme's foreground by the smallest step that reads", () => {
    everyTheme.forEach(([label, theme]) => {
      const text = brandText(theme);
      const brand = theme.colors.primary;
      if (text === brand) {
        return;
      }
      const floor = contrastFloorsFor(theme).secondary;
      const worst = worstRatio(theme, text) ?? 0;

      expect(worst, label).toBeGreaterThanOrEqual(floor);
      expect(worst, label).toBeLessThan(floor + 0.2);
    });
  });

  it("follows a brand's own primary rather than a stored link colour", () => {
    expect(brandText(paleBrand)).not.toBe(paleBrand.colors.primary);
    expect(
      worstRatio(paleBrand, brandText(paleBrand)) ?? 0,
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);
  });

  it("returns a colour it cannot measure unchanged instead of guessing", () => {
    const unpaintable = extendTheme(lightTheme, {
      colors: { primary: "#NOPE" },
    });
    expect(brandText(unpaintable)).toBe("#NOPE");
    const translucent = extendTheme(lightTheme, {
      colors: { primary: alpha(lightTheme.colors.primary, 0.5) },
    });
    expect(brandText(translucent)).toBe(alpha(lightTheme.colors.primary, 0.5));
  });

  it("stops at the theme's own foreground when that is the best it has", () => {
    const dim = extendTheme(lightTheme, { colors: { foreground: "#9AA3B2" } });
    expect(brandText(dim)).toBe(dim.colors.foreground);
  });

  it("holds the documented example's four link states to the floor", () => {
    const states = linkStyles(lightTheme);
    expect(states.resting.color).toBe(brandText(lightTheme));
    expect(states.hover.backgroundColor).toBe(lightTheme.colors.hover);
    expect(states.pressed.backgroundColor).toBe(lightTheme.colors.active);
    expect(states.row.backgroundColor).toBe(lightTheme.colors.selected);

    const over = {
      resting: lightTheme.colors.background,
      hover: lightTheme.colors.hover,
      pressed: lightTheme.colors.active,
      row: lightTheme.colors.selected,
    } as const;
    (["resting", "hover", "pressed", "row"] as const).forEach((state) => {
      expect(
        contrastRatio(states[state].color, over[state]),
        `${state} link`,
      ).toBeGreaterThanOrEqual(contrastFloors.secondary);
    });
  });

  it("moves only toward the theme's foreground, one channel at a time", () => {
    everyTheme.forEach(([label, theme]) => {
      const text = brandText(theme);
      [1, 3, 5].forEach((at) => {
        const value = channelAt(text, at);
        const low = Math.min(
          channelAt(theme.colors.primary, at),
          channelAt(theme.colors.foreground, at),
        );
        const high = Math.max(
          channelAt(theme.colors.primary, at),
          channelAt(theme.colors.foreground, at),
        );
        expect(value, `${label} channel ${at}`).toBeGreaterThanOrEqual(low);
        expect(value, `${label} channel ${at}`).toBeLessThanOrEqual(high);
      });
    });
  });
});

describe("brand text on a message's own tint", () => {
  const tints = [
    "infoSoft",
    "successSoft",
    "warningSoft",
    "destructiveSoft",
  ] as const;

  const placements = everyTheme.flatMap(([label, theme]) => {
    const floor = contrastFloorsFor(theme).secondary;
    const shared = brandText(theme);
    return tints.map((tint) => ({
      label,
      theme,
      tint,
      shared,
      floor,
      ratio: contrastRatio(shared, theme.colors[tint]) ?? 0,
    }));
  });

  it("reads the painters that put a brand run on a message", () => {
    const recipes = source("../../tw/src/recipes.ts");
    const registry = source("../../primitives/src/recipe/registry.ts");

    expect(recipes).toContain(
      'info: "bg-infoSoft text-infoSoftForeground border-info/30"',
    );
    expect(recipes).toContain(
      'warning: "bg-warningSoft text-warningSoftForeground border-warning/30"',
    );
    expect(recipes).toContain("export const ALERT_DESCRIPTION");

    expect(registry).toContain(
      '"text-brand": (theme) => ({ color: brandText(theme) })',
    );

    const sharedSurfaces: readonly string[] = brandTextSurfaces;
    tints.forEach((tint) => expect(sharedSurfaces).not.toContain(tint));
  });

  it("measures the shared colour under the text floor on a message tint", () => {
    const under = placements.filter(({ ratio, floor }) => ratio < floor);

    expect(under.length).toBeGreaterThan(0);
    expect(placements.length).toBe(72);

    const light = placements.find(
      ({ label, tint }) => label === "light" && tint === "infoSoft",
    );
    expect(light?.ratio).toBeCloseTo(4.46, 2);
    expect(light?.ratio ?? 0).toBeLessThan(light?.floor ?? 0);

    const dark = placements.find(
      ({ label, tint }) => label === "dark" && tint === "warningSoft",
    );
    expect(dark?.ratio).toBeCloseTo(3.94, 2);

    const darwinDark = platformTheme(themes.dark, "darwin");
    expect(
      contrastRatio(darwinDark.colors.primary, darwinDark.colors.warningSoft),
    ).toBeCloseTo(3.01, 2);
    const worst = placements.reduce((low, placement) =>
      placement.ratio < low.ratio ? placement : low,
    );
    expect(`${worst.label} ${worst.tint}`).toBe("darwin dark warningSoft");
    expect(worst.ratio).toBeCloseTo(3.43, 2);
  });

  it("derives a colour every tint can carry, in every shipped style", () => {
    everyTheme.forEach(([label, theme]) => {
      const floor = contrastFloorsFor(theme).secondary;
      tints.forEach((tint) => {
        const ratio = contrastRatio(
          brandTextOn(theme, tint),
          theme.colors[tint],
        );
        expect(ratio, `${label} on ${tint}`).toBeDefined();
        expect(ratio ?? 0, `${label} on ${tint}`).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("keeps the brand where the tint carries it, and steps where it does not", () => {
    expect(brandTextOn(darkTheme, "infoSoft")).toBe(darkTheme.colors.primary);
    expect(brandTextOn(lightTheme, "successSoft")).toBe(
      lightTheme.colors.primary,
    );
    expect(brandTextOn(darkTheme, "warningSoft")).not.toBe(
      darkTheme.colors.primary,
    );
    expect(brandTextOn(lightTheme, "infoSoft")).not.toBe(
      lightTheme.colors.primary,
    );

    expect(brandTextOn(lightTheme, "infoSoft")).not.toBe(brandText(lightTheme));
  });

  it("holds a high-contrast tint to the 7:1 its variant asks for", () => {
    const raw = contrastRatio(
      highContrastLightTheme.colors.primary,
      highContrastLightTheme.colors.infoSoft,
    );
    expect(raw).toBeCloseTo(5.81, 2);
    expect(raw ?? 0).toBeLessThan(7);
    const derived = brandTextOn(highContrastLightTheme, "infoSoft");
    expect(derived).not.toBe(highContrastLightTheme.colors.primary);
    expect(
      contrastRatio(derived, highContrastLightTheme.colors.infoSoft) ?? 0,
    ).toBeGreaterThanOrEqual(7);
  });

  it("returns a colour it cannot measure unchanged instead of guessing", () => {
    const unpaintable = extendTheme(lightTheme, {
      colors: { primary: "#NOPE" },
    });
    expect(brandTextOn(unpaintable, "infoSoft")).toBe("#NOPE");
    const translucent = extendTheme(lightTheme, {
      colors: { primary: alpha(lightTheme.colors.primary, 0.5) },
    });
    expect(brandTextOn(translucent, "infoSoft")).toBe(
      alpha(lightTheme.colors.primary, 0.5),
    );
  });

  it("runs the documented message link over the theme's tints", () => {
    const link = messageLinkStyles(lightTheme);
    expect(link.color).toBe(brandTextOn(lightTheme, "infoSoft"));
    expect(link.backgroundColor).toBe(lightTheme.colors.infoSoft);
    expect(
      contrastRatio(link.color, link.backgroundColor) ?? 0,
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);
  });

  it("prints the tint measurements and the rule on the pages that teach it", () => {
    const page = source("../../../docs/tokens.md").replace(/\s+/g, " ");
    const designSystem = source("../../../docs/design-system.md").replace(
      /\s+/g,
      " ",
    );
    const readme = source("../../../packages/tokens/README.md").replace(
      /\s+/g,
      " ",
    );
    const under = placements.filter(({ ratio, floor }) => ratio < floor);
    const darwinDark = platformTheme(themes.dark, "darwin");
    const fill = contrastRatio(
      darwinDark.colors.primary,
      darwinDark.colors.warningSoft,
    );
    const shared = contrastRatio(
      brandText(darwinDark),
      darwinDark.colors.warningSoft,
    );
    expect(page).toContain(
      `the shared colour is under its floor in **${under.length} of the ${placements.length}** tint placements`,
    );
    expect(page).toContain(
      `| \`primary\` on \`warningSoft\` | macOS dark | **${(fill ?? 0).toFixed(2)}:1** |`,
    );
    expect(page).toContain(
      `| the shared colour on \`warningSoft\` | macOS dark | **${(shared ?? 0).toFixed(2)}:1** |`,
    );
    expect(page).toContain("brandTextOn(theme, surface)");
    expect(page).toContain("statusTone(theme, tone).foreground");

    expect(designSystem).toContain(
      `under the floor in ${under.length} of the ${placements.length} tint placements`,
    );
    expect(designSystem).toContain("brandTextOn(theme, surface)");

    expect(page).toContain(
      `Measured across the ${everyTheme.length} shipped styles`,
    );

    expect(readme).toContain(
      `in ${under.length} of the ${placements.length} tint placements`,
    );
  });
});

describe("a surface name this release does not ship", () => {
  const stored = (value: string): keyof typeof lightTheme.colors =>
    value as keyof typeof lightTheme.colors;

  const documents = (): Readonly<Record<string, string>> => ({
    "docs/tokens.md": source("../../../docs/tokens.md").replace(/\s+/g, " "),
    "docs/design-system.md": source("../../../docs/design-system.md").replace(
      /\s+/g,
      " ",
    ),
    "packages/tokens/README.md": source("../README.md").replace(/\s+/g, " "),
    ".agents/slop/COMPONENTS.md": source(
      "../../../.agents/slop/COMPONENTS.md",
    ).replace(/\s+/g, " "),
  });

  it("answers the anywhere-safe brand, not the unmeasured fill", () => {
    const unknown = stored("cardHover");

    expect(
      contrastRatio(lightTheme.colors.primary, lightTheme.colors.active),
    ).toBeCloseTo(4.3, 1);
    expect(brandTextOn(lightTheme, unknown)).toBe(brandText(lightTheme));
    expect(brandTextOn(darkTheme, unknown)).toBe(brandText(darkTheme));
    expect(brandTextOn(lightTheme, unknown)).not.toBe(
      lightTheme.colors.primary,
    );
    expect(isColorRole(unknown)).toBe(false);
  });

  it("reads on every surface a link can sit on, in every shipped style", () => {
    everyTheme.forEach(([label, theme]) => {
      const colour = brandTextOn(theme, stored("cardHover"));
      expect(worstRatio(theme, colour) ?? 0, label).toBeGreaterThanOrEqual(
        contrastFloorsFor(theme).secondary,
      );
    });
  });

  it("names the rule and the guard where a consumer reads it", () => {
    Object.entries(documents()).forEach(([name, text]) => {
      expect(text, name).toContain("isColorRole");
      expect(text, name).toContain("surface name this release does not ship");
      expect(text, name).toContain("anywhere-safe brand");
    });
  });
});
