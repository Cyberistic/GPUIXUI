/**
 * Guards the generic pointer ladder's step floor.
 *
 * The bug this suite exists for: a ghost or outline control paints no fill at
 * rest, the `hover` wash under the pointer and the `active` wash while pressed,
 * and the shipped secondary control still paints that pair while it migrates to
 * the designed family. Every wash was measured only against a *surface*
 * (`stateFillSurfacePairs`), so a theme whose `active` equalled `hover`
 * returned `[]` from `themeContrastFailures` while the press painted no visible
 * change — the defect plan 342 fixed for the filled families, one ladder over.
 * `washStepPairs` publishes the step.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastRatio,
  themeContrastFailures,
  washStepPairs,
} from "./contrast.js";
import { quietPressFailures, quietPressTheme } from "./contrast.example.js";
import {
  extendTheme,
  getTheme,
  type Theme,
  type ThemeContrast,
} from "./theme.js";

const themes: ReadonlyArray<Theme> = shippedThemes.map(({ theme }) => theme);

const pressFailures = (theme: Theme) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background, pairClass }) =>
      pairClass === "step" && foreground === "active" && background === "hover",
  );

const collapsePress = (contrast: ThemeContrast): Theme => {
  const theme = getTheme("light", contrast);
  return extendTheme(theme, { colors: { active: theme.colors.hover } });
};

describe("generic wash steps", () => {
  it("holds every shipped theme's press to a perceivable step", () => {
    expect(themes).toHaveLength(24);
    themes.forEach((theme) => {
      expect(
        contrastRatio(theme.colors.hover, theme.colors.active),
        theme.name,
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].step);
      expect(pressFailures(theme), theme.name).toEqual([]);
    });
  });

  it("measures the tightest shipped ladder rather than assuming it", () => {
    const [tightest] = shippedThemes
      .map(({ theme }) => ({
        name: theme.name,
        ratio: contrastRatio(theme.colors.hover, theme.colors.active),
      }))
      .toSorted((left, right) => left.ratio - right.ratio);
    expect(tightest?.name).toBe("Light · Windows 7");
    expect(tightest?.ratio.toFixed(3)).toBe("1.071");
  });

  it("exports one pair, on the generic washes", () => {
    expect(washStepPairs).toEqual([["active", "hover", "step"]]);
  });

  it("reports a press that is the hover it follows", () => {
    const collapsed = extendTheme(getTheme("dark"), {
      colors: { active: getTheme("dark").colors.hover },
    });

    expect(pressFailures(collapsed)).toEqual([
      {
        foreground: "active",
        background: "hover",
        pairClass: "step",
        floor: contrastFloors.default.step,
        ratio: 1,
      },
    ]);
  });

  it("keeps the step floor level-independent at AAA", () => {
    expect(pressFailures(collapsePress("high"))).toEqual([
      {
        foreground: "active",
        background: "hover",
        pairClass: "step",
        floor: contrastFloors.high.step,
        ratio: 1,
      },
    ]);
    expect(contrastFloors.high.step).toBe(contrastFloors.default.step);
  });

  it("runs the documented example", () => {
    expect(quietPressTheme.colors.active).toBe(quietPressTheme.colors.hover);
    expect(quietPressFailures).toEqual([
      {
        foreground: "active",
        background: "hover",
        pairClass: "step",
        floor: contrastFloors.default.step,
        ratio: 1,
      },
      {
        foreground: "active",
        background: "accent",
        pairClass: "step",
        floor: contrastFloors.default.step,
        ratio: 1.0003993326538831,
      },
    ]);
  });
});
