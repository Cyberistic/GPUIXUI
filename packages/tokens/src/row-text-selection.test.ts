/**
 * Guards the defect plan 525 fixes: `selectionPairs` measured one body role per
 * surface, so a menu row's `popoverForeground` on the `hover`/`active`/`selected`
 * washes (plan 312) and a selected row's inherited `selectedForeground` on the
 * `hover`/`active`/`accent` fills (plan 316) were measured at rest but never
 * through the composited `selection` wash. High-contrast light's
 * `selectedForeground` (`#2E2370`) measured **6.693:1** through the wash on the
 * `active` fill, under the 7:1 secondary floor, in all six AAA light sets while
 * every check returned `[]`. The value moves one iris step to `#1C1547` and the
 * six compositions join `selectionPairs` (20 → 26).
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getTheme,
  selectionPairs,
  shippedThemes,
  themeContrastFailures,
  themeFailures,
  type Theme,
} from "./index.js";

const rowSelectionPairs = [
  ["popoverForeground", "hover"],
  ["popoverForeground", "active"],
  ["popoverForeground", "selected"],
  ["selectedForeground", "hover"],
  ["selectedForeground", "active"],
  ["selectedForeground", "accent"],
] as const;

const measure = (
  theme: Theme,
  foreground: keyof Theme["colors"],
  background: keyof Theme["colors"],
): number =>
  contrastRatio(
    theme.colors[foreground],
    compositeOver(theme.colors.selection, theme.colors[background]),
  );

describe("the row's own text through a text selection", () => {
  it("publishes the six row-text compositions", () => {
    rowSelectionPairs.forEach(([foreground, background]) => {
      expect(selectionPairs, `${foreground} on ${background}`).toContainEqual([
        foreground,
        background,
        "secondary",
      ]);
    });
    expect(selectionPairs).toHaveLength(26);
  });

  it("clears the secondary floor on every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      const floor = contrastFloors[theme.contrast].secondary;
      rowSelectionPairs.forEach(([foreground, background]) => {
        expect(
          measure(theme, foreground, background),
          `${theme.name}: ${foreground} over selection on ${background}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("names the AAA inherited-label regression on the pressed row", () => {
    const regressed = extendTheme(getTheme("light", "high"), {
      colors: { selectedForeground: "#2E2370" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background, wash }) =>
        foreground === "selectedForeground" &&
        background === "active" &&
        wash === "selection",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      foreground: "selectedForeground",
      background: "active",
      wash: "selection",
      pairClass: "secondary",
      floor: contrastFloors.high.secondary,
    });
    expect(failures[0]?.ratio).toBeCloseTo(6.693, 3);
    expect(themeContrastFailures(getTheme("light", "high"))).toEqual([]);
  });

  it("names a menu label erased by the wash", () => {
    const regressed = extendTheme(getTheme("dark"), {
      colors: { popoverForeground: "#AEB6C4" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background, wash }) =>
        foreground === "popoverForeground" &&
        background === "selected" &&
        wash === "selection",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("secondary");
    expect(failures[0]?.floor).toBe(contrastFloors.default.secondary);
    expect(failures[0]?.ratio).toBeCloseTo(3.965, 3);
  });

  it("keeps the shipped AAA light theme whole", () => {
    expect(themeFailures(getTheme("light", "high"))).toEqual([]);
    // The moved label still clears every fill it paints at rest.
    expect(
      measure(getTheme("light", "high"), "selectedForeground", "active"),
    ).toBeGreaterThanOrEqual(contrastFloors.high.secondary);
  });
});
