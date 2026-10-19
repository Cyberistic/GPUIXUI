/**
 * Guards the defect plan 623 closes: a selected row's inherited label could be
 * raised to its title's strength (or above it) while the colour contract and
 * the total check both returned `[]`. `selectedForeground` and `foreground` each
 * have their own floor pairs, but `textTiers` named no pair for the relationship,
 * so a theme whose label out-contrasted its title still passed every check.
 *
 * The four fills are the surfaces both roles are documented on; the identity,
 * every platform variant and every recipe already keep the label at least one
 * 1.05:1 step below the title there.
 */

import { describe, expect, it } from "vitest";
import type { ThemeColors } from "./color.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  textTiers,
  themeContrastFailures,
  themeTextTierFailures,
} from "./contrast.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

const dimmer = "selectedForeground" as const;
const brighter = "foreground" as const;
const fillOrder = ["hover", "active", "accent", "selected"] as const;

const surfacesOf = (
  role: keyof ThemeColors,
): ReadonlyArray<keyof ThemeColors> =>
  contrastPairs.flatMap(([foreground, background]) =>
    foreground === role ? [background] : [],
  );

const sharedSurfaces = (): ReadonlyArray<keyof ThemeColors> => {
  const brighterSurfaces = surfacesOf(brighter);
  return surfacesOf(dimmer).filter((surface) =>
    brighterSurfaces.includes(surface),
  );
};

describe("the selected row's label below its title", () => {
  it("keeps every shipped set one step below on the four fills", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      fillOrder.flatMap((surface) => {
        const title = contrastRatio(
          theme.colors.foreground,
          theme.colors[surface],
        );
        const label = contrastRatio(
          theme.colors.selectedForeground,
          theme.colors[surface],
        );
        return title / label >= contrastFloors[theme.contrast].step
          ? []
          : [`${theme.name}: ${surface}`];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("names the shipped tightest step", () => {
    const steps = shippedThemes.flatMap(({ theme }) =>
      fillOrder.map((surface) => ({
        name: theme.name,
        surface,
        step:
          contrastRatio(theme.colors.foreground, theme.colors[surface]) /
          contrastRatio(theme.colors.selectedForeground, theme.colors[surface]),
      })),
    );
    const tightest = steps.reduce((best, step) =>
      step.step < best.step ? step : best,
    );

    expect(tightest.name).toBe("Dark · Windows");
    expect(tightest.surface).toBe("hover");
    expect(tightest.step).toBeCloseTo(1.106, 3);
  });

  it("reports a label raised to the title's strength", () => {
    const base = getTheme("dark");
    const regressed = extendTheme(base, {
      colors: { selectedForeground: base.colors.foreground },
    });
    const tierFailures = themeTextTierFailures(regressed).filter(
      (failure) => failure.dimmer === dimmer && failure.brighter === brighter,
    );

    expect(themeContrastFailures(regressed)).toEqual([]);
    expect(tierFailures).toHaveLength(4);
    tierFailures.forEach((failure) => {
      expect(failure.step).toBe(contrastFloors.default.step);
      expect(failure.dimmerRatio).toBeCloseTo(failure.brighterRatio, 10);
    });
    expect(
      themeFailures(regressed).filter(
        (failure) => failure.kind === "hierarchy",
      ),
    ).toHaveLength(4);
  });

  it("reports a label brighter than the title", () => {
    const base = getTheme("dark");
    const regressed = extendTheme(base, {
      colors: { selectedForeground: "#FFFFFF" },
    });
    const label = contrastRatio(
      regressed.colors.selectedForeground,
      regressed.colors.selected,
    );
    const title = contrastRatio(
      regressed.colors.foreground,
      regressed.colors.selected,
    );

    expect(label).toBeGreaterThan(title);
    expect(themeContrastFailures(regressed)).toEqual([]);
    expect(
      themeTextTierFailures(regressed).filter(
        (failure) => failure.dimmer === dimmer && failure.brighter === brighter,
      ),
    ).toHaveLength(4);
    expect(
      themeFailures(regressed).filter(
        (failure) => failure.kind === "hierarchy",
      ),
    ).toHaveLength(4);
  });

  it("publishes the pair once, as a state on the four row fills", () => {
    const pairs = textTiers.filter(
      ([dimmerRole, brighterRole]) =>
        dimmerRole === dimmer && brighterRole === brighter,
    );
    const base = getTheme("dark");
    const regressed = extendTheme(base, {
      colors: { selectedForeground: base.colors.foreground },
    });
    const surfaces = themeTextTierFailures(regressed)
      .filter(
        (failure) => failure.dimmer === dimmer && failure.brighter === brighter,
      )
      .map((failure) => failure.surface);

    expect(pairs).toEqual([[dimmer, brighter]]);
    expect(sharedSurfaces()).toEqual(fillOrder);
    expect(surfaces).toEqual(fillOrder);
  });
});
