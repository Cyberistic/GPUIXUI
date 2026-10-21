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
import { brandText, brandTextSurfaces } from "./brand-text.js";
import { linkStyles, paleBrand } from "./brand-text.example.js";
import { contrastFloorsFor } from "./audit.js";
import { alpha } from "./color.js";
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
  it("names the page and the two washes a link tints behind itself", () => {
    expect([...brandTextSurfaces].sort()).toEqual([
      "active",
      "background",
      "card",
      "hover",
      "muted",
      "popover",
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

  it("holds the documented example's three link states to the floor", () => {
    const states = linkStyles(lightTheme);
    expect(states.resting.color).toBe(brandText(lightTheme));
    expect(states.hover.backgroundColor).toBe(lightTheme.colors.hover);
    expect(states.pressed.backgroundColor).toBe(lightTheme.colors.active);
    // The text stays the same derived colour in all three states; what moves is
    // the wash the link tints behind itself.
    const over = {
      resting: lightTheme.colors.background,
      hover: lightTheme.colors.hover,
      pressed: lightTheme.colors.active,
    } as const;
    (["resting", "hover", "pressed"] as const).forEach((state) => {
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
