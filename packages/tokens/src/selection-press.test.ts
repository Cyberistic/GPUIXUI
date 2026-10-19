/**
 * Guards the gap plan 651 closes: the state matrix of a selectable row stopped
 * at the *unselected* press. Plans 381 and 619 hold `accent` → `selected` and
 * `accent` → `active`, but a **selected** row's press was never measured, and
 * the design system claimed it "still presses to `active` … and walk[s] away
 * from the canvas like every ladder". The probe found identity light at
 * **1.001:1** — the selection and the press wash are the same luminance — with
 * eleven of twelve default palettes under the 1.05:1 step floor and eight moving
 * the wrong way, while both `themeContrastFailures` and
 * `themeDirectionFailures` returned `[]`.
 *
 * The press is the one state that previews deselection, so it moves **toward**
 * the canvas: `selectedActive` is a 24% canvas veil over `selected`.
 */

import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  selectionPressPairs,
  selectionPressStepPairs,
  themeContrastFailures,
} from "./contrast.js";
import { stateLadders, themeDirectionFailures } from "./direction.js";
import {
  selectionPressFailures,
  selectionPressTheme,
  selectionPressVeils,
} from "./selection-press.example.js";
import { shippedThemes } from "./shipped-themes.js";
import { themeFailures } from "./theme-check.js";
import { extendTheme, getTheme } from "./theme.js";

const pressStepFailures = (theme: ReturnType<typeof getTheme>) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background, pairClass }) =>
      foreground === "selectedActive" &&
      background === "selected" &&
      pairClass === "step",
  );

const veilFor = (mode: "light" | "dark") => selectionPressVeils[mode];

describe("a selected row's press", () => {
  it("publishes the step once and the ink pair list", () => {
    expect(selectionPressStepPairs).toEqual([
      ["selectedActive", "selected", "step"],
    ]);
    expect(selectionPressPairs.map(([foreground]) => foreground)).toEqual([
      "foreground",
      "selectedForeground",
      "mutedForeground",
      "placeholder",
      "primaryText",
      "disabledForeground",
      "borderStrong",
      "ring",
      "border",
    ]);
    expect(
      contrastPairs.filter(
        ([foreground, background, pairClass]) =>
          foreground === "selectedActive" &&
          background === "selected" &&
          pairClass === "step",
      ),
    ).toHaveLength(1);
  });

  it("carries the one toward-canvas ladder", () => {
    expect(
      stateLadders.filter(({ direction }) => direction === "toward"),
    ).toEqual([
      {
        name: "selectionPress",
        roles: ["selected", "selectedActive"],
        direction: "toward",
      },
    ]);
  });

  it("clears the step and moves toward the canvas in every shipped set", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const ratio = contrastRatio(
        theme.colors.selectedActive,
        theme.colors.selected,
      );
      const floor = contrastFloors[theme.contrast].step;
      const reversed = themeDirectionFailures(theme).filter(
        ({ ladder }) => ladder === "selectionPress",
      );
      return [
        ...(ratio < floor
          ? [`${theme.name}: step ${ratio.toFixed(3)} < ${floor}`]
          : []),
        ...reversed.map(
          ({ expected }) => `${theme.name}: expected ${expected}`,
        ),
      ];
    });
    expect(failures).toEqual([]);
  });

  it("ships the canvas veil over every palette's selection", () => {
    const drifted = shippedThemes.flatMap(({ theme }) => {
      const derived = compositeOver(veilFor(theme.mode), theme.colors.selected);
      return theme.colors.selectedActive === derived
        ? []
        : [`${theme.name}: ${theme.colors.selectedActive} !== ${derived}`];
    });
    expect(drifted).toEqual([]);
  });

  it("reports a press that does not move", () => {
    const theme = extendTheme(getTheme("light"), {
      colors: { selectedActive: getTheme("light").colors.selected },
    });
    const failures = pressStepFailures(theme);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.ratio).toBe(1);
    expect(
      themeFailures(theme).filter(({ kind }) => kind === "contrast"),
    ).toContainEqual({ ...failures[0], kind: "contrast" });
    // A collapsed step is the step pair's diagnostic, not a direction.
    expect(
      themeDirectionFailures(theme).filter(
        ({ ladder }) => ladder === "selectionPress",
      ),
    ).toEqual([]);
  });

  it("reports a press that moves away from the canvas", () => {
    const theme = extendTheme(getTheme("light"), {
      colors: { selectedActive: "#B8BDF0" },
    });
    const reversed = themeDirectionFailures(theme).filter(
      ({ ladder }) => ladder === "selectionPress",
    );
    expect(reversed).toHaveLength(1);
    expect(reversed[0]).toMatchObject({
      ladder: "selectionPress",
      from: "selected",
      to: "selectedActive",
      expected: "lighter",
    });
  });

  it("reports text the press erases", () => {
    const theme = extendTheme(getTheme("light"), {
      colors: { selectedActive: "#2E2370" },
    });
    const erased = themeContrastFailures(theme).filter(
      ({ foreground, background }) =>
        foreground === "foreground" && background === "selectedActive",
    );
    expect(erased).toHaveLength(1);
    expect(erased[0]?.pairClass).toBe("body");
  });

  it("runs the copy-and-own example, and reports a stale press", () => {
    expect(selectionPressFailures).toEqual([]);
    expect(selectionPressTheme.colors.selectedActive).toBe(
      compositeOver(
        selectionPressVeils.light,
        selectionPressTheme.colors.selected,
      ),
    );
    const stale = extendTheme(selectionPressTheme, {
      colors: { selected: selectionPressTheme.colors.selectedActive },
    });
    expect(pressStepFailures(stale)).toHaveLength(1);
  });
});
