import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import {
  alpha,
  alphaOf,
  blend,
  invalidColorRoles,
  isPaintableColor,
  lightColors,
  type ThemeColors,
} from "./color.js";
import { contrastPairs, contrastRatio } from "./contrast.js";
import {
  isNamedColour,
  measuredColour,
  namedColours,
  opaqueRgb,
} from "./measure.js";
import { seriesColors, seriesFailures } from "./series.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  type Theme,
} from "./theme.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = read("../../../docs/tokens.md");
const readme = read("../README.md");
const designSystem = read("../../../docs/design-system.md");

const themes: ReadonlyArray<{ readonly label: string; readonly theme: Theme }> =
  [
    { label: "light", theme: lightTheme },
    { label: "dark", theme: darkTheme },
    { label: "high-contrast light", theme: highContrastLightTheme },
    { label: "high-contrast dark", theme: highContrastDarkTheme },
  ];

const channelsOf = (hex: string): readonly [number, number, number, number] => {
  const digits = hex.replace("#", "");
  const byteAt = (at: number): number =>
    Number.parseInt(digits.slice(at, at + 2), 16);
  return [
    byteAt(0),
    byteAt(2),
    byteAt(4),
    digits.length === 8 ? byteAt(6) : 255,
  ];
};

const percent = (value: number): string => `${(value * 100).toFixed(6)}%`;

const alphaSuffix = (alphaByte: number): string =>
  alphaByte === 255 ? "" : ` / ${percent(alphaByte / 255)}`;

const asRgb = (hex: string): string => {
  const [red, green, blue, alphaByte] = channelsOf(hex);
  return `rgb(${red} ${green} ${blue}${alphaSuffix(alphaByte)})`;
};

const asHsl = (hex: string): string => {
  const [red, green, blue, alphaByte] = channelsOf(hex);
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const delta = high - low;
  const lightness = (high + low) / 2;
  const hue =
    delta === 0
      ? 0
      : high === r
        ? 60 * ((((g - b) / delta) % 6) + 6)
        : high === g
          ? 60 * ((b - r) / delta + 2)
          : 60 * ((r - g) / delta + 4);
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return `hsl(${(hue % 360).toFixed(6)} ${percent(saturation)} ${percent(lightness)}${alphaSuffix(alphaByte)})`;
};

const recolour = (
  colors: ThemeColors,
  convert: (value: string) => string,
): Partial<ThemeColors> =>
  Object.fromEntries(
    Object.entries(colors).map(([role, value]) => [role, convert(value)]),
  );

describe("the named colours the paint check accepts", () => {
  it("resolves every name to the channels the renderer paints", () => {
    expect(Object.keys(namedColours)).toHaveLength(149);
    const unresolved = Object.keys(namedColours).filter(
      (name) => !isPaintableColor(name) || measuredColour(name) === undefined,
    );
    expect(unresolved).toEqual([]);
  });

  it("reads the channels of a name, case-insensitively", () => {
    expect(measuredColour("rebeccapurple")).toEqual({ rgb: "#663399" });
    expect(measuredColour("RebeccaPurple")).toEqual({ rgb: "#663399" });
    expect(measuredColour("gray")).toEqual(measuredColour("grey"));
    expect(measuredColour("transparent")).toEqual({
      rgb: "#000000",
      alpha: "00",
    });
    expect(isNamedColour("notacolour")).toBe(false);
  });

  it("measures a name exactly as its hex twin", () => {
    expect(contrastRatio("rebeccapurple", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#663399", "#FFFFFF") ?? 0,
      10,
    );
    expect(contrastRatio("white", "black")).toBeCloseTo(21, 10);
  });

  it("refuses a prototype key the table does not carry", () => {
    const inherited = Object.getOwnPropertyNames(Object.prototype);
    expect(inherited.length).toBeGreaterThan(10);
    expect(inherited.filter((key) => isNamedColour(key))).toEqual([]);
    expect(inherited.filter((key) => isPaintableColor(key))).toEqual([]);
    expect(
      inherited.filter((key) => measuredColour(key) !== undefined),
    ).toEqual([]);

    expect(measuredColour("constructor(1 2 3)")).toBeUndefined();
    expect(measuredColour("__proto__(1 2 3)")).toBeUndefined();

    expect(
      invalidColorRoles({ colors: { ...lightColors, primary: "constructor" } }),
    ).toEqual([{ role: "primary", value: "constructor" }]);
  });
});

describe("the functional families whose channels are sRGB arithmetic", () => {
  it("reads rgb() in every separator and unit a CSS value uses", () => {
    expect(measuredColour("rgb(255 0 0)")).toEqual({ rgb: "#FF0000" });
    expect(measuredColour("rgba(255, 0, 0, 1)")).toEqual({ rgb: "#FF0000" });
    expect(measuredColour("rgb(100% 0% 0%)")).toEqual({ rgb: "#FF0000" });
    expect(measuredColour("rgb(255 0 0 / 50%)")).toEqual({
      rgb: "#FF0000",
      alpha: "80",
    });
    expect(measuredColour("rgb(255, 0, 0, 0.5)")).toEqual({
      rgb: "#FF0000",
      alpha: "80",
    });

    expect(measuredColour("rgb(300 -20 0)")).toEqual({ rgb: "#FF0000" });
  });

  it("reads hsl(), hwb() and hsv() as the hue circles they are", () => {
    expect(measuredColour("hsl(0 100% 50%)")).toEqual({ rgb: "#FF0000" });
    expect(measuredColour("hsl(120deg, 100%, 50%)")).toEqual({
      rgb: "#00FF00",
    });
    expect(measuredColour("hsl(0.5turn 100% 50%)")).toEqual({
      rgb: "#00FFFF",
    });
    expect(measuredColour("hsl(0 0% 100%)")).toEqual({ rgb: "#FFFFFF" });
    expect(measuredColour("hsl(0 100% 50% / 25%)")).toEqual({
      rgb: "#FF0000",
      alpha: "40",
    });
    expect(measuredColour("hwb(0 0% 0%)")).toEqual({ rgb: "#FF0000" });
    expect(measuredColour("hwb(0 100% 0%)")).toEqual({ rgb: "#FFFFFF" });
    expect(measuredColour("hwb(0 50% 50%)")).toEqual({ rgb: "#808080" });
    expect(measuredColour("hsv(0 100% 100%)")).toEqual({ rgb: "#FF0000" });
    expect(measuredColour("hsv(120 100% 100%)")).toEqual({ rgb: "#00FF00" });
    expect(measuredColour("hsv(0 0% 50%)")).toEqual({ rgb: "#808080" });
  });

  it("reads the alpha channel as the share a wash needs", () => {
    expect(alphaOf("rgb(0 0 0 / 50%)")).toBeCloseTo(128 / 255, 10);
    expect(alphaOf("hsl(0 0% 0%)")).toBe(1);
    expect(alphaOf("transparent")).toBe(0);
  });

  it("resolves a value a store hands back as unmeasurable, not a crash", () => {
    expect(measuredColour(null)).toBeUndefined();
    expect(measuredColour(undefined)).toBeUndefined();
    expect(measuredColour(42)).toBeUndefined();
    expect(measuredColour({})).toBeUndefined();
    expect(opaqueRgb(null)).toBeUndefined();
    expect(alphaOf(null)).toBe(1);

    expect(measuredColour("")).toBeUndefined();
  });
});

describe("a brand written in a measured colour function", () => {
  const recolourings: ReadonlyArray<{
    readonly label: string;
    readonly convert: (hex: string) => string;
  }> = [
    { label: "rgb()", convert: asRgb },
    { label: "hsl()", convert: asHsl },
  ];

  recolourings.forEach(({ label, convert }) => {
    themes.forEach(({ label: themeLabel, theme }) => {
      it(`${themeLabel} in ${label}: audits exactly as its hex twin`, () => {
        const converted = extendTheme(theme, {
          colors: recolour(theme.colors, convert),
        });

        expect(auditTheme(converted).passed).toBe(true);
        contrastPairs.forEach(({ foreground, background }) => {
          expect(
            contrastRatio(
              converted.colors[foreground],
              converted.colors[background],
            ),
            `${themeLabel} ${label}: ${foreground} on ${background}`,
          ).toBeCloseTo(
            contrastRatio(theme.colors[foreground], theme.colors[background]) ??
              0,
            10,
          );
        });
      });
    });
  });

  it("measures a data series and a synthetic pair in the same grammar", () => {
    const [first, second, third, fourth, fifth] = seriesColors(lightTheme);
    const converted = extendTheme(lightTheme, {
      colors: recolour(lightTheme.colors, asRgb),
      series: [
        asRgb(first),
        asRgb(second),
        asRgb(third),
        asRgb(fourth),
        asRgb(fifth),
      ],
    });
    expect(seriesFailures(converted)).toEqual(seriesFailures(lightTheme));
  });

  it("derives an opaque fill from a functional action colour", () => {
    expect(blend("hsl(0 100% 50%)", "#000000", 0.5)).toBe("#800000");
    expect(blend("rebeccapurple", "#FFFFFF", 0.5)).toBe("#B399CC");
    expect(blend("#5F4BDB", "rgb(255 255 255)", 0.5)).toBe(
      blend("#5F4BDB", "#FFFFFF", 0.5),
    );
  });

  it("returns a colour no grammar reads unchanged", () => {
    expect(alpha("notacolour", 0.5)).toBe("notacolour");
    expect(blend("notacolour", "#FFFFFF", 0.5)).toBe("notacolour");
    expect(alphaOf("notacolour")).toBe(1);
  });

  it("writes the derived forms in the hex dialect the contracts measure", () => {
    expect(alpha("hsl(258 88% 58%)", 0.3)).toBe("#6E36F24D");

    const opaque = alpha("hsl(258 88% 58%)", 1);
    expect(opaque).toBe("#6E36F2FF");
    expect(contrastRatio(opaque, "#FFFFFF")).toBeCloseTo(
      contrastRatio("hsl(258 88% 58%)", "#FFFFFF") ?? 0,
      10,
    );
  });
});

describe("the colour spaces the contracts report rather than guess", () => {
  const unresolved = [
    "lab(54.29% 80.82 69.9)",
    "lch(54.29% 106.84 40.85)",
    "oklab(0.62796 0.22486 0.12585)",
    "oklch(0.62796 0.25768 29.23388)",
    "rgb(from #bad455 b r g)",
    "rgb(none none none)",
    "rgb(calc(255) 0 0)",
  ];

  unresolved.forEach((value) => {
    it(`${value} paints and is reported unmeasurable`, () => {
      expect(isPaintableColor(value)).toBe(true);
      expect(measuredColour(value)).toBeUndefined();
      expect(contrastRatio(value, "#FFFFFF")).toBeUndefined();
    });
  });

  it("names them on the page rather than promising the whole grammar", () => {
    ["lab", "lch", "oklab", "oklch"].forEach((family) => {
      expect(catalogue, family).toContain(`\`${family}\``);
      expect(readme, family).toContain(`\`${family}\``);
    });
    [catalogue, readme, designSystem].forEach((page) => {
      expect(page).toContain("reported unmeasurable");
    });
  });

  it("prints the measured answer for the page's own example", () => {
    const ratio = contrastRatio("hsl(0 0% 100%)", "#000");
    expect(ratio).toBeCloseTo(21, 10);
    expect(catalogue).toContain(
      'contrastRatio("hsl(0 0% 100%)", "#000"); // 21',
    );

    const named = contrastRatio("rebeccapurple", "#FFFFFF") ?? 0;
    expect(catalogue).toContain(
      `contrastRatio("rebeccapurple", "#FFFFFF"); // ${named.toFixed(2)}`,
    );
  });

  it("keeps the shipped palettes in the long hex form the tables print", () => {
    Object.entries(lightColors).forEach(([role, value]) => {
      expect(value, role).toMatch(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/);
    });
  });
});
