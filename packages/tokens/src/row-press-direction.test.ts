/**
 * Guards the defect plan 622 fixes: plan 619 published the selectable row's
 * press **distance** (`rowPressStepPairs`, `active` one 1.05:1 step from the
 * `accent` hover) but `stateLadders` did not name the ladder, so a copied dark
 * theme could darken on press — toward the canvas — while the step passed and
 * `themeFailures` returned `[]`. The row press is the last pointer ladder the
 * direction check was not walking.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  rowPressStepPairs,
  shippedThemes,
  stateLadders,
  themeContrastFailures,
  themeDirectionFailures,
  themeFailures,
} from "./index.js";
import { invertedRowPressTheme } from "./row-press.example.js";

describe("the selectable row's press direction", () => {
  it("passes every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeDirectionFailures(theme), theme.name).toEqual([]);
    });
  });

  it("reports a dark row that presses darker than its hover", () => {
    // The contrast half cannot see it: the press is a 1.094:1 step and every
    // on-colour pair passes.
    expect(themeContrastFailures(invertedRowPressTheme)).toEqual([]);

    const failures = themeDirectionFailures(invertedRowPressTheme);
    expect(failures).toHaveLength(1);
    expect(failures).toMatchObject([
      {
        ladder: "rowPress",
        from: "accent",
        to: "active",
        expected: "lighter",
      },
    ]);
    failures.forEach(({ fromLuminance, toLuminance }) => {
      expect(Number.isFinite(fromLuminance)).toBe(true);
      expect(Number.isFinite(toLuminance)).toBe(true);
      expect(toLuminance).toBeLessThan(fromLuminance);
    });
  });

  it("carries the inversion through the total check", () => {
    const failures = themeFailures(invertedRowPressTheme);
    expect(failures.map(({ kind }) => kind)).toEqual(["direction"]);
    expect(failures[0]).toMatchObject({ ladder: "rowPress" });
  });

  it("mirrors the published step pair", () => {
    expect(stateLadders.filter(({ name }) => name === "rowPress")).toHaveLength(
      1,
    );
    rowPressStepPairs.forEach(([to, from]) => {
      expect(stateLadders).toContainEqual({
        name: "rowPress",
        roles: [from, to],
      });
    });
  });

  it("keeps the distance it measures", () => {
    const step = contrastRatio(
      invertedRowPressTheme.colors.active,
      invertedRowPressTheme.colors.accent,
    );
    expect(step).toBeGreaterThanOrEqual(
      contrastFloors[invertedRowPressTheme.contrast].step,
    );
    expect(contrastPairs).toContainEqual(["active", "accent", "step"]);
  });

  /**
   * The sentence that keeps a row's press on `active` rather than `accentActive`
   * rests on two measurements: on macOS dark a row label on the accent family's
   * pressed fill misses the 7:1 body floor, and no shipped set misses it on the
   * role the row keeps. Plan `698` moved that family one step after the sentence
   * was written, so both halves are derived here — a palette move that makes the
   * rejected fill readable, or the kept one unreadable, fails instead of leaving
   * a rationale the shipped sets no longer support.
   */
  it("keeps the row's press on the fill that clears the body floor", () => {
    const floor = contrastFloors.default.body;
    const label = (fill: "active" | "accentActive") =>
      shippedThemes.map(({ theme }) => ({
        name: theme.name,
        ratio: contrastRatio(theme.colors.foreground, theme.colors[fill]),
      }));

    const rejected = label("accentActive");
    const short = rejected.filter(({ ratio }) => ratio < floor);
    expect(short.map(({ name }) => name)).toEqual(["Dark · macOS"]);

    const worst = rejected.reduce((current, next) =>
      next.ratio < current.ratio ? next : current,
    );
    expect(worst.name).toBe("Dark · macOS");
    expect(Number(worst.ratio.toFixed(3))).toBe(6.677);

    label("active").forEach(({ name, ratio }) =>
      expect(ratio, name).toBeGreaterThanOrEqual(floor),
    );
  });
});
