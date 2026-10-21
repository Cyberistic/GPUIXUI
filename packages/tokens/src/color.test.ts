/**
 * Guards two things in the colour maths. First the WCAG contrast floors of
 * every semantic text/surface pair in every shipped theme, including the
 * high-contrast variants: a palette edit that makes text unreadable fails here
 * rather than shipping. Second the derived fills a filled action paints while
 * it is hovered or pressed — a hover that costs its label legibility fails the
 * same way a bad role pair does.
 */
import { describe, expect, it } from "vitest";
import {
  alpha,
  blend,
  colorRoles,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  lightColors,
  palette,
  type ThemeColors,
} from "./color.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  highContrastFloors,
  type ContrastFloors,
} from "./contrast.js";
import { filledHover, filledPressed, type FilledAction } from "./styles.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  type Theme,
} from "./theme.js";

interface ColourSet {
  readonly label: string;
  readonly colors: ThemeColors;
  readonly floors: ContrastFloors;
}

const colourSets: readonly ColourSet[] = [
  {
    label: "light",
    colors: lightColors,
    floors: contrastFloors,
  },
  {
    label: "dark",
    colors: darkColors,
    floors: contrastFloors,
  },
  {
    label: "high-contrast light",
    colors: highContrastLightColors,
    floors: highContrastFloors,
  },
  {
    label: "high-contrast dark",
    colors: highContrastDarkColors,
    floors: highContrastFloors,
  },
];

describe("semantic colour contrast", () => {
  colourSets.forEach(({ label, colors, floors }) => {
    contrastPairs.forEach(({ foreground, background, floor }) => {
      it(`${label}: ${foreground} on ${background} meets ${floors[floor]}:1`, () => {
        expect(
          contrastRatio(colors[foreground], colors[background]),
          `${label} ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floors[floor]);
      });
    });
  });
});

describe("high-contrast boundaries", () => {
  const sets = [
    ["high-contrast light", highContrastLightColors],
    ["high-contrast dark", highContrastDarkColors],
  ] as const;

  sets.forEach(([label, colors]) => {
    it(`${label}: decorative border on background meets 3:1`, () => {
      expect(
        contrastRatio(colors.border, colors.background),
      ).toBeGreaterThanOrEqual(3);
    });
  });
});

const softRoles = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

describe("soft status surfaces", () => {
  colourSets.forEach(({ label, colors }) => {
    softRoles.forEach((role) => {
      it(`${label}: ${role} is perceivable on both surfaces`, () => {
        expect(
          contrastRatio(colors[role], colors.background),
          `${label} ${role} on background`,
        ).toBeGreaterThanOrEqual(1.05);
        expect(
          contrastRatio(colors[role], colors.card),
          `${label} ${role} on card`,
        ).toBeGreaterThanOrEqual(1.05);
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

  it("normalises the result to upper case", () => {
    expect(alpha("#2559d6", 0.3)).toBe("#2559D64D");
  });

  it("composes: a full-alpha result is opaque", () => {
    expect(alpha(alpha("#2559D6", 0.3), 1)).toBe("#2559D6FF");
  });
});

describe("blend", () => {
  it("moves every channel the given share of the way to the target", () => {
    expect(blend("#5F4BDB", "#191D25", 0.12)).toBe("#5745C5");
  });

  it("rounds a channel to the nearest byte", () => {
    // 127.5 would truncate to #7F7F7F; a half step must round up.
    expect(blend("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("returns the base at 0 and the target's channels at 1", () => {
    expect(blend("#5F4BDB", "#191D25", 0)).toBe("#5F4BDB");
    expect(blend("#5F4BDB", "#191D25", 1)).toBe("#191D25");
  });

  it("clamps an out-of-range amount", () => {
    expect(blend("#000000", "#FFFFFF", 2)).toBe("#FFFFFF");
    expect(blend("#000000", "#FFFFFF", -1)).toBe("#000000");
  });

  it("keeps the base colour's alpha byte", () => {
    expect(blend("#5F4BDB4D", "#FFFFFF", 0.5)).toBe("#AFA5ED4D");
    expect(blend("#5F4BDB00", "#FFFFFF", 1)).toBe("#FFFFFF00");
  });

  it("leaves an opaque base opaque", () => {
    expect(blend("#000000", "#FFFFFF", 0.1)).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("returns a colour it cannot parse unchanged", () => {
    expect(blend("transparent", "#FFFFFF", 0.5)).toBe("transparent");
    expect(blend("#000000", "rgb(0, 0, 0)", 0.5)).toBe("#000000");
    expect(blend("#000000", "#FFF", 0.5)).toBe("#000000");
  });

  it("normalises the result to upper case", () => {
    expect(blend("#5f4bdb", "#191d25", 0.12)).toBe("#5745C5");
  });
});

/** The action families that paint a solid fill, and their shared hover rule. */
const filledActions: readonly FilledAction[] = [
  "primary",
  "secondary",
  "destructive",
];

const actionThemes: ReadonlyArray<{
  readonly label: string;
  readonly theme: Theme;
  readonly floor: number;
}> = [
  { label: "light", theme: lightTheme, floor: 4.5 },
  { label: "dark", theme: darkTheme, floor: 4.5 },
  { label: "high-contrast light", theme: highContrastLightTheme, floor: 7 },
  { label: "high-contrast dark", theme: highContrastDarkTheme, floor: 7 },
];

describe("filled action state fills", () => {
  actionThemes.forEach(({ label, theme, floor }) => {
    filledActions.forEach((action) => {
      it(`${label}: ${action} keeps its label at ${floor}:1 while hovered and pressed`, () => {
        const foreground = theme.colors[`${action}Foreground`];
        const fills = {
          hover: filledHover(theme, action),
          pressed: filledPressed(theme, action),
        };
        Object.entries(fills).forEach(([state, fill]) => {
          expect(
            contrastRatio(foreground, fill),
            `${label} ${action} ${state}`,
          ).toBeGreaterThanOrEqual(floor);
        });
      });
    });
  });
});
