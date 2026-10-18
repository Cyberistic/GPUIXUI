/**
 * Guards the defect plan 087 fixed: secondary text was never measured through
 * the selection wash. A drag-select covers the row description, card caption,
 * table metadata and timestamp painted in `mutedForeground`, and seven of the
 * ten shipped colour sets were below the 4.5:1 secondary floor there — identity
 * light measured 4.06:1 on `active`, identity dark 3.49:1, macOS light 3.96:1,
 * macOS dark 3.89:1, Linux light 3.87:1, Linux dark 4.10:1 on `selected` and
 * Windows light 3.88:1 — while every suite stayed green.
 *
 * The same audit found the wash itself had no pair, so the new text pairs could
 * have been satisfied by making the highlight invisible. `selectionWashPairs`
 * holds the wash to the 1.05:1 perceivability floor on every surface, and this
 * file proves both directions fail without the fix.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getTheme,
  selectionPairs,
  selectionSoftPairs,
  selectionSoftWashPairs,
  selectionSurfaces,
  selectionWashPairs,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const measureSelected = (
  theme: Theme,
  surface: keyof Theme["colors"],
): number =>
  contrastRatio(
    theme.colors.mutedForeground,
    compositeOver(theme.colors.selection, theme.colors[surface]),
  );

describe("selected secondary text", () => {
  it("holds every text pair through the wash, secondary included", () => {
    expect(selectionPairs).toHaveLength(20);
    expect(
      selectionPairs.filter(([foreground]) => foreground === "mutedForeground"),
    ).toHaveLength(selectionSurfaces.length);
  });

  it("clears the secondary floor on every shipped set and surface", () => {
    themes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].secondary;
      selectionSurfaces.forEach((surface) => {
        expect(
          measureSelected(theme, surface),
          `${label}: mutedForeground over selection on ${surface}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("names the identity regression when the secondary grey is reverted", () => {
    const regressed = extendTheme(getTheme("light"), {
      // The pre-087 secondary grey on the pre-309 quiet panel.
      colors: { mutedForeground: "#545D6C", muted: "#EEF1F5" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, wash }) =>
        foreground === "mutedForeground" && wash === "selection",
    );

    expect(failures.map(({ background }) => background)).toEqual([
      "muted",
      "hover",
      "active",
      "accent",
      "selected",
      // The caption on a status panel carries the same role through the same
      // wash (plan 362).
      ...selectionSoftPairs
        .filter(([foreground]) => foreground === "mutedForeground")
        .map(([, background]) => background),
    ]);
    expect(
      failures.every(
        ({ pairClass, floor, ratio }) =>
          pairClass === "secondary" && floor === 4.5 && ratio < 4.5,
      ),
    ).toBe(true);
    expect(
      failures.find(({ background }) => background === "active")?.ratio,
    ).toBeCloseTo(4.06, 2);
  });

  it("names the dark regression the same way", () => {
    const regressed = extendTheme(getTheme("dark"), {
      // The pre-087 secondary grey.
      colors: { mutedForeground: "#A1A9B7" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, wash }) =>
        foreground === "mutedForeground" && wash === "selection",
    );

    expect(failures).toHaveLength(8);
    expect(
      failures.find(({ background }) => background === "active")?.ratio,
    ).toBeCloseTo(4.25, 2);
  });
});

describe("the selection wash stays visible", () => {
  it("documents one perceivability pair per surface", () => {
    expect(selectionWashPairs).toEqual(
      selectionSurfaces.map((surface) => ["selection", surface, "surface"]),
    );
  });

  it("clears the surface floor on every shipped set", () => {
    themes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].surface;
      selectionWashPairs.forEach(([, background]) => {
        const painted = compositeOver(
          theme.colors.selection,
          theme.colors[background],
        );
        expect(
          contrastRatio(painted, theme.colors[background]),
          `${label}: selection on ${background}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("reports a wash that is too faint to see", () => {
    const faint = extendTheme(getTheme("light"), {
      colors: { selection: "#7567F205" },
    });
    const failures = themeContrastFailures(faint).filter(
      ({ foreground, wash }) =>
        wash === "selection" && foreground === "selection",
    );

    expect(failures.map(({ background }) => background)).toEqual([
      ...selectionSurfaces,
      ...selectionSoftWashPairs.map(([, background]) => background),
    ]);
    expect(
      failures.every(
        ({ pairClass, floor, ratio }) =>
          pairClass === "surface" && floor === 1.05 && ratio < 1.05,
      ),
    ).toBe(true);
  });
});
