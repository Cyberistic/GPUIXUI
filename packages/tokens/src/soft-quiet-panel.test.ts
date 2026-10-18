/**
 * Guards the defect plan 300 fixed: the soft status tints were checked on
 * `background`, `card` and `popover` but not the quiet `muted` panel, so the
 * platform light variants — which change `muted` and inherit the identity's
 * pastel tints — shipped a status badge at 1.023–1.049:1 against a sidebar.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  lightTheme,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const tones = [
  ["infoSoft", "infoSoftForeground", "infoSoftBorder"],
  ["successSoft", "successSoftForeground", "successSoftBorder"],
  ["warningSoft", "warningSoftForeground", "warningSoftBorder"],
  ["destructiveSoft", "destructiveSoftForeground", "destructiveSoftBorder"],
] as const;

describe("soft status surface on the quiet panel", () => {
  it("clears every shipped quiet panel", () => {
    shipped.forEach(([label, theme]) => {
      tones.forEach(([fill]) => {
        expect(
          contrastRatio(theme.colors[fill], theme.colors.muted),
          `${label}: ${fill} on muted`,
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].surface);
      });
    });
  });

  it("reports the previous tints one step under the floor", () => {
    const regressed = extendTheme(getPlatformTheme("linux", "light"), {
      colors: {
        // The pre-309 quiet panel this regression was measured on.
        muted: "#EBEBEA",
        infoSoft: "#DEE9FF",
        successSoft: "#C2F4D6",
        warningSoft: "#FFE3A3",
        destructiveSoft: "#FFE0E0",
      },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        background === "muted" && tones.some(([fill]) => fill === foreground),
    );
    expect(
      failures.map(({ foreground, pairClass, floor }) => ({
        foreground,
        pairClass,
        floor,
      })),
    ).toEqual(
      tones.map(([fill]) => ({
        foreground: fill,
        pairClass: "surface",
        floor: contrastFloors.default.surface,
      })),
    );
    expect(failures.every(({ ratio }) => ratio < 1.05)).toBe(true);
    expect(failures[0]?.ratio).toBeCloseTo(1.0232, 4);
  });

  it("keeps the soft text and edge floors on the deeper tints", () => {
    tones.forEach(([fill, foreground, border]) => {
      expect(
        contrastRatio(lightTheme.colors[foreground], lightTheme.colors[fill]),
        `light: ${foreground} on ${fill}`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.body);
      expect(
        contrastRatio(lightTheme.colors[border], lightTheme.colors[fill]),
        `light: ${border} on ${fill}`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.divider);
    });
  });

  it("names the quiet panel in the soft-surface pairs", () => {
    tones.forEach(([fill]) => {
      expect(contrastPairs).toContainEqual([fill, "muted", "surface"]);
    });
  });
});
