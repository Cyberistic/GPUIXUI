import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  alpha,
  alphaOf,
  blend,
  colorRoles,
  darkColors,
  highContrastDarkColors,
  highContrastLightColors,
  invalidColorRoles,
  isColorRole,
  isPaintableColor,
  lightColors,
  palette,
  themeColors,
  type ThemeColors,
} from "./color.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  highContrastFloors,
  type ContrastFloors,
} from "./contrast.js";
import { brandText } from "./brand-text.js";
import { nativeTextTheme } from "./native-text.js";
import {
  filledHover,
  filledPressed,
  statusTone,
  type FilledAction,
} from "./styles.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  restoreTheme,
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
  it("paints every role of every shipped palette", () => {
    colourSets.forEach(({ label, colors }) => {
      expect(invalidColorRoles({ colors }), label).toEqual([]);
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

  it("narrows a stored role with the index, not the palette", () => {
    colourSets.forEach(({ label, colors }) => {
      Object.keys(colors).forEach((role) => {
        expect(isColorRole(role), `${label}.${role}`).toBe(true);
      });
    });

    [
      "toString",
      "constructor",
      "__proto__",
      "",
      "cardHover",
      "Primary",
    ].forEach((stored) => {
      expect(isColorRole(stored), stored).toBe(false);
    });
    [null, undefined, 1, {}, []].forEach((stored) => {
      expect(isColorRole(stored), String(stored)).toBe(false);
    });

    const stored: unknown = "selected";
    expect(isColorRole(stored) ? stored : "background").toBe("selected");
  });
});

describe("invalidColorRoles", () => {
  it("accepts every shipped colour set", () => {
    colourSets.forEach(({ label, colors }) => {
      expect(invalidColorRoles({ colors }), label).toEqual([]);
    });
  });

  it("reports a misspelt hex with its role, instead of letting it paint black", () => {
    const typo = { colors: { ...lightColors, primary: "#7C5CF" } };

    expect(invalidColorRoles(typo)).toEqual([
      { role: "primary", value: "#7C5CF" },
    ]);
  });

  it("accepts a named colour and a short hex, which the parser paints", () => {
    const painted = {
      colors: { ...lightColors, ring: "rebeccapurple", selection: "#FFF" },
    };

    expect(invalidColorRoles(painted)).toEqual([]);
  });

  it("reports a value no colour grammar reads, in role order", () => {
    const unreadable = {
      colors: { ...lightColors, ring: "purple-ish", selection: "#12" },
    };

    expect(invalidColorRoles(unreadable).map(({ role }) => role)).toEqual([
      "ring",
      "selection",
    ]);
  });

  it("accepts a translucent value, which the renderer does paint", () => {
    const translucent = {
      colors: { ...lightColors, hover: "#191D2580" },
    };

    expect(invalidColorRoles(translucent)).toEqual([]);
  });

  it("keeps the value a store wrote apart from the absence of a role", () => {
    const stored = {
      colors: {
        background: "#FFFFFF",
        foreground: null,
        primary: "",
        ring: "   ",
        card: 42,
        popover: { hex: "#FFFFFF" },
      },
    };
    const reported = new Map(
      invalidColorRoles(stored).map(({ role, value }) => [role, value]),
    );

    expect(reported.get("primary")).toBe("");
    expect(reported.get("ring")).toBe("   ");
    expect(reported.get("card")).toBe(42);
    expect(reported.get("popover")).toEqual({ hex: "#FFFFFF" });

    expect(reported.has("foreground")).toBe(true);
    expect(reported.get("foreground")).toBeUndefined();

    expect(reported.has("background")).toBe(false);
  });
});

describe("the roles a store cleared", () => {
  const cleared = (role: keyof ThemeColors, value: string) => ({
    colors: { ...lightColors, [role]: value },
  });

  it("reads a blank role as the absence a null role is", () => {
    const blank = themeColors(cleared("primary", ""));
    expect(blank.primary).toBeUndefined();
    expect(blank.ring).toBe(lightColors.ring);
    expect(themeColors(cleared("primary", "  ")).primary).toBeUndefined();

    expect(
      themeColors({ colors: { primary: "", secondary: "#FFFFFF" } }),
    ).toEqual({ secondary: "#FFFFFF" });
    expect(themeColors(cleared("ring", " #FFF ")).ring).toBe(" #FFF ");

    expect(themeColors({ colors: { primary: null } })).toEqual({});
  });

  it("still names the role on the value the store wrote", () => {
    expect(invalidColorRoles(cleared("primary", ""))).toEqual([
      { role: "primary", value: "" },
    ]);
    expect(invalidColorRoles(cleared("primary", "  "))).toEqual([
      { role: "primary", value: "  " },
    ]);
  });

  it("paints the absence rather than the runtime's black", () => {
    expect(
      statusTone({ colors: { ...lightColors, infoSoft: "" } }, "info"),
    ).toBeUndefined();

    expect(
      brandText({ colors: { ...lightColors, primary: "" } }),
    ).toBeUndefined();

    expect(
      nativeTextTheme({ colors: { ...lightColors, inputForeground: "" } }).text,
    ).toBeUndefined();

    expect(
      nativeTextTheme({ colors: { ...lightColors, primary: "" } }).text,
    ).toBe(lightColors.inputForeground);
  });

  it("inherits the base's role when an override is cleared", () => {
    const restored = extendTheme(lightTheme, {
      colors: { primary: "", secondary: "  " },
    });
    expect(restored.colors.primary).toBe(lightTheme.colors.primary);
    expect(restored.colors.secondary).toBe(lightTheme.colors.secondary);

    const named = extendTheme(lightTheme, {
      colors: { primary: "", ring: "#7C5CF" },
    });
    expect(named.colors.primary).toBe(lightTheme.colors.primary);
    expect(named.colors.ring).toBe("#7C5CF");
    expect(
      restoreTheme({ mode: "dark", colors: { primary: "" } }).colors.primary,
    ).toBe(darkTheme.colors.primary);
  });

  it("teaches the rule on the catalogue, the design system and the README", () => {
    const pages: Readonly<Record<string, string>> = {
      "docs/tokens.md": readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ),
      "docs/design-system.md": readFileSync(
        new URL("../../../docs/design-system.md", import.meta.url),
        "utf8",
      ),
      "packages/tokens/README.md": readFileSync(
        new URL("../README.md", import.meta.url),
        "utf8",
      ),
      ".agents/slop/COMPONENTS.md": readFileSync(
        new URL("../../../.agents/slop/COMPONENTS.md", import.meta.url),
        "utf8",
      ),
    };
    Object.entries(pages).forEach(([name, text]) => {
      expect(text.replaceAll(/\s+/g, " "), name).toContain(
        "colour a store cleared",
      );
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

  it("resolves the measured grammar and returns the rest unchanged", () => {
    expect(alpha("transparent", 0.5)).toBe("#00000080");
    expect(alpha("rgb(1, 2, 3)", 0.5)).toBe("#01020380");
    expect(alpha("rebeccapurple", 0.5)).toBe("#66339980");
    expect(alpha("oklch(0.62 0.26 29.2)", 0.5)).toBe("oklch(0.62 0.26 29.2)");
  });

  it("normalises the result to upper case", () => {
    expect(alpha("#2559d6", 0.3)).toBe("#2559D64D");
  });

  it("returns the colour unchanged for a non-finite amount", () => {
    expect(alpha("#2559D6", Number.NaN)).toBe("#2559D6");
    expect(alpha("#2559D64D", Number.NaN)).toBe("#2559D64D");
    expect(alpha("#2559D6", Number.POSITIVE_INFINITY)).toBe("#2559D6");
    expect(alpha("#2559D6", Number.NEGATIVE_INFINITY)).toBe("#2559D6");
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

  it("resolves the measured grammar and returns the rest unchanged", () => {
    expect(blend("transparent", "#FFFFFF", 0.5)).toBe("#80808000");
    expect(blend("#000000", "rgb(0, 0, 0)", 0.5)).toBe("#000000");
    expect(blend("oklch(0.62 0.26 29.2)", "#FFFFFF", 0.5)).toBe(
      "oklch(0.62 0.26 29.2)",
    );
  });

  it("normalises the result to upper case", () => {
    expect(blend("#5f4bdb", "#191d25", 0.12)).toBe("#5745C5");
  });

  it("returns the base unchanged for a non-finite amount", () => {
    expect(blend("#5F4BDB", "#FFFFFF", Number.NaN)).toBe("#5F4BDB");
    expect(blend("#5F4BDB", "#FFFFFF", Number.POSITIVE_INFINITY)).toBe(
      "#5F4BDB",
    );
  });
});

describe("the hex dialect the contracts measure", () => {
  it("widens shorthand before deriving a share or a blend", () => {
    expect(alpha("#fff", 0.5)).toBe("#FFFFFF80");
    expect(alpha("#fff8", 0)).toBe("#FFFFFF00");
    expect(alpha("fff", 0.3)).toBe("#FFFFFF4D");
    expect(blend("#fff", "#000", 0.5)).toBe("#808080");
    expect(blend("ff0000", "00ff00", 0.5)).toBe("#808000");
    expect(blend("#fff8", "#000", 1)).toBe("#00000088");
  });

  it("reads a shorthand colour's own share", () => {
    expect(alphaOf("#fff")).toBe(1);
    expect(alphaOf("#fff8")).toBeCloseTo(0x88 / 255, 10);
    expect(alphaOf("fff8")).toBeCloseTo(0x88 / 255, 10);
    expect(alphaOf("#ffffff80")).toBeCloseTo(0x80 / 255, 10);
  });

  it("measures every hex length the renderer paints", () => {
    ["#fff", "#fff8", "#ffffff", "#ffffff80", "fff", "ffffff80"].forEach(
      (value) => {
        expect(isPaintableColor(value), value).toBe(true);
      },
    );
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 10);
    expect(contrastRatio("#000", "#FFF")).toBeCloseTo(21, 10);
    expect(contrastRatio("ffffff", "000000")).toBeCloseTo(21, 10);
  });

  it("measures a fully opaque alpha byte", () => {
    expect(alpha("#FFFFFF", 1)).toBe("#FFFFFFFF");
    expect(contrastRatio("#FFFFFFFF", "#000000")).toBeCloseTo(21, 10);
    expect(contrastRatio("ffffffff", "000000")).toBeCloseTo(21, 10);
    expect(contrastRatio("#FFFF", "#000")).toBeCloseTo(21, 10);
    expect(contrastRatio(alpha("#FFFFFF", 1), "#000000")).toBeCloseTo(21, 10);
    expect(alphaOf("#FFFFFFff")).toBe(1);

    expect(blend("#5F4BDBFF", "#FFFFFF", 0.5)).toBe("#AFA5ED");
  });

  it("still refuses a value the contracts cannot resolve", () => {
    expect(contrastRatio("#00000080", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("transparent", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("oklch(0.62 0.26 29.2)", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("lab(54.29% 80.82 69.9)", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("rgb(from #bad455 b r g)", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("rgb(calc(255) 0 0)", "#FFFFFF")).toBeUndefined();
  });
});

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

describe("the colour grammar GPUix paints", () => {
  const painted = [
    "#fff",
    "#fff8",
    "#ffffff",
    "#ffffff80",
    "ff0000ff",

    "rebeccapurple",
    "BLACK",
    "transparent",

    "rgb(255 0 0)",
    "rgba(255, 0, 0, 1)",
    "hsl(0 100% 50%)",
    "hsl(360deg, 100%, 50%)",
    "hsla(0, 100%, 50%, 1)",
    "hwba(0, 0%, 0%, 1)",
    "hwb(0 0% 0%)",
    "hsv(0 100% 100%)",
    "lab(100% 0 0)",
    "lch(100% 0 0)",
    "oklab(0.62796 0.22486 0.12585)",
    "oklch(0.62796 0.25768 29.23388)",
    "rgb(none none none / none)",
    "rgb(255 0 0 / 50%)",

    "hsl (0 100% 50%)",

    "oklab(from #bad455 calc(l * 0.7) a b)",
    "rgb(from #bad455 b r g / alpha)",
    "lab(from #bad455 l a b / calc(alpha / 2))",
  ];

  const unpaintable = [
    "#7C5CF",
    "#GGGGGG",
    "#",
    "",
    "notacolour",
    "rgb(255, 0)",
    "rgb()",
    "rgb(",
    "rgb(1 2 3))",
    "color(display-p3 1 0 0)",
  ];

  painted.forEach((value) => {
    it(`accepts ${value}`, () => {
      expect(isPaintableColor(value)).toBe(true);
    });
  });

  unpaintable.forEach((value) => {
    it(`rejects ${value === "" ? "an empty string" : value}`, () => {
      expect(isPaintableColor(value)).toBe(false);
    });
  });

  it("stops reporting a role a CSS colour family paints", () => {
    expect(
      invalidColorRoles({
        colors: { ...lightColors, primary: "hsl(258 88% 58%)" },
      }),
    ).toEqual([]);
    expect(
      invalidColorRoles({ colors: { ...lightColors, primary: "#fff" } }),
    ).toEqual([]);
    expect(
      invalidColorRoles({
        colors: { ...lightColors, primary: "rebeccapurple" },
      }),
    ).toEqual([]);
  });

  it("still reports a value no CSS grammar reads", () => {
    expect(
      invalidColorRoles({ colors: { ...lightColors, primary: "#7C5CF" } }),
    ).toEqual([{ role: "primary", value: "#7C5CF" }]);
  });

  it("writes the shipped palettes in the long hex dialect", () => {
    colourSets.forEach(({ label, colors }) => {
      Object.entries(colors).forEach(([role, value]) => {
        expect(value, `${label}.${role}`).toMatch(
          /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/,
        );
      });
    });
  });
});
