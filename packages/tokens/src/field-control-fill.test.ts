/**
 * Guards the composition plan 595 closes: a field is a surface that hosts
 * controls. `NumberField` paints its chrome with the `input` fill
 * (`fieldRecipeStyle` in `packages/primitives`) and renders its two step
 * buttons with the same hover/press resolver a ghost control uses, so those
 * washes land **on the field's own fill**. `stateFillSurfaces` named the
 * canvas, card, popover and quiet panel only, so an edited theme whose `input`
 * equalled its `hover` returned `[]` from all nine checks while the stepper had
 * no visible hover: the wash measured **1.000:1** on the field while the same
 * wash on the card was still 1.133:1.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastRatio,
  extendTheme,
  getTheme,
  shippedThemes,
  stateFillRoles,
  stateFillSurfacePairs,
  stateFillSurfaces,
  themeFailures,
  washStepPairs,
} from "./index.js";

describe("the interactive fill a control paints inside a field", () => {
  it("reports a field fill that erases the ghost wash", () => {
    const plant = extendTheme(getTheme("light"), {
      colors: { input: getTheme("light").colors.hover },
    });

    expect(
      themeFailures(plant).filter(
        (failure) =>
          failure.kind === "contrast" &&
          failure.foreground === "hover" &&
          failure.background === "input",
      ),
    ).toContainEqual({
      kind: "contrast",
      foreground: "hover",
      background: "input",
      pairClass: "surface",
      floor: contrastFloors.default.surface,
      ratio: 1,
    });
  });

  it("measures every interactive fill on the field", () => {
    expect(stateFillSurfaces).toContain("input");
    expect(
      stateFillSurfaces.filter((surface) => surface === "input"),
    ).toHaveLength(1);
    stateFillRoles.forEach((fill) => {
      expect(stateFillSurfacePairs, `${fill} on input`).toContainEqual([
        fill,
        "input",
        "surface",
      ]);
    });
  });

  it("clears the surface floor on the field in every shipped set", () => {
    const measurements = shippedThemes.flatMap(({ theme }) =>
      stateFillRoles.map((fill) => ({
        theme: theme.name,
        fill,
        contrast: theme.contrast,
        ratio: contrastRatio(theme.colors[fill], theme.colors.input),
      })),
    );

    measurements.forEach(({ theme, fill, contrast: level, ratio }) => {
      expect(ratio, `${theme}: ${fill} on input`).toBeGreaterThanOrEqual(
        contrastFloors[level].surface,
      );
    });

    const tightest = measurements.reduce((lowest, entry) =>
      entry.ratio < lowest.ratio ? entry : lowest,
    );
    expect(tightest.fill).toBe("selectedActive");
    expect(tightest.theme).toBe("Dark · Linux");
    expect(tightest.ratio).toBeCloseTo(1.0695, 3);
  });

  it("keeps the ghost wash ladder the stepper paints", () => {
    expect(stateFillSurfacePairs).toContainEqual(["hover", "input", "surface"]);
    expect(stateFillSurfacePairs).toContainEqual([
      "active",
      "input",
      "surface",
    ]);
    expect(washStepPairs).toContainEqual(["active", "hover", "step"]);
  });
});
