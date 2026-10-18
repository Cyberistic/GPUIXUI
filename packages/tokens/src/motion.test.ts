/**
 * Guards the defect fixed in plan 019: motion timings were literals in component
 * source (`120` in Spinner/Progress, `700` in Skeleton) with no token to reach
 * for, and the runtime's `MotionTransition.duration` is in **seconds** while an
 * interval is in **milliseconds** — so a token without the conversion would run
 * a thousand times too slow.
 */

import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { panelTransition, stepInterval } from "./motion.example.js";
import { motionTransition, type MotionLevel } from "./motion.js";
import { extendTheme, lightTheme, type Theme } from "./theme.js";

const levels: ReadonlyArray<MotionLevel> = [
  "none",
  "step",
  "fast",
  "normal",
  "slow",
  "pulse",
];

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

describe("motion levels", () => {
  it("are whole milliseconds", () => {
    themes.forEach(([label, theme]) => {
      levels.forEach((level) => {
        expect(Number.isInteger(theme.motion[level]), `${label} ${level}`).toBe(
          true,
        );
        expect(theme.motion[level], `${label} ${level}`).toBeGreaterThanOrEqual(
          0,
        );
      });
    });
  });

  it("starts at zero for a theme without motion, and rises in order", () => {
    expect(lightTheme.motion.none).toBe(0);
    expect(lightTheme.motion.step).toBeLessThan(lightTheme.motion.fast);
    expect(lightTheme.motion.fast).toBeLessThan(lightTheme.motion.normal);
    expect(lightTheme.motion.normal).toBeLessThan(lightTheme.motion.slow);
    expect(lightTheme.motion.slow).toBeLessThan(lightTheme.motion.pulse);
  });

  it("carries every level on every shipped theme", () => {
    themes.forEach(([label, theme]) => {
      expect(Object.keys(theme.motion), label).toEqual([...levels, "ease"]);
    });
  });
});

describe("motionTransition", () => {
  it("converts the token's milliseconds to the runtime's seconds", () => {
    expect(motionTransition(lightTheme, "step").duration).toBe(0.12);
    expect(motionTransition(lightTheme, "normal").duration).toBe(0.2);
    expect(motionTransition(lightTheme, "pulse").duration).toBe(0.7);
    expect(motionTransition(lightTheme, "none").duration).toBe(0);
  });

  it("defaults to the standard easing", () => {
    expect(motionTransition(lightTheme, "normal").ease).toBe(
      lightTheme.motion.ease.standard,
    );
    expect(motionTransition(lightTheme, "normal", "standard").ease).toBe(
      "easeInOut",
    );
  });

  it("names an easing per phase", () => {
    expect(motionTransition(lightTheme, "slow", "enter").ease).toBe("easeOut");
    expect(motionTransition(lightTheme, "slow", "exit").ease).toBe("easeIn");
    expect(motionTransition(lightTheme, "pulse", "linear").ease).toBe("linear");
  });

  it("follows a theme override", () => {
    const slower = extendTheme(lightTheme, { motion: { normal: 400 } });
    expect(motionTransition(slower, "normal").duration).toBe(0.4);
    expect(slower.motion.slow).toBe(lightTheme.motion.slow);
  });
});

describe("motion overrides", () => {
  it("merges one timing and keeps the others", () => {
    const custom = extendTheme(lightTheme, { motion: { normal: 180 } });
    expect(custom.motion.normal).toBe(180);
    expect(custom.motion.fast).toBe(lightTheme.motion.fast);
    expect(custom.motion.pulse).toBe(lightTheme.motion.pulse);
  });

  it("merges one easing and keeps the others", () => {
    const custom = extendTheme(lightTheme, {
      motion: { ease: { enter: "linear" } },
    });
    expect(custom.motion.ease.enter).toBe("linear");
    expect(custom.motion.ease.exit).toBe(lightTheme.motion.ease.exit);
    expect(custom.motion.ease.standard).toBe("easeInOut");
  });

  it("accepts a bezier the runtime takes verbatim", () => {
    const bezier: [number, number, number, number] = [0.4, 0, 0.2, 1];
    const custom = extendTheme(lightTheme, {
      motion: { ease: { standard: bezier } },
    });
    expect(custom.motion.ease.standard).toEqual([0.4, 0, 0.2, 1]);
    expect(motionTransition(custom, "normal").ease).toEqual([0.4, 0, 0.2, 1]);
  });

  it("lets a theme remove motion entirely", () => {
    const still = extendTheme(lightTheme, {
      motion: { step: 0, fast: 0, normal: 0, slow: 0, pulse: 0 },
    });
    expect(levels.map((level) => still.motion[level])).toEqual([
      0, 0, 0, 0, 0, 0,
    ]);
  });
});

describe("motion example", () => {
  it("takes the step interval from the token", () => {
    expect(stepInterval(lightTheme)).toBe(lightTheme.motion.step);
    expect(stepInterval(lightTheme)).toBe(120);
  });

  it("builds a panel transition the runtime accepts", () => {
    expect(panelTransition(lightTheme)).toEqual({
      duration: 0.32,
      ease: "easeOut",
    });
  });
});
