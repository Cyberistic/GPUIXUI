/**
 * Guards the filled families' step floor in the public contrast contract.
 *
 * The bug this suite exists for: `filled-states.test.ts` proved every shipped
 * family steps `x` → `xHover` → `xActive` by at least 1.05:1, but that rule
 * lived in a test that iterates the *shipped* themes. A consumer theme whose
 * `primaryHover` equalled `primary` returned `[]` from `themeContrastFailures`
 * while its primary button had no hover, because `stateFillSurfacePairs` measures
 * each fill against the surfaces behind it and a fill equal to the fill before
 * it still clears every surface pair. `stateStepPairs` publishes the step.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { filledControlFamilies } from "./styles.js";
import {
  contrastFloors,
  stateStepPairs,
  themeContrastFailures,
} from "./contrast.js";
import { extendTheme, getTheme, type Theme } from "./theme.js";

const themes: ReadonlyArray<Theme> = shippedThemes.map(({ theme }) => theme);

const stepFailures = (theme: Theme) =>
  themeContrastFailures(theme).filter(({ pairClass }) => pairClass === "step");

describe("filled state steps", () => {
  it("holds every shipped theme to a perceivable step", () => {
    themes.forEach((theme) => {
      expect(stepFailures(theme), theme.name).toEqual([]);
    });
  });

  it("exports one pair per family step", () => {
    expect(stateStepPairs).toHaveLength(filledControlFamilies.length * 2);
  });

  it("reports a hover that is the fill it follows", () => {
    const light = getTheme("light");
    const collapsed = extendTheme(light, {
      colors: { primaryHover: light.colors.primary },
    });

    expect(stepFailures(collapsed)).toEqual([
      {
        foreground: "primaryHover",
        background: "primary",
        pairClass: "step",
        floor: contrastFloors.default.step,
        ratio: 1,
      },
    ]);
  });

  it("reports a press that is the hover it follows", () => {
    const dark = getTheme("dark");
    const collapsed = extendTheme(dark, {
      colors: { secondaryActive: dark.colors.secondaryHover },
    });

    expect(stepFailures(collapsed)).toEqual([
      {
        foreground: "secondaryActive",
        background: "secondaryHover",
        pairClass: "step",
        floor: contrastFloors.default.step,
        ratio: 1,
      },
    ]);
  });

  it("keeps the step floor level-independent at AAA", () => {
    const high = getTheme("light", "high");
    const collapsed = extendTheme(high, {
      colors: { accentActive: high.colors.accentHover },
    });

    expect(stepFailures(collapsed)).toEqual([
      {
        foreground: "accentActive",
        background: "accentHover",
        pairClass: "step",
        floor: contrastFloors.high.step,
        ratio: 1,
      },
    ]);
    expect(contrastFloors.high.step).toBe(contrastFloors.default.step);
  });
});
