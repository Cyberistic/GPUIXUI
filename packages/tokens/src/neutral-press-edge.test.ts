/**
 * Guards the gap plan 318 closed. Plan 080 held the decorative `border` on the
 * fills a bordered control paints — `secondary` at rest, the `hover`/`active`
 * washes and the toggle-on `accent` — because an outlined control's edge
 * disappeared exactly while pressed. Plan 097 then gave every filled control a
 * designed family (`x` → `xHover` → `xActive`), so a secondary control now
 * paints `secondaryHover` and `secondaryActive` instead of the generic washes,
 * and the two new fills had no pair.
 *
 * The missing pairs hid the same shipped defect the older list was written to
 * prevent: in the light platform styles the pressed neutral fill is the divider
 * itself. macOS `#D1D1D6` and Windows `#D6D6D6` measure **1.000:1** against
 * `border`, and Linux `#D4D3D1` measures **1.009:1**, so a pressed secondary
 * button had no visible edge while every suite stayed green. The identity and
 * every dark set clear the 1.05:1 floor, so only the three light pressed steps
 * move.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  platformNames,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const realPlatforms = platformNames.filter((name) => name !== "default");

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const controlFills = [
  "secondary",
  "secondaryHover",
  "secondaryActive",
  "hover",
  "active",
  "accent",
] as const;

const borderPairs = contrastPairs.filter(
  ([foreground]) => foreground === "border",
);

const controlFillSet: ReadonlySet<string> = new Set(controlFills);

const neutralStateFills = ["secondaryHover", "secondaryActive"] as const;

describe("the neutral control's edge on its designed states", () => {
  it("documents every fill a bordered control paints, once each", () => {
    expect(
      borderPairs
        .filter(([, background]) => controlFillSet.has(background))
        .map(([, background, pairClass]) => [background, pairClass]),
    ).toEqual(controlFills.map((fill) => [fill, "divider"]));
  });

  it("keeps every shipped theme above its declared divider floor", () => {
    const failures = themes.flatMap(([label, theme]) =>
      neutralStateFills.flatMap((background) => {
        const floor = contrastFloors[theme.contrast].divider;
        const ratio = contrastRatio(
          theme.colors.border,
          theme.colors[background],
        );
        return ratio >= floor
          ? []
          : [`${label}: border on ${background} at ${ratio} < ${floor}`];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("keeps each fixed platform press one designed step past the divider", () => {
    const ratios = realPlatforms.map((platform) => {
      const theme = getPlatformTheme(platform, "light");
      return [
        platform,
        contrastRatio(theme.colors.border, theme.colors.secondaryActive),
      ] as const;
    });

    // The exact shipped regression: macOS 1.000, Linux 1.009, Windows 1.000.
    expect(ratios).toEqual([
      ["darwin", expect.closeTo(1.107, 2)],
      ["linux", expect.closeTo(1.106, 2)],
      ["win32", expect.closeTo(1.105, 2)],
    ]);
  });

  it("reports the AAA press edge that sat under the 3:1 floor", () => {
    const cases = [
      ["light", getTheme("light", "high"), "#6E7683", 2.31],
      ["dark", getTheme("dark", "high"), "#8A8A8A", 2.567],
    ] as const;

    cases.forEach(([label, theme, oldBorder, oldRatio]) => {
      const regressed = extendTheme(theme, { colors: { border: oldBorder } });
      const failures = themeContrastFailures(regressed).filter(
        ({ foreground, background }) =>
          foreground === "border" && background === "secondaryActive",
      );

      expect(failures, label).toHaveLength(1);
      expect(failures[0]?.pairClass, label).toBe("divider");
      expect(failures[0]?.floor, label).toBe(contrastFloors.high.divider);
      expect(failures[0]?.ratio, label).toBeCloseTo(oldRatio, 2);
    });
  });

  it("reports an edge erased on an edited neutral press", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { secondaryActive: light.colors.border },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "border" && background === "secondaryActive",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("divider");
    expect(failures[0]?.floor).toBe(contrastFloors.default.divider);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("keeps the press a designed step past its hover and its edge", () => {
    realPlatforms.forEach((platform) => {
      const theme = getPlatformTheme(platform, "light");
      expect(
        contrastRatio(
          theme.colors.secondaryHover,
          theme.colors.secondaryActive,
        ),
        `${platform} press step`,
      ).toBeGreaterThanOrEqual(1.05);
      expect(
        contrastRatio(theme.colors.border, theme.colors.secondaryActive),
        `${platform} edge`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.divider);
    });
  });
});
