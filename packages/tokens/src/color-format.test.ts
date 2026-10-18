/**
 * Guards the defect fixed in plan 371: `colors.shadow` is the one role the pair
 * contract leaves out — it is a tint, not text or a surface — and plan 085 made
 * every elevation level an alpha applied to it through `alpha()`. That helper
 * parses only `#RRGGBB`/`#RRGGBBAA` and returns an unparseable value unchanged
 * (plan 077's fallback), while the pinned GPUix runtime accepts every CSS colour
 * form (`parse_color_rgba` delegates to `csscolorparser`, whose tests include
 * `rebeccapurple`, `rgb(…)` and `#f00f`).
 *
 * The consequence was measurable: a copied theme with `shadow: "black"` painted
 * an opaque shadow at every level — the 0.08, 0.12 and 0.16 alphas all gone —
 * while `themeContrastFailures` and `themeMetricFailures` both returned `[]`.
 * `docs/design-system.md` claimed "tests restrict roles to hex" and nothing held
 * the exempt role. `isHexColor` publishes the predicate and
 * `themeColorFailures` names every role outside the form the token maths can
 * read.
 */
import { describe, expect, it } from "vitest";
import { colorRoles, isHexColor } from "./color.js";
import {
  contrastRatio,
  themeColorFailures,
  themeContrastFailures,
} from "./contrast.js";
import { elevationShadow } from "./elevation.js";
import { themeMetricFailures } from "./metrics.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import {
  extendTheme,
  getPlatformTheme,
  getTheme,
  themeModes,
  type Theme,
} from "./theme.js";

const shippedThemes = (): ReadonlyArray<Theme> => [
  ...themeModes.flatMap((mode) => [getTheme(mode), getTheme(mode, "high")]),
  ...platformNames
    .filter((platform) => platform !== "default")
    .flatMap((platform) =>
      themeModes.flatMap((mode) => [
        getPlatformTheme(platform, mode),
        getPlatformTheme(platform, mode, "high"),
      ]),
    ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.flatMap((mode) => [
      getPlatformRecipeTheme(recipe, mode),
      getPlatformRecipeTheme(recipe, mode, "high"),
    ]),
  ),
];

describe("isHexColor", () => {
  it("accepts only the six- and eight-digit hex form the helpers parse", () => {
    ["#191D25", "#7567F23D", "#191d25", "#7567f23d"].forEach((value) => {
      expect(isHexColor(value), value).toBe(true);
    });
  });

  it("rejects every other CSS form and a malformed string", () => {
    [
      "#FFF",
      "#191D25FF00",
      "#GG0000",
      "black",
      "rebeccapurple",
      "rgb(0 0 0)",
      "",
    ].forEach((value) => {
      expect(isHexColor(value), value).toBe(false);
    });
  });
});

describe("themeColorFailures", () => {
  it("clears every shipped identity, platform and recipe theme", () => {
    const themes = shippedThemes();
    expect(themes).toHaveLength(24);
    themes.forEach((theme) => {
      expect(themeColorFailures(theme), theme.name).toEqual([]);
      colorRoles.forEach((role) => {
        expect(isHexColor(theme.colors[role]), `${theme.name} ${role}`).toBe(
          true,
        );
      });
    });
  });

  it("reports the elevation tint a copied theme names in CSS", () => {
    // A valid CSS colour: the runtime paints it, but `alpha` cannot apply the
    // level's opacity, so every shadow becomes fully opaque.
    const tinted = extendTheme(getTheme("light"), {
      colors: { shadow: "black" },
    });

    expect(themeColorFailures(tinted)).toEqual([
      { role: "shadow", value: "black" },
    ]);
    // The two checks that existed before plan 371 cannot see it.
    expect(themeContrastFailures(tinted)).toEqual([]);
    expect(themeMetricFailures(tinted)).toEqual([]);
    // The level's 0.16 alpha is gone, not applied to the named tint.
    expect(elevationShadow(tinted, "lg")?.color).toBe("black");
  });

  it("reports a three-digit hex the runtime accepts", () => {
    const tinted = extendTheme(getTheme("dark"), {
      colors: { shadow: "#000" },
    });

    expect(themeColorFailures(tinted)).toEqual([
      { role: "shadow", value: "#000" },
    ]);
  });

  it("reports a functional colour the runtime accepts", () => {
    const tinted = extendTheme(getTheme("light"), {
      colors: { shadow: "rgb(0 0 0)" },
    });

    expect(themeColorFailures(tinted)).toEqual([
      { role: "shadow", value: "rgb(0 0 0)" },
    ]);
  });

  it("keeps each level's alpha once the tint is hex", () => {
    const three = extendTheme(getTheme("light"), {
      colors: { shadow: "#000000" },
    });
    const eight = extendTheme(getTheme("light"), {
      colors: { shadow: "#00000080" },
    });

    [three, eight].forEach((theme) => {
      expect(themeColorFailures(theme)).toEqual([]);
      expect([
        elevationShadow(theme, "sm")?.color,
        elevationShadow(theme, "md")?.color,
        elevationShadow(theme, "lg")?.color,
      ]).toEqual(["#00000014", "#0000001F", "#00000029"]);
    });
  });

  it("names a malformed measured role the contrast check can only call NaN", () => {
    const named = extendTheme(getTheme("light"), {
      colors: { primary: "rebeccapurple" },
    });
    const failures = themeContrastFailures(named);

    expect(themeColorFailures(named)).toEqual([
      { role: "primary", value: "rebeccapurple" },
    ]);
    expect(failures.length).toBeGreaterThan(0);
    expect(
      failures.some(({ ratio }) => Number.isNaN(ratio)),
      "a non-hex measured role still fails the contrast check",
    ).toBe(true);
    expect(contrastRatio("rebeccapurple", "#FFFFFF")).toBeNaN();
  });

  it("checks every role, the reserved one included", () => {
    const edited = extendTheme(getTheme("light"), {
      colors: { scrollbar: "rebeccapurple", shadow: "black" },
    });

    expect(themeColorFailures(edited)).toEqual([
      { role: "scrollbar", value: "rebeccapurple" },
      { role: "shadow", value: "black" },
    ]);
  });
});
