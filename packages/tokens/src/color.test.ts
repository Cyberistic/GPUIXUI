/**
 * Guards the WCAG contrast floors of every semantic text/surface pair in every
 * shipped theme, including the high-contrast variants. A palette edit that makes
 * text unreadable fails here rather than shipping.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  alpha,
  colorRoles,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  palette,
  type ThemeColors,
} from "./color.js";

import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  type ContrastPairClass,
} from "./contrast.js";

interface ColourSet {
  readonly label: string;
  readonly colors: ThemeColors;
  readonly floors: Readonly<Record<ContrastPairClass, number>>;
}

const colourSets: readonly ColourSet[] = [
  {
    label: "light",
    colors: lightColors,
    floors: contrastFloors.default,
  },
  {
    label: "dark",
    colors: darkColors,
    floors: contrastFloors.default,
  },
  {
    label: "high-contrast light",
    colors: highContrastLightColors,
    floors: contrastFloors.high,
  },
  {
    label: "high-contrast dark",
    colors: highContrastDarkColors,
    floors: contrastFloors.high,
  },
];

describe("semantic colour contrast", () => {
  colourSets.forEach(({ label, colors, floors }) => {
    contrastPairs.forEach(([foreground, background, pairClass]) => {
      it(`${label}: ${foreground} on ${background} meets ${floors[pairClass]}:1`, () => {
        expect(
          contrastRatio(colors[foreground], colors[background]),
          `${label} ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floors[pairClass]);
      });
    });
  });
});

describe("text selection", () => {
  const surfaces = ["background", "card"] as const;

  colourSets.forEach(({ label, colors, floors }) => {
    it(`${label}: selection is a translucent wash`, () => {
      expect(colors.selection).toMatch(/^#[0-9A-F]{8}$/);
    });

    it(`${label}: selectionOnFill is a translucent veil`, () => {
      expect(colors.selectionOnFill).toMatch(/^#[0-9A-F]{8}$/);
      expect(colors.selectionOnFill).not.toBe(colors.selection);
    });

    surfaces.forEach((surface) => {
      it(`${label}: body text stays readable on ${surface} under the selection wash`, () => {
        expect(
          contrastRatio(
            colors.foreground,
            compositeOver(colors.selection, colors[surface]),
          ),
          `${label} ${surface}`,
        ).toBeGreaterThanOrEqual(floors.body);
      });
    });
  });
});

describe("colour roles", () => {
  it("uses a colour grammar GPUix can paint", () => {
    const grammar = /^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8})$/;
    colourSets.forEach(({ label, colors }) => {
      Object.entries(colors).forEach(([role, value]) => {
        expect(value, `${label}.${role}`).toMatch(grammar);
      });
    });
  });

  it("defines the same roles in every theme", () => {
    const roles = new Set(Object.keys(lightColors));
    colourSets.forEach(({ label, colors }) => {
      expect(new Set(Object.keys(colors)), label).toEqual(roles);
    });
  });

  it("is not a copy of the light theme", () => {
    expect(lightColors.background).not.toBe(darkColors.background);
    expect(lightColors.foreground).not.toBe(darkColors.foreground);
    expect(lightColors.primary).not.toBe(darkColors.primary);
  });

  it("differs from the default theme it raises", () => {
    expect(highContrastLightColors.mutedForeground).not.toBe(
      lightColors.mutedForeground,
    );
    expect(highContrastLightColors.background).not.toBe(lightColors.background);
    expect(highContrastDarkColors.background).not.toBe(darkColors.background);
  });

  it("indexes every role in documentation order", () => {
    expect(colorRoles).toEqual(Object.keys(lightColors));
  });

  it("states the shipped role count in the high-contrast JSDoc", () => {
    // `node:fs` is deliberate: this is a policy test over the package's own
    // source, and the package ships zero dependencies (see exports.test.ts).
    const source = readFileSync(new URL("./color.ts", import.meta.url), "utf8");
    const claims = [...source.matchAll(/The same (\d+) roles/g)];
    expect(claims).toHaveLength(2);
    claims.forEach(([, count]) => {
      expect(Number(count), "high-contrast JSDoc").toBe(colorRoles.length);
    });
  });

  it("moves every filled surface away from its resting role", () => {
    colourSets.forEach(({ label, colors }) => {
      const families = ["primary", "secondary", "destructive"] as const;
      families.forEach((family) => {
        expect(colors[`${family}Hover`], label).not.toBe(colors[family]);
        expect(colors[`${family}Active`], label).not.toBe(colors[family]);
        expect(colors[`${family}Active`], label).not.toBe(
          colors[`${family}Hover`],
        );
      });
    });
  });

  it("gives status text a tonality of its own", () => {
    const families = ["info", "success", "warning", "destructive"] as const;
    colourSets.forEach(({ label, colors }) => {
      families.forEach((family) => {
        expect(colors[`${family}Text`], `${label} ${family}`).not.toBe(
          colors[family],
        );
      });
    });
  });

  it("indexes each role exactly once, with a value in every theme", () => {
    expect(new Set(colorRoles).size).toBe(colorRoles.length);
    colourSets.forEach(({ label, colors }) => {
      colorRoles.forEach((role) => {
        expect(colors[role], `${label}.${role}`).toBeDefined();
      });
    });
  });
});

describe("palette", () => {
  it("holds only colours GPUix can paint", () => {
    const grammar = /^#[0-9A-Fa-f]{6}$/;
    Object.entries(palette).forEach(([ramp, steps]) => {
      Object.entries(steps).forEach(([step, value]) => {
        expect(value, `${ramp}.${step}`).toMatch(grammar);
      });
    });
  });
});

describe("alpha", () => {
  it("adds an alpha byte to a 6-digit colour", () => {
    expect(alpha("#2559D6", 0.3)).toBe("#2559D64D");
    expect(alpha("#2559D6", 0)).toBe("#2559D600");
    expect(alpha("#2559D6", 1)).toBe("#2559D6FF");
  });

  it("replaces the alpha byte of an 8-digit colour", () => {
    expect(alpha("#2559D64D", 0.5)).toBe("#2559D680");
    expect(alpha("#2559D6FF", 0.5)).toBe("#2559D680");
  });

  it("clamps an out-of-range amount", () => {
    expect(alpha("#2559D6", 2)).toBe("#2559D6FF");
    expect(alpha("#2559D6", -1)).toBe("#2559D600");
  });

  it("returns a colour it cannot parse unchanged", () => {
    expect(alpha("transparent", 0.5)).toBe("transparent");
    expect(alpha("rgb(1, 2, 3)", 0.5)).toBe("rgb(1, 2, 3)");
    expect(alpha("#FFF", 0.5)).toBe("#FFF");
  });

  it("returns the colour unchanged for an amount it cannot clamp", () => {
    expect(alpha("#2559D6", Number.NaN)).toBe("#2559D6");
    expect(alpha("#2559D64D", Number.NaN)).toBe("#2559D64D");
  });

  it("normalises the result to upper case", () => {
    expect(alpha("#2559d6", 0.3)).toBe("#2559D64D");
  });

  it("composes: a full-alpha result is opaque", () => {
    expect(alpha(alpha("#2559D6", 0.3), 1)).toBe("#2559D6FF");
  });
});
