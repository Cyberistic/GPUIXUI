/**
 * Guards the gap plan 671 closes. Plan 651 gave a selected row its
 * `selectedActive` press and both documents list the invalid control's ring on
 * "the same surfaces" as `ring` — including that pressed fill — but
 * `invalidRingPairs` was written before the surface existed and omits it.
 *
 * An inline-edit field inside a chosen row is focused, invalid and pressed at
 * once, so the field's `destructive` error ring lands on `selectedActive`.
 * `palette.neutral[200]` (`#E1E5EC`) measures **1.0596:1** on the identity
 * light fill: it clears the 1.05:1 status-chip floor, so no surface pair catches
 * it, and `themeContrastFailures` returned `[]` for the ring.
 *
 * Every shipped set already clears the pair (3.761:1 at the tightest,
 * `Light · Windows XP`), so this is a guarantee, not a palette fix.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  invalidRingPairs,
  palette,
  shippedThemes,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const hiddenColor = palette.neutral[200];

const hidden = (): Theme =>
  extendTheme(getTheme("light"), { colors: { destructive: hiddenColor } });

const pressedRowFailures = (theme: Theme) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background }) =>
      foreground === "destructive" && background === "selectedActive",
  );

describe("the invalid focus ring on a pressed selected row", () => {
  it("plants a colour that clears the chip floor and misses the boundary", () => {
    const ratio = contrastRatio(
      hiddenColor,
      getTheme("light").colors.selectedActive,
    );
    expect(ratio).toBeGreaterThanOrEqual(contrastFloors.default.surface);
    expect(ratio).toBeLessThan(contrastFloors.default.boundary);
  });

  it("reports the erased error ring on the pressed selected row", () => {
    const ratio = contrastRatio(
      hiddenColor,
      getTheme("light").colors.selectedActive,
    );
    expect(pressedRowFailures(hidden())).toEqual([
      {
        foreground: "destructive",
        background: "selectedActive",
        pairClass: "boundary",
        floor: contrastFloors.default.boundary,
        ratio,
      },
    ]);
  });

  it("clears the pair in every shipped set", () => {
    const ratios = shippedThemes.map(({ theme }) => {
      const ratio = contrastRatio(
        theme.colors.destructive,
        theme.colors.selectedActive,
      );
      expect(
        ratio,
        `${theme.name} at ${theme.contrast}`,
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].boundary);
      return ratio;
    });
    expect(Math.min(...ratios)).toBeGreaterThan(3.7);
  });

  it("publishes the pair exactly once", () => {
    expect(
      invalidRingPairs.filter(
        ([foreground, background]) =>
          foreground === "destructive" && background === "selectedActive",
      ),
    ).toEqual([["destructive", "selectedActive", "boundary"]]);
    expect(contrastPairs).toContainEqual([
      "destructive",
      "selectedActive",
      "boundary",
    ]);
  });
});
