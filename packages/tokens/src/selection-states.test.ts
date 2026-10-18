/**
 * Guards the bug plan 381 fixes: a selectable `List` row paints `accent` while
 * the pointer is over it and `selected` once it is chosen
 * (`components/src/list.tsx`), so the two roles are the state before and after
 * the click. They were the **same value** in the identity (both modes, both
 * contrast levels) and macOS light, and within the 1.05:1 step floor on Windows
 * light, macOS dark and XP light — hovering one row looked like selecting
 * another, and clicking a hovered row changed nothing.
 *
 * This suite holds the selection step to the same rule the filled families
 * (`stateStepPairs`) and the generic wash ladder (`washStepPairs`) carry: a
 * perceivable `step` in every shipped set, a public checker that reports a
 * collapsed one, and a macOS `selectedForeground` that keeps its floor on the
 * deeper fill.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { lightColors } from "./color.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  selectionStepPairs,
  themeColorFailures,
  themeContrastFailures,
  themeMetricFailures,
  type Theme,
} from "./index.js";
import { getPlatformRecipeTheme } from "./platform-recipes.js";
import {
  resolveAuthoredPlatformStyle,
  resolveEditedPlatformTheme,
} from "./platform-styles.example.js";

const shipped: ReadonlyArray<{
  readonly label: string;
  readonly theme: Theme;
}> = shippedThemes.map(({ theme }) => ({ label: theme.name, theme }));

const step = (theme: Theme): number =>
  contrastRatio(theme.colors.selected, theme.colors.accent);

describe("the selected row's step from the hover wash", () => {
  it("publishes the step as one pair of its own", () => {
    expect(selectionStepPairs).toEqual([["selected", "accent", "step"]]);
    expect(
      contrastPairs.filter(
        ([foreground, background]) =>
          foreground === "selected" && background === "accent",
      ),
    ).toEqual([["selected", "accent", "step"]]);
  });

  it("lists the step beside the filled and wash ladders", () => {
    const names = contrastPairs
      .filter(([, , pairClass]) => pairClass === "step")
      .map(([foreground, background]) => `${foreground}/${background}`);
    expect(names).toContain("selected/accent");
    expect(names).toContain("active/hover");
  });

  shipped.forEach(({ label, theme }) => {
    it(`${label}: selection is a perceivable step past the hover`, () => {
      const floor = contrastFloors[theme.contrast].step;
      expect(
        step(theme),
        `${theme.colors.selected} on ${theme.colors.accent}`,
      ).toBeGreaterThanOrEqual(floor);
    });

    it(`${label}: still passes every contract`, () => {
      expect(themeContrastFailures(theme)).toEqual([]);
      expect(themeMetricFailures(theme)).toEqual([]);
      expect(themeColorFailures(theme)).toEqual([]);
    });
  });

  it("reports a theme whose selection is the hover wash", () => {
    const collapsed = extendTheme(getTheme("light"), {
      colors: { selected: lightColors.accent },
    });

    expect(themeContrastFailures(collapsed)).toContainEqual({
      foreground: "selected",
      background: "accent",
      pairClass: "step",
      floor: contrastFloors.default.step,
      ratio: 1,
    });
  });

  it("keeps a distinct selection in each platform that moves it", () => {
    const identity = (mode: "light" | "dark"): string =>
      getTheme(mode).colors.selected;

    expect(getPlatformTheme("darwin", "light").colors.selected).not.toBe(
      identity("light"),
    );
    expect(getPlatformTheme("win32", "light").colors.selected).not.toBe(
      identity("light"),
    );
    expect(getPlatformRecipeTheme("xp", "light").colors.selected).not.toBe(
      identity("light"),
    );
    expect(getPlatformTheme("darwin", "dark").colors.selected).not.toBe(
      identity("dark"),
    );
  });

  it("holds the authored examples to the step in both modes", () => {
    const examples = [
      resolveAuthoredPlatformStyle("light"),
      resolveAuthoredPlatformStyle("dark"),
      resolveEditedPlatformTheme("light"),
      resolveEditedPlatformTheme("dark"),
    ];

    examples.forEach((theme) => {
      expect(themeContrastFailures(theme)).toEqual([]);
      expect(step(theme)).toBeGreaterThanOrEqual(
        contrastFloors[theme.contrast].step,
      );
    });
  });
});
