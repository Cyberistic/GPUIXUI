/**
 * Guards the defect plan 507 fixes: `overlayWashPairs` measures the modal scrim
 * against everything it covers, but nothing measured the element that sits *on*
 * the scrim — the dialog's own face. A dialog, drawer or command palette paints
 * `popover` over the scrim (`components/dialog.tsx` paints the surface at :181
 * and the scrim at :248), so a theme whose `overlay` composites to its `popover`
 * ships a dialog with no face and only a 1px `border`, while every check
 * returned `[]`.
 *
 * The elevation contract does not cover it: plan 505 measures each level's
 * shadow over the four page surfaces, and a dialog's shadow lands on the scrim.
 * On the identity dark scrim (`#060709`) the `lg` tint measures **1.0353:1**,
 * and no black tint can clear the floor — pure black over that scrim reaches
 * only **1.0421:1**. The surface is the modal's separation, so it is measured.
 *
 * The content fills behind the scrim are deliberately not a face pair: macOS
 * dark's face meets the scrim over a `primary` action at **1.0213:1** (its
 * `border` carries that patch at 1.4954:1), and no `popover` value leaves the
 * band the scrim compresses the page into. Raising the scrim to 70% clears
 * `primary` (1.0775:1) and collapses `destructive` (1.0185:1). The case below
 * pins that trade so the documents' rationale cannot drift into a palette edit
 * that only moves the collision.
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

const layoutSurfaces = dialogSurfacePairs.map(([, surface]) => surface);

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

    expect(failures).toEqual([]);
    expect(darkestFace(getTheme("dark"))).toBeCloseTo(1.21, 3);
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

  it("measures the page layout the scrim splits off, not the content fills", () => {
    expect(layoutSurfaces).toEqual(
      overlaySurfaces.slice(0, dialogSurfacePairs.length),
    );
    expect(new Set(layoutSurfaces).size).toBe(dialogSurfacePairs.length);
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

  it("records the content-patch band no scrim opacity can clear", () => {
    const macosDark = getPlatformTheme("darwin", "dark");
    const primaryPatch = compositeOver(
      macosDark.colors.overlay,
      macosDark.colors.primary,
    );

    expect(faceRatio(macosDark, "primary")).toBeCloseTo(1.0213, 3);
    expect(contrastRatio(macosDark.colors.border, primaryPatch)).toBeCloseTo(
      1.4954,
      3,
    );

    const raised = extendTheme(macosDark, {
      colors: { overlay: "#000000B3" },
    });

    expect(faceRatio(raised, "primary")).toBeCloseTo(1.0775, 3);
    expect(faceRatio(raised, "destructive")).toBeCloseTo(1.0185, 3);
    expect(contrastFloors.default.surface).toBeGreaterThan(
      faceRatio(raised, "destructive"),
    );
  });
});
