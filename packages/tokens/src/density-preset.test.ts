/**
 * Bug guarded: `PlatformStyleStructure.density` accepted only a `DensityName`,
 * so the style file a consumer is told to copy could name a preset or drop
 * density — never tune a metric inside it. `DensityOverrides` had the same hole
 * from the other side: it merged over the **base** theme's preset and ignored a
 * `preset` key, so `{ preset: "compact", rowHeight: 30 }` over a comfortable
 * base silently produced comfortable-sized controls with a 30px row, losing the
 * macOS height ladder while still reading as a macOS variant.
 *
 * Plan 534 makes the preset part of the override (`DensityOverrides.preset`)
 * and widens the style field to `DensityName | DensityOverrides`.
 */

import { describe, expect, it } from "vitest";
import { themeMetricFailures } from "./metrics.js";
import { platformNames, platformStyles } from "./platforms.js";
import { contosoDensityPlatformStyle } from "./platform-extension.example.js";
import { defaultDensity, densityPresets, type DensityName } from "./scale.js";
import { themeFailures } from "./theme-check.js";
import {
  applyPlatformStyle,
  extendTheme,
  getPlatformTheme,
  getTheme,
} from "./theme.js";

/** The preset a style names, whether as a bare name or inside an override. */
const presetOf = (
  style: (typeof platformStyles)[PlatformName],
): DensityName => {
  const density = style.structure.density;
  return typeof density === "string"
    ? density
    : (density?.preset ?? defaultDensity.name);
};

type PlatformName = (typeof platformNames)[number];

describe("a density override names the preset it starts from", () => {
  it("starts from the preset it names, not the base theme's", () => {
    const themed = extendTheme(getTheme("light"), {
      density: { preset: "compact", rowHeight: 30 },
    });

    expect(themed.density.name).toBe("compact");
    expect(themed.density.controlHeight).toEqual(
      densityPresets.compact.controlHeight,
    );
    expect(themed.density.controlPaddingX).toEqual(
      densityPresets.compact.controlPaddingX,
    );
    expect(themed.density.rowHeight).toBe(30);
  });

  it("selects the whole preset when it tunes nothing", () => {
    const themed = extendTheme(getTheme("dark"), {
      density: { preset: "spacious" },
    });

    expect(themed.density).toEqual(densityPresets.spacious);
  });

  it("merges overrides over the named preset, not the base", () => {
    const themed = extendTheme(getTheme("light"), {
      density: { preset: "compact", controlHeight: { sm: 26 } },
    });

    expect(themed.density.name).toBe("compact");
    expect(themed.density.controlHeight).toEqual({ sm: 26, md: 28, lg: 32 });
    expect(themed.density.controlPaddingX).toEqual(
      densityPresets.compact.controlPaddingX,
    );
  });

  it("keeps the base preset when an override names none", () => {
    const base = extendTheme(getTheme("light"), { density: "spacious" });
    const themed = extendTheme(base, {
      density: { controlHeight: { md: 38 } },
    });

    expect(themed.density.name).toBe("spacious");
    expect(themed.density.controlHeight).toEqual({ sm: 32, md: 38, lg: 40 });
  });
});

describe("a platform style's density", () => {
  const macosWithTallerRows = {
    ...platformStyles.darwin,
    structure: {
      ...platformStyles.darwin.structure,
      density: { preset: "compact", rowHeight: 30 } as const,
    },
  };

  it("applies the preset and the metrics tuned inside it", () => {
    const themed = applyPlatformStyle(getTheme("light"), macosWithTallerRows);

    expect(themed.density.name).toBe("compact");
    expect(themed.density.controlHeight).toEqual(
      densityPresets.compact.controlHeight,
    );
    expect(themed.density.rowHeight).toBe(30);
  });

  it("inherits the base density, overrides included, when it names none", () => {
    const base = extendTheme(getTheme("light"), {
      density: { preset: "spacious", rowHeight: 40 },
    });
    const themed = applyPlatformStyle(base, {
      ...platformStyles.default,
      structure: {},
    });

    expect(themed.density.name).toBe("spacious");
    expect(themed.density.rowHeight).toBe(40);
  });

  it("resolves the copied example's preset over every base preset", () => {
    (["compact", "comfortable", "spacious"] as const).forEach((density) => {
      const base = extendTheme(getTheme("light"), { density });
      const themed = applyPlatformStyle(base, contosoDensityPlatformStyle);

      expect(themed.density.name, density).toBe("compact");
      expect(themed.density.rowHeight, density).toBe(30);
      expect(themed.density.controlHeight, density).toEqual(
        densityPresets.compact.controlHeight,
      );
      expect(themeFailures(themed), density).toEqual([]);
    });
  });

  it("keeps the edited metrics under the numeric contract", () => {
    const themed = extendTheme(getTheme("light"), {
      density: { preset: "compact", rowHeight: 8 },
    });

    expect(themeMetricFailures(themed)).toContainEqual(
      expect.objectContaining({
        group: "density",
        member: "rowHeight",
        rule: "at-least",
        actual: 8,
      }),
    );
  });

  it("moves no shipped style's density", () => {
    platformNames.forEach((platform) => {
      (["light", "dark"] as const).forEach((mode) => {
        const theme = getPlatformTheme(platform, mode);
        expect(theme.density, `${platform} ${mode}`).toEqual(
          densityPresets[presetOf(platformStyles[platform])],
        );
        expect(themeFailures(theme), `${platform} ${mode}`).toEqual([]);
      });
    });
  });
});
