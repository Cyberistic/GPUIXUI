/**
 * The house timing contract.
 *
 * The bugs these guard: a level silently changing the feel of every surface; a
 * phase that eases the wrong way (an exit that decelerates reads as a surface
 * refusing to leave); and a reduced-motion run that still animates — the flag is
 * the only thing standing between the reader's request and a transition, since
 * the runtime exposes no preference of its own.
 */

import { describe, expect, it } from "vitest";
import {
  motionEasings,
  motionLevels,
  motionTiming,
  type MotionLevel,
} from "./timing.js";

/** A key of the level table, without asserting a `string` into one. */
const isMotionLevel = (value: string): value is MotionLevel =>
  value in motionLevels;

describe("motion levels", () => {
  it("names the durations the surfaces share, in milliseconds", () => {
    expect(motionLevels).toEqual({
      step: 120,
      fast: 160,
      normal: 200,
      slow: 320,
      notice: 500,
    });
  });

  it("converts a level to the runtime's seconds", () => {
    // The runtime reads `duration` in seconds; a level left in milliseconds
    // would make a dialog take five minutes.
    const levels = Object.keys(motionLevels).filter(isMotionLevel);
    expect(levels).toHaveLength(Object.keys(motionLevels).length);
    const converted = levels.map((level) => ({
      ms: motionLevels[level],
      duration: motionTiming(level).duration,
    }));
    expect(converted.map((entry) => entry.duration * 1000)).toEqual(
      converted.map((entry) => entry.ms),
    );
    expect(converted.map((entry) => entry.duration)).toEqual([
      0.12, 0.16, 0.2, 0.32, 0.5,
    ]);
  });

  it("keeps every level a positive duration a reader can perceive", () => {
    // A zero-length level is reduced motion's job, not a level's: a surface
    // that asks for `fast` must move.
    Object.values(motionLevels).forEach((ms) => {
      expect(ms).toBeGreaterThan(0);
      expect(Number.isInteger(ms)).toBe(true);
    });
  });
});

describe("phases", () => {
  it("eases in decelerating, out accelerating, and between two states at both ends", () => {
    expect(motionEasings).toEqual({
      enter: "easeOut",
      exit: "easeIn",
      standard: "easeInOut",
    });
    expect(motionTiming("normal", { phase: "enter" }).ease).toBe("easeOut");
    expect(motionTiming("normal", { phase: "exit" }).ease).toBe("easeIn");
    expect(motionTiming("normal").ease).toBe("easeInOut");
  });

  it("names a curve the runtime accepts for every phase", () => {
    const accepted = ["linear", "ease", "easeIn", "easeOut", "easeInOut"];
    Object.values(motionEasings).forEach((ease) => {
      expect(accepted).toContain(ease);
    });
  });
});

describe("a level or phase the table does not carry", () => {
  // The house surface arrival: the level a surface enters and leaves on.
  const house = { duration: 0.2, ease: "easeInOut" } as const;

  it("takes the house timing instead of painting a NaN duration", () => {
    // The bug this guards: the level may come from a persisted setting a
    // release no longer ships, so a key the table does not carry read
    // `undefined / 1000` — a `NaN` duration the runtime drops, leaving the
    // surface on its own default timing while the caller believes it asked for
    // `normal`.
    // @ts-expect-error — a persisted level the library did not type-check.
    expect(motionTiming("elapsed")).toEqual(house);
  });

  it("keeps a reduced run instant whatever the level", () => {
    // The fallback must not resurrect the journey the preference removes.
    // @ts-expect-error — the same untrusted level.
    expect(motionTiming("elapsed", { preference: "reduced" })).toEqual({
      duration: 0,
    });
  });

  it("eases between two resting states for a phase it does not name", () => {
    // A phase read from the same persisted setting: an absent curve reaches
    // the runtime as `ease: undefined`.
    // @ts-expect-error — a persisted phase the library did not type-check.
    expect(motionTiming("fast", { phase: "settle" })).toEqual({
      duration: 0.16,
      ease: motionEasings.standard,
    });
  });

  it("reads a phase from the table's own keys, not the ones it inherits", () => {
    // The bug this guards: `phase in motionEasings` is true for every name on
    // `Object.prototype`, so a persisted phase of `"toString"`,
    // `"constructor"` or `"hasOwnProperty"` passed the guard and the lookup
    // handed the runtime that method where a curve belongs — a function, not an
    // easing, which is exactly the absent-easing failure the fallback above
    // exists to prevent, reached through the prototype chain instead of a
    // missing key.
    const inherited = [
      "toString",
      "__proto__",
      "constructor",
      "hasOwnProperty",
    ];
    inherited.forEach((phase) => {
      // @ts-expect-error — a persisted phase the library did not type-check.
      expect(motionTiming("fast", { phase })).toEqual({
        duration: 0.16,
        ease: motionEasings.standard,
      });
    });
  });
});

describe("reduced motion", () => {
  it("collapses the run to an instant assignment with no easing", () => {
    // No easing, because a duration-zero transition with a named curve is still
    // a description of a journey the reader asked not to take.
    expect(motionTiming("slow", { preference: "reduced" })).toEqual({
      duration: 0,
    });
  });

  it("keeps an animated run on its level's own duration and easing", () => {
    expect(motionTiming("normal", { preference: "animated" })).toEqual({
      duration: 0.2,
      ease: "easeInOut",
    });
  });
});
