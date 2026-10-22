/**
 * Guards brand-coloured text: a link or a text action is written in the theme's
 * `primary`, and `primary` is designed as a **fill**.
 *
 * The bug this holds: nothing measured the brand as text. The contrast table
 * measures `primaryForeground` on `primary` (its own on-colour) and the mark
 * contract measures `primary` at 3:1 as a bar or a dot, so a link painted in the
 * fill role passed every suite while it was unreadable — the base light theme's
 * brand is **4.30:1** on the `active` wash a pressed link tints behind itself,
 * against the 4.5:1 text floor, and macOS dark lands at **3.10:1** there (3.81:1
 * on its popover). `brandText` derives the colour from the brand instead of
 * storing a second palette, and this file holds it to the floor a reader needs
 * on every surface a link can sit on.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { brandText, brandTextSurfaces } from "./brand-text.js";
import { linkStyles, paleBrand } from "./brand-text.example.js";
import { alpha } from "./color.js";
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

/**
 * The repository source the row's wash is read from, once, when the suite
 * loads. `node:fs` is deliberate here for the same reason as in
 * `field-boundary.test.ts`: this holds the token contract to the two consumer
 * packages' painters, and `@gpuixui/tokens` keeps no dependency on either.
 */
const source = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** The surface a brand-coloured run is least readable on. */
const worstRatio = (theme: (typeof everyTheme)[number][1], colour: string) =>
  brandTextSurfaces.reduce<number | undefined>((worst, surface) => {
    const ratio = contrastRatio(colour, theme.colors[surface]);
    return worst === undefined || ratio === undefined
      ? undefined
      : Math.min(worst, ratio);
  }, Number.POSITIVE_INFINITY);

/** One `#RRGGBB` channel: 1 red, 3 green, 5 blue. */
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
    // The premise of the whole file: a link painted in `primary` is unreadable
    // in the theme the library itself ships, so the derivation is not a
    // preference.
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
    expect(popover).toBeCloseTo(3.81, 1);
  });
});

describe("the washes a row paints under brand text", () => {
  // The row is the surface a link action is read on: a `Box` fills `accent`
  // while the pointer is over it and `selected` once it is chosen, the list row
  // behind its `trailing` slot paints both, and the run inside keeps the
  // derived brand colour.
  const surfaces = source("../../primitives/src/core/style.ts");
  const recipes = source("../../primitives/src/recipe/index.ts");
  const row = source("../../components/src/list.tsx");

  it("reads the two painters that put brand text on a row", () => {
    // The surfaces are the box's own tones: a `Text tone="primary"` inside
    // `surface="accent"` or `surface="selected"` is a supported composition.
    expect(surfaces).toContain('"accent",\n  "selected",');
    // ... and the tone is the derived colour, not the fill role.
    expect(recipes).toContain('primary: "text-brand"');
    expect(recipes).toContain('link: "text-brand ');
    // The row that documents its trailing slot as the place for an action
    // paints both washes under it.
    expect(row).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(row).toContain("backgroundColor: theme.colors.selected");
  });

  it("finds the fill role under the floor on the washes a row paints", () => {
    // The premise: these are shipped styles, not a hypothetical brand.
    const darwinDark = platformTheme(themes.dark, "darwin");
    expect(
      contrastRatio(darwinDark.colors.primary, darwinDark.colors.accent),
    ).toBeCloseTo(3.06, 2);
    const linuxLight = platformTheme(themes.light, "linux");
    expect(
      contrastRatio(linuxLight.colors.primary, linuxLight.colors.accent),
    ).toBeCloseTo(3.67, 2);
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
    expect(accent).toBeCloseTo(3.06, 2);
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
    // Coverage is not the only reason: the Luna look's dark brand clears the six
    // page-and-wash surfaces, and its *derived* colour landed at 4.50:1 on the
    // row it selects — under the 4.5:1 floor — so this style steps once more.
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
    // The base dark theme's brand clears the floor as text, so a link there is
    // the brand itself; the base light theme's does not, so it moves.
    expect(brandText(darkTheme)).toBe(darkTheme.colors.primary);
    expect(brandText(lightTheme)).not.toBe(lightTheme.colors.primary);
    expect(brandText(lightTheme)).toBe("#5B48D0");
  });

  it("follows the theme's contrast variant rather than one fixed floor", () => {
    // 6.94:1 passes the default 4.5 but misses the 7:1 a high-contrast theme
    // asks for, so the same derivation steps once more there.
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
      // The 2% grid stops as soon as it clears: the result sits just above the
      // floor, not at the theme's foreground (which would be several points
      // further), so a link keeps its brand colour.
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
    // A brand whose foreground itself misses the floor cannot be rescued by a
    // derivation; the helper returns the theme's most readable role and does not
    // invent a colour outside the palette.
    const dim = extendTheme(lightTheme, { colors: { foreground: "#9AA3B2" } });
    expect(brandText(dim)).toBe(dim.colors.foreground);
  });

  it("holds the documented example's four link states to the floor", () => {
    const states = linkStyles(lightTheme);
    expect(states.resting.color).toBe(brandText(lightTheme));
    expect(states.hover.backgroundColor).toBe(lightTheme.colors.hover);
    expect(states.pressed.backgroundColor).toBe(lightTheme.colors.active);
    expect(states.row.backgroundColor).toBe(lightTheme.colors.selected);
    // The text stays the same derived colour in all four states; what moves is
    // the wash behind it.
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
