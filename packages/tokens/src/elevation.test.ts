/**
 * Guards the elevation scale fixed in plan 018: the runtime's `BoxShadow` has
 * five fields and the scale is designed as one shadow per level. The old tokens
 * shipped a level that could hold several shadows and an `inset` field the
 * runtime ignored, so part of a design silently did not paint. 0.11.0 accepts a
 * shadow list, but the scale still ships one entry by design, and the test keeps
 * it that way plus the exact five runtime fields.
 *
 * The tint is the other half: a level used to carry a literal colour, so a brand
 * that retinted `shadow` kept the library's grey shadows. A level is now its
 * geometry plus a share of the role, and `extendTheme` restates the inherited
 * levels when the role moves. The `shadow role` and `brand retint` suites fail
 * if a literal returns or an override stops following the role.
 */

import { describe, expect, it } from "vitest";
import {
  alpha,
  alphaOf,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
} from "./color.js";
import {
  darkElevation,
  elevationLevels,
  elevationShadow,
  elevationWithTint,
  highContrastDarkElevation,
  highContrastLightElevation,
  invalidShadowColors,
  lightElevation,
  type BoxShadow,
} from "./elevation.js";
import {
  createTheme,
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
} from "./theme.js";

/** The five fields the installed runtime's `BoxShadow` has, and nothing else. */
const runtimeFields = [
  "blurRadius",
  "color",
  "offsetX",
  "offsetY",
  "spreadRadius",
];

const levels = elevationLevels;

const color = /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;

const shipped = [
  ["light", lightElevation],
  ["dark", darkElevation],
  ["light theme", lightTheme.elevation],
  ["dark theme", darkTheme.elevation],
  ["high-contrast light theme", highContrastLightTheme.elevation],
  ["high-contrast dark theme", highContrastDarkTheme.elevation],
] as const;

describe("elevation levels", () => {
  it("ships at most one shadow per level by design", () => {
    shipped.forEach(([label, elevation]) => {
      levels.forEach((level) => {
        expect(
          elevation[level].length,
          `${label} ${level}`,
        ).toBeLessThanOrEqual(1);
      });
    });
  });

  it("uses exactly the runtime's shadow fields", () => {
    shipped.forEach(([label, elevation]) => {
      levels.forEach((level) => {
        elevation[level].forEach((shadow, index) => {
          expect(
            Object.keys(shadow).toSorted(),
            `${label} ${level} ${index}`,
          ).toEqual(runtimeFields);
        });
      });
    });
  });

  it("paints a colour the runtime can parse", () => {
    shipped.forEach(([label, elevation]) => {
      levels.forEach((level) => {
        elevation[level].forEach((shadow) => {
          expect(shadow.color, `${label} ${level}`).toMatch(color);
        });
      });
    });
  });

  it("lists the levels in the order a theme declares them", () => {
    // The index is what `scales.ts` walks to compare the elevation ladder, so it
    // has to be the order the catalogue prints and the shipped themes write.
    expect(elevationLevels).toEqual(Object.keys(lightElevation));
    expect(elevationLevels).toEqual(Object.keys(highContrastDarkElevation));
  });

  it("keeps the overlay level reserved and empty", () => {
    expect(lightElevation.overlay).toEqual([]);
    expect(darkElevation.overlay).toEqual([]);
  });

  it("paints a different shadow in light and dark", () => {
    expect(lightElevation.md).not.toEqual(darkElevation.md);
    expect(lightElevation.md[0]?.color).not.toBe(darkElevation.md[0]?.color);
  });
});

describe("elevationShadow", () => {
  it("resolves a level to its one designed shadow", () => {
    levels.slice(0, 3).forEach((level) => {
      expect(elevationShadow(lightTheme, level)).toBe(
        lightTheme.elevation[level][0],
      );
      expect(elevationShadow(darkTheme, level)).toBe(
        darkTheme.elevation[level][0],
      );
    });
  });

  it("is undefined for the reserved overlay level", () => {
    expect(elevationShadow(lightTheme, "overlay")).toBeUndefined();
    expect(elevationShadow(darkTheme, "overlay")).toBeUndefined();
  });

  it("follows a high-contrast theme's elevation", () => {
    expect(elevationShadow(highContrastDarkTheme, "lg")).toBe(
      highContrastDarkTheme.elevation.lg[0],
    );
  });
});

/** The share each shipped level paints of its theme's `shadow` role. */
const strengths = {
  light: { sm: 0.08, md: 0.12, lg: 0.16 },
  dark: { sm: 0.4, md: 0.65, lg: 0.8 },
} as const;

const rgb = (color: string): string => color.slice(0, 7);

describe("shadow role", () => {
  it("paints each level in the shadow role at its designed strength", () => {
    const sets = [
      ["light", lightColors.shadow, lightElevation, strengths.light],
      ["dark", darkColors.shadow, darkElevation, strengths.dark],
      [
        "high-contrast light",
        highContrastLightColors.shadow,
        highContrastLightElevation,
        strengths.light,
      ],
      [
        "high-contrast dark",
        highContrastDarkColors.shadow,
        highContrastDarkElevation,
        strengths.dark,
      ],
    ] as const;

    sets.forEach(([label, tint, elevation, share]) => {
      (["sm", "md", "lg"] as const).forEach((level) => {
        const painted = elevation[level][0]?.color ?? "";
        expect(rgb(painted), `${label} ${level} hue`).toBe(rgb(tint));
        expect(alphaOf(painted), `${label} ${level} strength`).toBeCloseTo(
          share[level],
          2,
        );
        expect(painted, `${label} ${level} re-stated`).toBe(
          alpha(tint, share[level]),
        );
      });
    });
  });

  it("gives every shipped theme a scale in its own shadow role", () => {
    // The claim the catalogue makes — a level is a geometry plus a share of the
    // `shadow` role — has to hold for the themes the library ships, not only
    // for the palettes the tables came from: a high-contrast theme that kept
    // the ordinary palette's grey shadow would paint a shadow its own role does
    // not describe.
    const themes = [
      ["light", lightTheme, strengths.light],
      ["dark", darkTheme, strengths.dark],
      ["high-contrast light", highContrastLightTheme, strengths.light],
      ["high-contrast dark", highContrastDarkTheme, strengths.dark],
    ] as const;

    themes.forEach(([label, theme, share]) => {
      (["sm", "md", "lg"] as const).forEach((level) => {
        const painted = theme.elevation[level][0]?.color ?? "";
        expect(rgb(painted), `${label} ${level} hue`).toBe(
          rgb(theme.colors.shadow),
        );
        expect(alphaOf(painted), `${label} ${level} strength`).toBeCloseTo(
          share[level],
          2,
        );
      });
    });
  });

  it("keeps the shipped shadow look", () => {
    // The role is the source of truth now; this pins the values it produces, so
    // a palette edit that changes a shadow is a deliberate change with a diff.
    expect(lightElevation.sm[0]?.color).toBe("#191D2514");
    expect(lightElevation.md[0]?.color).toBe("#191D251F");
    expect(lightElevation.lg[0]?.color).toBe("#191D2529");
    expect(darkElevation.sm[0]?.color).toBe("#00000066");
    expect(darkElevation.md[0]?.color).toBe("#000000A6");
    expect(darkElevation.lg[0]?.color).toBe("#000000CC");
  });

  it("shades the high-contrast scales in their own palette's role", () => {
    expect(highContrastLightElevation.sm[0]?.color).toBe("#00000014");
    expect(highContrastLightElevation.md[0]?.color).toBe("#0000001F");
    expect(highContrastLightElevation.lg[0]?.color).toBe("#00000029");
    expect(highContrastDarkElevation.sm[0]?.color).toBe("#4A4A4A66");
    expect(highContrastDarkElevation.md[0]?.color).toBe("#4A4A4AA6");
    expect(highContrastDarkElevation.lg[0]?.color).toBe("#4A4A4ACC");
  });
});

describe("brand retint", () => {
  const tint = "#0B1220";
  const geometry = (shadow: BoxShadow) => ({
    offsetX: shadow.offsetX,
    offsetY: shadow.offsetY,
    blurRadius: shadow.blurRadius,
    spreadRadius: shadow.spreadRadius,
  });

  it("restates a scale in the tint at each level's own strength", () => {
    const retinted = elevationWithTint(lightElevation, tint);
    levels.forEach((level) => {
      expect(retinted[level].length).toBe(lightElevation[level].length);
      retinted[level].forEach((shadow, index) => {
        const original = lightElevation[level][index];
        expect(original).toBeDefined();
        if (original === undefined) return;
        expect(shadow.color).toBe(alpha(tint, alphaOf(original.color)));
        expect(geometry(shadow)).toEqual(geometry(original));
      });
    });
  });

  it("retints every level a theme inherits", () => {
    const brand = extendTheme(lightTheme, { colors: { shadow: tint } });

    (["sm", "md", "lg"] as const).forEach((level) => {
      const retinted = brand.elevation[level][0]?.color ?? "";
      expect(rgb(retinted), `${level} hue`).toBe(tint);
      expect(retinted).not.toBe(lightTheme.elevation[level][0]?.color);
      expect(alphaOf(retinted)).toBeCloseTo(
        alphaOf(lightTheme.elevation[level][0]?.color ?? ""),
        2,
      );
      expect(elevationShadow(brand, level)).toBe(brand.elevation[level][0]);
    });
  });

  it("retints through createTheme's mode and contrast route", () => {
    const dark = createTheme({ mode: "dark", colors: { shadow: tint } });
    expect(rgb(dark.elevation.lg[0]?.color ?? "")).toBe(tint);
    const high = createTheme({
      mode: "light",
      contrast: "high",
      colors: { shadow: tint },
    });
    expect(rgb(high.elevation.md[0]?.color ?? "")).toBe(tint);
  });

  it("keeps an explicitly supplied level, colours and all", () => {
    const custom = {
      offsetX: 0,
      offsetY: 2,
      blurRadius: 4,
      spreadRadius: 0,
      color: "#00000040",
    };
    const brand = extendTheme(lightTheme, {
      colors: { shadow: tint },
      elevation: { md: [custom] },
    });

    expect(brand.elevation.md).toEqual([custom]);
    expect(rgb(brand.elevation.sm[0]?.color ?? "")).toBe(tint);
  });

  it("keeps the base scale when the shadow role is untouched", () => {
    const brand = extendTheme(lightTheme, { colors: { primary: "#6A45F0" } });
    expect(brand.elevation).toBe(lightTheme.elevation);
  });
});

describe("unpaintable shadow colours", () => {
  const shadow = (color: string): BoxShadow => ({
    offsetX: 0,
    offsetY: 2,
    blurRadius: 4,
    spreadRadius: 0,
    color,
  });

  it("reports nothing for a scale the library builds", () => {
    shipped.forEach(([label, elevation]) => {
      expect(invalidShadowColors({ elevation }), label).toEqual([]);
    });
  });

  it("names the level, the position and the value", () => {
    const brand = extendTheme(lightTheme, {
      elevation: { md: [shadow("#0B1220"), shadow("#12345")] },
    });

    expect(invalidShadowColors(brand)).toEqual([
      { level: "md", index: 1, color: "#12345" },
    ]);
  });

  it("reads a level a brand supplies whole, not only its first shadow", () => {
    // `elevationShadow` resolves the first entry, so an invalid colour behind a
    // valid one is the case a reader would otherwise never see.
    const brand = extendTheme(darkTheme, {
      elevation: { lg: [shadow("#00000066"), shadow("#0000006")] },
    });

    expect(invalidShadowColors(brand)).toEqual([
      { level: "lg", index: 1, color: "#0000006" },
    ]);
  });

  it("accepts the grammar the runtime parses and rejects a value no colour grammar reads", () => {
    const valid = extendTheme(lightTheme, {
      elevation: {
        sm: [shadow("#000000")],
        md: [shadow("#00000020")],
        lg: [shadow("black")],
      },
    });
    const invalid = extendTheme(lightTheme, {
      elevation: { sm: [shadow("blackened")], md: [shadow("")] },
    });

    expect(invalidShadowColors(valid)).toEqual([]);
    expect(invalidShadowColors(invalid)).toEqual([
      { level: "sm", index: 0, color: "blackened" },
      { level: "md", index: 0, color: "" },
    ]);
  });

  it("reports a retint through the shadow role only once the role itself is invalid", () => {
    // A valid role keeps every inherited level paintable; an invalid one is
    // already `invalidColorRoles`' report, and the shadow report follows it.
    const retinted = extendTheme(lightTheme, { colors: { shadow: "#0B1220" } });
    const broken = extendTheme(lightTheme, { colors: { shadow: "#0B122" } });

    expect(invalidShadowColors(retinted)).toEqual([]);
    expect(invalidShadowColors(broken)[0]?.level).toBe("sm");
  });
});
