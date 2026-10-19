/**
 * The modal scrim and the floating menu's shadow must dim the three resting
 * fills they used to exclude. `disabled`, `skeleton` and `track` were left out
 * of `contentFillSurfaces`, so a copied theme whose scrim composited to one of
 * them — a black scrim over a black disabled fill, loading row or value groove —
 * passed every public check while the element stayed undimmed behind the
 * dialog. The three are resting fills, not pointer states: a disabled control
 * and a loading row stay on screen while a dialog is open, and a progress or
 * slider groove is a painted indicator. The guard below fails without the three
 * list entries and holds every shipped set to the floor they now meet.
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  dialogSurfacePairs,
  elevationContentSurfaces,
  elevationShadows,
  extendTheme,
  getTheme,
  overlaySurfaces,
  overlayWashPairs,
  shippedThemes,
  themeContrastFailures,
  themeFailures,
} from "./index.js";

const restingFills = ["disabled", "skeleton", "track"] as const;

describe("the scrim over the resting fills it excluded", () => {
  it("measures the disabled control, the loading row and the value groove", () => {
    restingFills.forEach((fill) => {
      expect(overlaySurfaces, fill).toContain(fill);
      expect(elevationContentSurfaces, fill).toContain(fill);
      expect(
        overlayWashPairs.map(([, background]) => background),
        fill,
      ).toContain(fill);
      expect(
        dialogSurfacePairs.map(([, background]) => background),
        fill,
      ).toContain(fill);
    });
  });

  it("reports a black scrim that disappears on a black resting fill", () => {
    const regressed = extendTheme(getTheme("dark"), {
      colors: {
        disabled: "#000000",
        skeleton: "#000000",
        track: "#000000",
      },
    });

    const failures = themeContrastFailures(regressed);
    restingFills.forEach((fill) => {
      expect(failures, fill).toContainEqual({
        foreground: "overlay",
        background: fill,
        wash: "overlay",
        pairClass: "surface",
        floor: contrastFloors.default.surface,
        ratio: 1,
      });
    });
    expect(
      themeFailures(regressed).filter(({ kind }) => kind === "contrast"),
    ).toHaveLength(restingFills.length * 2);
  });

  it("clears the scrim, the dialog face and the menu shadow in every shipped set", () => {
    let tightestScrim = Number.POSITIVE_INFINITY;

    shippedThemes.forEach(({ theme }) => {
      const floor = contrastFloors[theme.contrast].surface;

      restingFills.forEach((fill) => {
        const surface = theme.colors[fill];
        const scrimmed = compositeOver(theme.colors.overlay, surface);
        const scrim = contrastRatio(scrimmed, surface);
        const face = contrastRatio(theme.colors.popover, scrimmed);

        expect(
          scrim,
          `${theme.name} overlay on ${fill}`,
        ).toBeGreaterThanOrEqual(floor);
        expect(
          face,
          `${theme.name} face on scrimmed ${fill}`,
        ).toBeGreaterThanOrEqual(floor);
        tightestScrim = Math.min(tightestScrim, scrim);

        const md = elevationShadows(theme, "md");
        expect(md.length, `${theme.name} ships an md level`).toBeGreaterThan(0);
        md.forEach((shadow) => {
          expect(
            contrastRatio(compositeOver(shadow.color, surface), surface),
            `${theme.name} md shadow on ${fill}`,
          ).toBeGreaterThanOrEqual(floor);
        });
      });
    });

    // The tightest shipped scrim over the three fills is 1.284:1 (Dark · Windows
    // on `track`); keep visible headroom so a palette edit is reported here, not
    // only by a consumer.
    expect(tightestScrim).toBeGreaterThan(1.2);
  });

  it("reports a shadow that disappears on the value groove", () => {
    const regressed = extendTheme(getTheme("dark"), {
      colors: { track: "#000000", shadow: "#000000" },
    });
    const failures = themeContrastFailures(regressed);

    expect(failures).toContainEqual(
      expect.objectContaining({
        foreground: "shadow",
        background: "track",
        pairClass: "surface",
        ratio: 1,
      }),
    );
  });

  it("grows the two composite walks without publishing a row", () => {
    // The scrim and the dialog face are separate published walks, like the
    // elevation shadow, so only plan 651's press pairs grow the plain list.
    expect(overlayWashPairs).toHaveLength(21);
    expect(dialogSurfacePairs).toHaveLength(21);
    expect(contrastPairs.length).toBe(461);
  });
});
