/**
 * Guards the gap plan 524 closes. Plan 510 measures `disabledForeground`
 * through the composited `selection` wash on every `inactiveSurface`, and the
 * list begins with the `disabled` fill — but `selectionWashPairs` measured the
 * wash's own perceivability only on the nine `selectionSurfaces` and the four
 * soft status fills. A theme whose `selection` equalled its `disabled` fill
 * therefore returned no wash failure for that composition: the label is exactly
 * as readable as it was at rest, so the text pair passed too, and the highlight
 * was gone while the checker called the theme good. The disabled fill is the
 * one surface where a washed label is measured but the wash is not.
 *
 * Plan 723 gives the list its second explicit entry: the pressed
 * `selectedActive` a chosen row keeps while the pointer is held, the pointer
 * state `hover` and `active` already cover for an unselected row.
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  getTheme,
  selectionWashPairs,
  themeContrastFailures,
  themeFailures,
} from "./index.js";
import {
  invisibleDisabledWash,
  invisibleDisabledWashFailures,
} from "./disabled-wash.example.js";
import { shippedThemes } from "./shipped-themes.js";

const disabledWashPair = ["selection", "disabled", "surface"] as const;

describe("the selection wash on the disabled fill", () => {
  it("publishes the pair once", () => {
    expect(selectionWashPairs).toContainEqual(disabledWashPair);
    expect(
      selectionWashPairs.filter(
        ([foreground, background]) =>
          foreground === "selection" && background === "disabled",
      ),
    ).toHaveLength(1);
  });

  it("clears the surface floor on every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      const fill = theme.colors.disabled;
      const painted = compositeOver(theme.colors.selection, fill);
      expect(
        contrastRatio(painted, fill),
        `${theme.name}: selection on disabled`,
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].surface);
    });
  });

  it("reports a wash that matches the disabled fill", () => {
    expect(invisibleDisabledWashFailures).toHaveLength(1);
    const [failure] = invisibleDisabledWashFailures;
    expect(failure).toMatchObject({
      foreground: "selection",
      background: "disabled",
      wash: "selection",
      pairClass: "surface",
      floor: contrastFloors.default.surface,
    });
    expect(failure?.ratio).toBeCloseTo(1, 5);
  });

  it("is invisible to the label pair it shares the fill with", () => {
    const failures = themeContrastFailures(invisibleDisabledWash);
    expect(
      failures.some(
        ({ foreground, background }) =>
          foreground === "disabledForeground" && background === "disabled",
      ),
    ).toBe(false);
  });

  it("reaches the total check as a contrast failure", () => {
    expect(
      themeFailures(invisibleDisabledWash).some(
        (failure) =>
          failure.kind === "contrast" &&
          failure.foreground === "selection" &&
          failure.background === "disabled",
      ),
    ).toBe(true);
  });

  it("keeps a visible wash legal", () => {
    const visible = getTheme("light");
    const fill = visible.colors.disabled;
    const painted = compositeOver(visible.colors.selection, fill);
    expect(contrastRatio(painted, fill)).toBeGreaterThan(
      contrastFloors[visible.contrast].surface,
    );
  });
});
