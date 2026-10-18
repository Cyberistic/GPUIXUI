/**
 * Bug guarded: `PlatformStyleStructure.motion` was
 * `Partial<Omit<Motion, "ease">>`, so a copied platform style could own its
 * timings but not its curves, while `extendTheme` merged them phase by phase.
 * The copy-and-own file the reference teaches is a `PlatformStyle`, so a
 * platform's easing could not be expressed there at all — naming one failed
 * `check-types` even though `platformOverrides` already forwards
 * `structure.motion` to the same merge (plan 559).
 */

import { describe, expect, it } from "vitest";
import { contosoDensityPlatformStyle } from "./platform-extension.example.js";
import { themeMetricFailures } from "./metrics.js";
import { motion, type MotionOverrides } from "./motion.js";
import type { PlatformStyle } from "./platform-types.js";
import { platformStyles } from "./platforms.js";
import { themeFailures } from "./theme-check.js";
import {
  applyPlatformStyle,
  getTheme,
  type Theme,
  type ThemeMode,
} from "./theme.js";

const styleWith = (structure: PlatformStyle["structure"]): PlatformStyle => ({
  types: { label: "Eased", sans: ".SystemUIFont", mono: "Menlo" },
  structure,
  colors: { light: {}, dark: {} },
  elevation: { light: {}, dark: {} },
});

const easing: MotionOverrides = {
  fast: 150,
  ease: { enter: [0.2, 0, 0, 1] },
};

const eased = styleWith({ motion: easing });

const resolved = (theme: Theme) => theme.motion;

describe("a platform style's motion", () => {
  it("applies the timings and easings the style names", () => {
    const base = getTheme("dark");
    const themed = applyPlatformStyle(base, eased);

    expect(resolved(themed).fast).toBe(150);
    expect(resolved(themed).ease.enter).toEqual([0.2, 0, 0, 1]);
    expect(resolved(themed).ease.standard).toBe(base.motion.ease.standard);
    expect(resolved(themed).ease.exit).toBe(base.motion.ease.exit);
    expect(resolved(themed).ease.linear).toBe(base.motion.ease.linear);
    expect(resolved(themed).normal).toBe(base.motion.normal);
    expect(resolved(themed)).not.toEqual(resolved(base));
  });

  it("inherits every easing a style omits", () => {
    const base = getTheme("light");
    const themed = applyPlatformStyle(
      base,
      styleWith({ motion: { normal: 240 } }),
    );

    expect(resolved(themed).normal).toBe(240);
    expect(resolved(themed).ease).toEqual(base.motion.ease);
    expect(resolved(themed).fast).toBe(base.motion.fast);
    expect(resolved(themed).step).toBe(base.motion.step);
  });

  it("holds a copied style's curve to the runtime's contract", () => {
    const themed = applyPlatformStyle(
      getTheme("light"),
      styleWith({ motion: { ease: { enter: [2, 0, 0, 1] } } }),
    );

    expect(themeMetricFailures(themed)).toEqual([
      {
        group: "motion",
        member: "ease.enter[0]",
        rule: "within",
        actual: 2,
        bound: 1,
      },
    ]);
  });

  it("moves no shipped style's easings", () => {
    (["light", "dark"] as const).forEach((mode: ThemeMode) => {
      const base = getTheme(mode);
      Object.entries(platformStyles).forEach(([name, style]) => {
        const themed = applyPlatformStyle(base, style);
        expect(themed.motion.ease, `${mode} ${name}`).toEqual(base.motion.ease);
        expect(themeFailures(themed), `${mode} ${name}`).toEqual([]);
      });
    });
  });

  it("executes the copied example's motion", () => {
    (["light", "dark"] as const).forEach((mode) => {
      const themed = applyPlatformStyle(
        getTheme(mode),
        contosoDensityPlatformStyle,
      );

      expect(themed.motion.fast, mode).toBe(150);
      expect(themed.motion.ease.enter, mode).toEqual([0.2, 0, 0, 1]);
      expect(themed.motion.ease.standard, mode).toBe(motion.ease.standard);
      expect(themeFailures(themed), mode).toEqual([]);
    });
  });
});
