/**
 * The bug plan 393 fixes: a `Skeleton` paints its role at 60% opacity for half of
 * every pulse (`primitives/src/components/Skeleton.tsx` renders
 * `opacity: pulseOpacity(step)`, whose dim default is `0.6`), but the contrast
 * contract measured only the opaque role. Identity dark's `#3D4552` on the
 * selected fill measured 1.058:1 opaque — barely over the 1.05:1 floor — and
 * **1.008:1** at 60%, so the placeholder vanished on a selected row for half of
 * every cycle while `themeContrastFailures` returned `[]`.
 *
 * `skeletonPulsePairs` composites the dim frame on the same eight surfaces the
 * opaque list measures, `skeletonPulseOpacity` is the published fraction, and a
 * failure carries it as `opacity` so the dim frame is distinguishable from the
 * opaque pair it shares a role and surface with. The dark skeleton moves a
 * half-step to `#434C5A` so the frame clears the floor.
 */

import { describe, expect, it } from "vitest";
import {
  alpha,
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  darkColors,
  extendTheme,
  getTheme,
  shippedThemes,
  skeletonPulseOpacity,
  skeletonPulsePairs,
  themeContrastFailures,
} from "./index.js";

const dimFrame = (color: string, surface: string): number =>
  contrastRatio(
    compositeOver(alpha(color, skeletonPulseOpacity), surface),
    surface,
  );

describe("the loading pulse's dim frame", () => {
  it("keeps every shipped set's dim frame visible", () => {
    shippedThemes.forEach(({ theme }) => {
      const failures = themeContrastFailures(theme).filter(
        (failure) =>
          failure.foreground === "skeleton" &&
          failure.opacity === skeletonPulseOpacity,
      );
      expect(failures, theme.name).toEqual([]);
    });
  });

  it("reports the pre-fix dark skeleton on the selected fill", () => {
    const dark = getTheme("dark");
    const preFix = extendTheme(dark, { colors: { skeleton: "#3D4552" } });

    expect(themeContrastFailures(preFix)).toContainEqual(
      expect.objectContaining({
        foreground: "skeleton",
        background: "selected",
        wash: "skeleton",
        opacity: skeletonPulseOpacity,
        pairClass: "surface",
        floor: contrastFloors.default.surface,
      }),
    );
  });

  it("reports the dim frame beside the opaque pair it shares a role with", () => {
    const dark = getTheme("dark");
    const erased = extendTheme(dark, {
      colors: { skeleton: dark.colors.selected },
    });

    const skeletonFailures = themeContrastFailures(erased).filter(
      (failure) => failure.foreground === "skeleton",
    );
    const onSelected = skeletonFailures.filter(
      (failure) => failure.background === "selected",
    );

    expect(onSelected).toHaveLength(2);
    expect(onSelected.map(({ opacity }) => opacity).toSorted()).toEqual(
      [skeletonPulseOpacity, undefined].toSorted(),
    );
  });

  it("reports the composited ratio, not the opaque one", () => {
    const dark = getTheme("dark");
    const preFix = extendTheme(dark, { colors: { skeleton: "#3D4552" } });

    const dim = themeContrastFailures(preFix).find(
      (failure) =>
        failure.foreground === "skeleton" &&
        failure.background === "selected" &&
        failure.opacity === skeletonPulseOpacity,
    );
    expect(dim).toBeDefined();
    if (dim === undefined) {
      return;
    }

    expect(dim.ratio).toBe(dimFrame("#3D4552", dark.colors.selected));
    expect(dim.ratio).toBeLessThan(contrastFloors.default.surface);

    const opaque = themeContrastFailures(preFix).find(
      (failure) =>
        failure.foreground === "skeleton" &&
        failure.background === "selected" &&
        failure.opacity === undefined,
    );
    expect(opaque).toBeUndefined();
  });

  it("publishes the fraction the primitive paints", () => {
    expect(skeletonPulseOpacity).toBe(0.6);
    expect(skeletonPulsePairs.length).toBe(
      contrastPairs.filter(
        ([foreground, , pairClass]) =>
          foreground === "skeleton" && pairClass === "surface",
      ).length,
    );
  });

  it("moves the dark skeleton far enough to survive the dim frame", () => {
    expect(darkColors.skeleton).toBe("#434C5A");

    skeletonPulsePairs.forEach(([, background]) => {
      const surface = getTheme("dark").colors[background];
      expect(
        dimFrame(darkColors.skeleton, surface),
        `dim frame on ${background}`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.surface);
    });
  });
});
