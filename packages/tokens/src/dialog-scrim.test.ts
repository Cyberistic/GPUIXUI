/**
 * Guards the defect plans 507 and 526 fix: `overlayWashPairs` measures the modal
 * scrim against everything it covers, but nothing measured the element that sits
 * *on* the scrim — the dialog's own face.
 *
 * Plan 507 measured it over the six page layout surfaces only, excluding the
 * twelve content fills behind the scrim with the rationale that macOS dark's
 * face met the scrim over its `primary` at **1.0213:1** and the dialog's `border`
 * carried that patch at 1.4954:1. Both halves were wrong: the excluded pair is a
 * failure the checker could not see, and the edge carries only that one patch —
 * over Windows dark's scrimmed `success` chip the same `border` measures
 * **1.0057:1**, under the divider floor. A dialog over a Badge therefore had
 * neither a face nor an edge while every check returned `[]`.
 *
 * The scrim's own opacity is the lever. At the shipped 65% the content band sits
 * around the floating face on macOS dark; raising it to 70% moves the collision
 * to `destructive` (1.0185:1), but the scrimmed content darkens past the face as
 * the alpha rises, so 82% (`#000000D0`) puts the whole band below it. The cases
 * below pin the border, the two rejected alphas and the shipped tightest pair.
 */

import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  dialogSurfacePairs,
  elevationShadow,
  extendTheme,
  getPlatformTheme,
  getTheme,
  overlaySurfaces,
  shippedThemes,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const faceRatio = (theme: Theme, surface: keyof Theme["colors"]): number =>
  contrastRatio(
    theme.colors.popover,
    compositeOver(theme.colors.overlay, theme.colors[surface]),
  );

const darkestFace = (theme: Theme): number =>
  Math.min(
    ...dialogSurfacePairs.map(([, surface]) => faceRatio(theme, surface)),
  );

const faceSurfaces = dialogSurfacePairs.map(([, surface]) => surface);

const tightestFace = () =>
  shippedThemes
    .flatMap(({ theme }) =>
      dialogSurfacePairs.map(([, surface]) => ({
        name: theme.name,
        surface,
        ratio: faceRatio(theme, surface),
      })),
    )
    .reduce((worst, current) =>
      current.ratio < worst.ratio ? current : worst,
    );

describe("the dialog's face on the scrim", () => {
  it("keeps every shipped face above the surface floor", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const floor = contrastFloors[theme.contrast].surface;
      return dialogSurfacePairs.flatMap(([, surface]) => {
        const ratio = faceRatio(theme, surface);
        return ratio >= floor
          ? []
          : [`${theme.name} on ${surface}: ${ratio.toFixed(3)}`];
      });
    });
    const tightest = tightestFace();

    expect(failures).toEqual([]);
    expect(darkestFace(getTheme("dark"))).toBeCloseTo(1.1549, 3);
    expect([tightest.name, tightest.surface]).toEqual([
      "Dark · Linux",
      "destructive",
    ]);
    expect(tightest.ratio).toBeCloseTo(1.0785, 3);
  });

  it("reports a scrim that erases the face", () => {
    (["light", "dark"] as const).forEach((mode) => {
      const base = getTheme(mode);
      const erased = extendTheme(base, {
        colors: { overlay: base.colors.popover },
      });

      const failures = themeContrastFailures(erased).filter(
        (failure) =>
          failure.foreground === "popover" && failure.wash === "overlay",
      );

      expect(failures, mode).toHaveLength(dialogSurfacePairs.length);
      expect(failures).toEqual(
        dialogSurfacePairs.map(([, surface]) =>
          expect.objectContaining({
            foreground: "popover",
            background: surface,
            wash: "overlay",
            pairClass: "surface",
            floor: contrastFloors.default.surface,
            ratio: 1,
          }),
        ),
      );
    });
  });

  it("measures every surface a window shows", () => {
    expect(faceSurfaces).toEqual(overlaySurfaces);
    expect(new Set(faceSurfaces).size).toBe(overlaySurfaces.length);
  });

  it("records why the shadow cannot be the modal's separation", () => {
    const theme = getTheme("dark");
    const scrim = compositeOver(theme.colors.overlay, theme.colors.background);
    const shadow = elevationShadow(theme, "lg");
    const painted =
      shadow === undefined
        ? Number.NaN
        : contrastRatio(compositeOver(shadow.color, scrim), scrim);
    const floor = contrastFloors.default.surface;

    expect(scrim).toBe("#060709");
    expect(shadow?.color).toBe("#000000CC");
    expect(painted).toBeCloseTo(1.0353, 3);
    expect(contrastRatio("#000000", scrim)).toBeCloseTo(1.0421, 3);
    expect(contrastRatio("#000000", scrim)).toBeLessThan(floor);
  });

  it("records why the edge cannot carry a content patch", () => {
    const windows = getPlatformTheme("win32", "dark");
    const successPatch = compositeOver(
      windows.colors.overlay,
      windows.colors.success,
    );
    const aaa = getTheme("light", "high");
    const scrimmedCanvas = compositeOver(
      aaa.colors.overlay,
      aaa.colors.background,
    );

    expect(contrastRatio(windows.colors.border, successPatch)).toBeCloseTo(
      1.0057,
      3,
    );
    expect(contrastRatio(aaa.colors.border, scrimmedCanvas)).toBeCloseTo(
      1.0736,
      3,
    );
    expect(contrastFloors.high.divider).toBeGreaterThan(
      contrastRatio(aaa.colors.border, scrimmedCanvas),
    );
  });

  it("records the scrim opacity that keeps the face outside the content band", () => {
    const macosDark = getPlatformTheme("darwin", "dark");
    const regressed = extendTheme(macosDark, {
      // The pre-698 accent, kept so the historical face ratio stays the one
      // plan 526 recorded; plan 698 moved the dark accent lighter.
      colors: { primary: "#0A84FF", overlay: "#000000A6" },
    });
    const tooLight = extendTheme(macosDark, {
      colors: { overlay: "#000000CC" },
    });

    expect(macosDark.colors.overlay).toBe("#000000D0");
    expect(faceRatio(macosDark, "warning")).toBeCloseTo(1.0826, 3);
    expect(faceRatio(tooLight, "warning")).toBeCloseTo(1.0383, 3);
    expect(faceRatio(regressed, "primary")).toBeCloseTo(1.0213, 3);
    expect(
      themeContrastFailures(regressed).filter(
        (failure) =>
          failure.foreground === "popover" && failure.wash === "overlay",
      ),
    ).toEqual([
      expect.objectContaining({
        background: "primary",
        pairClass: "surface",
        floor: contrastFloors.default.surface,
        ratio: expect.closeTo(1.0213, 3),
      }),
    ]);
    expect(
      themeContrastFailures(macosDark).filter(
        (failure) => failure.foreground === "popover",
      ),
    ).toEqual([]);
  });
});
