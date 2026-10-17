/**
 * Guards the defect plan 090 fixed: the soft status edge was a 30%-alpha
 * mixture recomputed from the solid role, not a theme role, and no floor
 * measured it. On the high-contrast light theme the `warning` edge over
 * `warningSoft` measured 1.12:1 — under the 3:1 the design system gives a
 * decorative divider — and a copied platform style could not edit it.
 */
import { describe, expect, it } from "vitest";
import {
  alpha,
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  platformNames,
  statusTone,
  statusTones,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const shippedThemes = (): ReadonlyArray<Theme> => [
  getTheme("light"),
  getTheme("dark"),
  getTheme("light", "high"),
  getTheme("dark", "high"),
  ...platformNames
    .filter((platform) => platform !== "default")
    .flatMap((platform) => [
      getPlatformTheme(platform, "light"),
      getPlatformTheme(platform, "dark"),
    ]),
];

describe("soft status edge", () => {
  it("clears the divider floor on its own fill in every shipped theme", () => {
    shippedThemes().forEach((theme) => {
      statusTones.forEach((tone) => {
        const edge = theme.colors[`${tone}SoftBorder`];
        const fill = theme.colors[`${tone}Soft`];
        expect(
          contrastRatio(edge, fill),
          `${theme.name} ${tone}SoftBorder on ${tone}Soft`,
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].divider);
      });
    });
  });

  it("replaces a mixture that failed the high-contrast warning floor", () => {
    const theme = getTheme("light", "high");
    const mixed = compositeOver(
      alpha(theme.colors.warning, 0.3),
      theme.colors.warningSoft,
    );

    expect(contrastRatio(mixed, theme.colors.warningSoft)).toBeLessThan(3);
    expect(
      contrastRatio(theme.colors.warningSoftBorder, theme.colors.warningSoft),
    ).toBeGreaterThanOrEqual(contrastFloors.high.divider);
    expect(theme.colors.warningSoftBorder).not.toBe(mixed);
  });

  it("is the role statusTone returns, opaque enough to measure", () => {
    shippedThemes().forEach((theme) => {
      statusTones.forEach((tone) => {
        const edge = statusTone(theme, tone).border;
        expect(edge).toBe(theme.colors[`${tone}SoftBorder`]);
        expect(edge).toMatch(/^#[0-9A-F]{6}$/);
      });
    });
  });

  it("reports an erased edge through the public checker", () => {
    const light = getTheme("light");
    const erased = extendTheme(light, {
      colors: { warningSoftBorder: light.colors.warningSoft },
    });

    expect(themeContrastFailures(erased)).toContainEqual({
      foreground: "warningSoftBorder",
      background: "warningSoft",
      pairClass: "divider",
      floor: contrastFloors.default.divider,
      ratio: 1,
    });
  });

  it("accepts a brand theme that designs its own edge", () => {
    const branded = extendTheme(getTheme("dark"), {
      colors: { infoSoftBorder: "#6E9CFF" },
    });

    expect(themeContrastFailures(branded)).toEqual([]);
  });
});
