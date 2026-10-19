/**
 * Guards the defect plan 618 fixes: a `"default"` request over an AAA base kept
 * the base's elevation.
 *
 * `applyPlatformStyle` decides the palette, name, declaration and elevation
 * opacity from the requested level (plan 541). Its `"default"` branch merged a
 * style's partial elevation over the **base**, so a copied style that named a
 * colour but no elevation level, applied to the AAA dark base asking for
 * `"default"`, returned the default palette and its black `shadow` tint with the
 * AAA alphas (0.10 / 0.14 / 0.18 instead of 0.40 / 0.65 / 0.80). A 10% black
 * shadow on the default dark canvas is not perceivable: `themeFailures` rejected
 * the library's own result with 15 elevation pairs, worst **1.0175:1**.
 *
 * The levels a style does not name now come from the requested palette's
 * elevation; a level it names still wins, and a same-level base keeps its edits.
 * Every shipped style names `sm`, `md` and `lg`, so no shipped value moves.
 */
import { describe, expect, it } from "vitest";
import {
  colourOnlyStyle,
  defaultFromHighContrast,
} from "./applied-level.example.js";
import { elevationLevels, elevationShadow } from "./elevation.js";
import { platformStyles, type PlatformStyle } from "./platforms.js";
import { themeFailures } from "./theme-check.js";
import { applyPlatformStyle, extendTheme, getTheme } from "./theme.js";

describe("a default request owns the elevation it declares", () => {
  it("takes the requested palette's levels for a style that names none", () => {
    const intended = getTheme("dark");

    expect(defaultFromHighContrast.contrast).toBe("default");
    expect(defaultFromHighContrast.colors.shadow).toBe(intended.colors.shadow);
    elevationLevels.forEach((level) => {
      expect(elevationShadow(defaultFromHighContrast, level), level).toEqual(
        elevationShadow(intended, level),
      );
    });
    expect(themeFailures(defaultFromHighContrast)).toEqual([]);
  });

  it("keeps a level the style names and takes the rest from the palette", () => {
    const intended = getTheme("dark");
    const named: PlatformStyle = {
      ...colourOnlyStyle,
      types: { ...colourOnlyStyle.types, label: "Named level" },
      elevation: {
        light: {},
        dark: {
          sm: [
            {
              offsetX: 0,
              offsetY: 1,
              blurRadius: 3,
              spreadRadius: 0,
              alpha: 0.5,
            },
          ],
        },
      },
    };

    const themed = applyPlatformStyle(
      getTheme("dark", "high"),
      named,
      "default",
    );

    expect(themed.contrast).toBe("default");
    expect(elevationShadow(themed, "sm")?.blurRadius).toBe(3);
    expect(themed.elevation.sm[0]?.alpha).toBe(0.5);
    expect(elevationShadow(themed, "md")).toEqual(
      elevationShadow(intended, "md"),
    );
    expect(elevationShadow(themed, "lg")).toEqual(
      elevationShadow(intended, "lg"),
    );
    expect(themeFailures(themed)).toEqual([]);
  });

  it("keeps a same-level base's edited level", () => {
    const identity = getTheme("dark");
    const md = identity.elevation.md[0];
    expect(md).toBeDefined();
    const edited = extendTheme(identity, {
      elevation: {
        md: md === undefined ? [] : [{ ...md, blurRadius: 7 }],
      },
    });

    const themed = applyPlatformStyle(edited, colourOnlyStyle);

    expect(themed.contrast).toBe("default");
    expect(elevationShadow(themed, "md")?.blurRadius).toBe(7);
    expect(elevationShadow(themed, "sm")).toEqual(
      elevationShadow(identity, "sm"),
    );
  });

  it("still honours a high request", () => {
    const raised = applyPlatformStyle(
      getTheme("dark"),
      platformStyles.win32,
      "high",
    );
    const intended = getTheme("dark", "high");

    expect(raised.contrast).toBe("high");
    elevationLevels.forEach((level) => {
      // The platform lends the geometry; the AAA tint keeps the opacity
      // designed against it (plan 505), so the painted colour is the identity's.
      expect(elevationShadow(raised, level)?.color, level).toBe(
        elevationShadow(intended, level)?.color,
      );
    });
  });

  it("leaves the light AAA set unchanged", () => {
    // The light AAA set already carries the default light alphas, so this case
    // documents the asymmetry: the defect needs the AAA dark set's light tint.
    const themed = applyPlatformStyle(
      getTheme("light", "high"),
      colourOnlyStyle,
      "default",
    );
    const intended = getTheme("light");

    elevationLevels.forEach((level) => {
      expect(elevationShadow(themed, level), level).toEqual(
        elevationShadow(intended, level),
      );
    });
  });
});
