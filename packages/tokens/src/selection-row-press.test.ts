/**
 * Guards the gap plan 619 closes: a selectable `List` row paints `accent` under
 * the pointer and `active` while pressed, but the contract measured only the
 * generic `hover` → `active` wash ladder and the `accent` → `selected`
 * selection step. Identity dark measured **1.004:1** and XP light **1.019:1**
 * on the row's actual press — it changed hue but not luminance — while
 * `themeContrastFailures` returned `[]`. `rowPressStepPairs` publishes the
 * pair; identity dark's `active` moves `#2A303B` → `#2E3543` and XP light's
 * `#DDD7BE` → `#D8D2B7`, so every shipped set clears 1.05:1 (Windows 7 light
 * is the tightest at 1.060:1).
 */

import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  rowPressStepPairs,
  themeContrastFailures,
} from "./contrast.js";
import { getPlatformRecipeTheme } from "./platform-recipes.js";
import { shippedThemes } from "./shipped-themes.js";
import { themeFailures } from "./theme-check.js";
import { extendTheme, getTheme } from "./theme.js";

const pairFailures = (theme: ReturnType<typeof getTheme>) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background, pairClass }) =>
      foreground === "active" &&
      background === "accent" &&
      pairClass === "step",
  );

describe("a selectable row's press step", () => {
  it("publishes the pair once", () => {
    expect(rowPressStepPairs).toEqual([["active", "accent", "step"]]);
    expect(
      contrastPairs.filter(
        ([foreground, background, pairClass]) =>
          foreground === "active" &&
          background === "accent" &&
          pairClass === "step",
      ),
    ).toHaveLength(1);
  });

  it("clears the step floor in every shipped set", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const ratio = contrastRatio(theme.colors.active, theme.colors.accent);
      const floor = contrastFloors[theme.contrast].step;
      return ratio < floor
        ? [`${theme.name}: ${ratio.toFixed(3)} < ${floor}`]
        : [];
    });
    expect(failures).toEqual([]);
  });

  it("reports the old identity dark press", () => {
    const theme = extendTheme(getTheme("dark"), {
      colors: { active: "#2A303B" },
    });
    const failures = pairFailures(theme);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.default.step);
    expect(failures[0]?.ratio).toBeCloseTo(1.004, 3);
  });

  it("reports the old XP light press", () => {
    const theme = extendTheme(getPlatformRecipeTheme("xp", "light"), {
      colors: { active: "#DDD7BE" },
    });
    const failures = pairFailures(theme);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.default.step);
    expect(failures[0]?.ratio).toBeCloseTo(1.019, 3);
  });

  it("reports the pair through the total check too", () => {
    const theme = extendTheme(getTheme("dark"), {
      colors: { active: "#2A303B" },
    });
    expect(
      themeFailures(theme).some(
        (failure) =>
          failure.kind === "contrast" &&
          failure.foreground === "active" &&
          failure.background === "accent" &&
          failure.pairClass === "step",
      ),
    ).toBe(true);
  });

  it("pins the corrected values and the tightest set", () => {
    const dark = getTheme("dark");
    const xp = getPlatformRecipeTheme("xp", "light");
    expect(dark.colors.active).toBe("#2E3543");
    expect(xp.colors.active).toBe("#D8D2B7");
    expect(contrastRatio(dark.colors.active, dark.colors.accent)).toBeCloseTo(
      1.073,
      3,
    );
    expect(contrastRatio(xp.colors.active, xp.colors.accent)).toBeCloseTo(
      1.071,
      3,
    );

    const tightest = shippedThemes
      .map(({ theme }) => ({
        name: theme.name,
        ratio: contrastRatio(theme.colors.active, theme.colors.accent),
      }))
      .reduce((lowest, next) => (next.ratio < lowest.ratio ? next : lowest));
    expect(tightest.name).toBe("Light · Windows 7");
    expect(tightest.ratio).toBeCloseTo(1.06, 2);
  });
});
