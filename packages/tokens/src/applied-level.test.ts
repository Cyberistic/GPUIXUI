/**
 * Guards the defect plan 541 fixed: `applyPlatformStyle` derived the palette,
 * the name and the elevation opacity from three different inputs, so three
 * documented calls returned a theme that lied about itself.
 *
 * - `applyPlatformStyle(getTheme("light"), darwin, "high")` returned a `default`
 *   theme: the caller asked for the accessibility level and received the other
 *   one. `themeFailures` returned `[]` because the result declared `default`,
 *   while `themeContrastFailures(result, "high")` reported **180** pairs.
 * - `applyPlatformStyle(getTheme("light", "high"), darwin, "default")` returned
 *   the default palette under the name **"High contrast light · macOS"**: plan
 *   373 replaced the palette as a set, but the name still came from the base.
 * - A shape-only style applied at `"default"` over the AAA dark base kept the
 *   AAA palette (plan 301) and took the style's default-level alpha, so
 *   `elevationShadow(themed, "md")` painted **`#FFFFFFA6`** — 65% of the AAA
 *   set's light tint, the near-white halo plan 505 exists to prevent — while
 *   every check returned `[]`.
 *
 * The fix makes one decision: the requested level decides the palette, and the
 * palette decides the name, the declaration and the elevation opacity. The cases
 * below fail on the pre-plan code.
 */
import { describe, expect, it } from "vitest";
import { themeContrastFailures } from "./contrast.js";
import { elevationLevels, elevationShadow } from "./elevation.js";
import {
  platformNames,
  platformStyles,
  type PlatformStyle,
} from "./platforms.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
  platformRecipes,
} from "./platform-recipes.js";
import { shippedThemes } from "./shipped-themes.js";
import {
  applyPlatformStyle,
  extendTheme,
  getPlatformTheme,
  getTheme,
  highContrastDarkTheme,
  themeContrasts,
  themeModes,
} from "./theme.js";
import { themeFailures } from "./theme-check.js";
import {
  acmeWindows,
  highContrastWindows,
  highContrastWindowsLevel,
  highContrastWindowsMd,
  windowsHigh,
} from "./applied-level.example.js";

/** A style with no colours and the Windows default-level elevation alphas. */
const shapeOnlyStyle: PlatformStyle = {
  ...platformStyles.default,
  types: { ...platformStyles.default.types, label: "Shape only" },
  colors: { light: {}, dark: {} },
  elevation: platformStyles.win32.elevation,
};

/** The platform variants that carry their own style. */
const styledPlatforms = platformNames.filter((name) => name !== "default");

describe("a requested level supplies its palette", () => {
  it("builds the AAA palette for a high request on a default base", () => {
    themeModes.forEach((mode) => {
      const raised = applyPlatformStyle(
        getTheme(mode),
        platformStyles.darwin,
        "high",
      );

      expect(raised.contrast, mode).toBe("high");
      expect(raised.colors, mode).toEqual(getTheme(mode, "high").colors);
      expect(themeFailures(raised), mode).toEqual([]);
      expect(themeContrastFailures(raised, "high"), mode).toEqual([]);
    });
  });

  it("ignores a style's default-level colours at high contrast", () => {
    themeModes.forEach((mode) => {
      const raised = applyPlatformStyle(
        getTheme(mode),
        platformStyles.win32,
        "high",
      );

      expect(raised.colors.primary, mode).toBe(
        getTheme(mode, "high").colors.primary,
      );
      expect(raised.colors.primary, mode).not.toBe(
        platformStyles.win32.colors[mode].primary,
      );
    });
  });

  it("keeps the AAA tint's opacity on the platform geometry", () => {
    const raised = applyPlatformStyle(
      getTheme("dark"),
      platformStyles.darwin,
      "high",
    );

    expect(elevationShadow(raised, "md")?.color).toBe(
      elevationShadow(highContrastDarkTheme, "md")?.color,
    );
    expect(elevationShadow(raised, "md")?.blurRadius).toBe(
      platformStyles.darwin.elevation.dark.md?.[0]?.blurRadius,
    );
  });
});

describe("the name follows the palette", () => {
  it("names the default palette a default request carries", () => {
    const dropped = applyPlatformStyle(
      getTheme("light", "high"),
      platformStyles.darwin,
      "default",
    );

    expect(dropped.name).toBe("Light · macOS");
    expect(dropped.colors).toEqual(
      getPlatformTheme("darwin", "light", "default").colors,
    );
  });

  it("names the AAA palette a high request carries", () => {
    const raised = applyPlatformStyle(
      getTheme("light"),
      platformStyles.darwin,
      "high",
    );

    expect(raised.name).toBe("High contrast light · macOS");
  });

  it("keeps a same-level base's name, edits and declaration", () => {
    const brand = extendTheme(getTheme("dark", "high"), {
      name: "Acme",
      colors: { successSoft: "#123456" },
    });

    const themed = applyPlatformStyle(brand, platformStyles.darwin);

    expect(themed.name).toBe("Acme · macOS");
    expect(themed.contrast).toBe("high");
    expect(themed.colors.successSoft).toBe("#123456");
    expect(elevationShadow(themed, "md")?.color).toBe(
      elevationShadow(brand, "md")?.color,
    );
  });
});

describe("a shape-only style changes no colour", () => {
  it("keeps the base's level, name and AAA opacity", () => {
    const themed = applyPlatformStyle(
      getTheme("dark", "high"),
      shapeOnlyStyle,
      "default",
    );

    expect(themed.contrast).toBe("high");
    expect(themed.name).toBe("High contrast dark · Shape only");
    expect(themed.colors).toEqual(getTheme("dark", "high").colors);
    // The style lends its geometry; the AAA set keeps the opacity its light
    // tint was designed with (plan 505). The old code painted 65% of white.
    expect(elevationShadow(themed, "md")?.color).toBe(
      elevationShadow(highContrastDarkTheme, "md")?.color,
    );
  });

  it("keeps a default base's level for a shape-only style", () => {
    const themed = applyPlatformStyle(
      getTheme("light"),
      shapeOnlyStyle,
      "default",
    );

    expect(themed.contrast).toBe("default");
    expect(themed.colors).toEqual(getTheme("light").colors);
  });
});

describe("no shipped variant moves", () => {
  it("keeps every shipped name and declaration", () => {
    shippedThemes.forEach(({ theme }) => {
      const identity = getTheme(theme.mode, theme.contrast);
      expect(theme.contrast, theme.name).toBe(identity.contrast);
      expect(
        theme.name === identity.name ||
          theme.name.startsWith(`${identity.name} · `),
        theme.name,
      ).toBe(true);
    });
  });

  it("keeps the AAA opacity on every shipped high-contrast style", () => {
    themeModes.forEach((mode) => {
      const identity = getTheme(mode, "high");
      styledPlatforms.forEach((platform) => {
        const themed = getPlatformTheme(platform, mode, "high");
        elevationLevels.forEach((level) => {
          expect(
            elevationShadow(themed, level)?.color,
            `${platform} ${mode} ${level}`,
          ).toBe(elevationShadow(identity, level)?.color);
        });
      });
    });
  });

  it("keeps each recipe's shipped name and level", () => {
    platformRecipeNames.forEach((recipe) => {
      themeModes.forEach((mode) => {
        themeContrasts.forEach((contrast) => {
          const themed = getPlatformRecipeTheme(recipe, mode, contrast);
          const identity = getTheme(mode, contrast);
          const label = platformRecipes[recipe].types.label;
          expect(themed.contrast, `${recipe} ${mode} ${contrast}`).toBe(
            contrast,
          );
          expect(themed.name, `${recipe} ${mode} ${contrast}`).toBe(
            `${identity.name} · ${label}`,
          );
        });
      });
    });
  });
});

describe("the copyable example", () => {
  it("carries the level it asks for", () => {
    expect(highContrastWindowsLevel).toBe("high");
    expect(highContrastWindows.colors).toEqual(getTheme("dark", "high").colors);
    expect(highContrastWindowsMd).toBe(
      elevationShadow(highContrastDarkTheme, "md")?.color,
    );
    expect(acmeWindows.name).toBe("Acme · Windows");
    expect(windowsHigh.colors).toEqual(highContrastWindows.colors);
  });
});
