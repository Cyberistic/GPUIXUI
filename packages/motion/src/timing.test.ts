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
  isMotionEasing,
  isMotionEasingName,
  motionEasingNames,
  motionEasings,
  motionLevels,
  motionTiming,
  motionTimingOf,
  preferenceOf,
  reducedMotionOf,
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
    Object.values(motionEasings).forEach((ease) => {
      expect(isMotionEasing(ease)).toBe(true);
    });
  });

  it("reads the renderer's easing grammar, not a list of its own", () => {
    // The bug this guards: the grammar is the renderer's — five names, or a
    // cubic-bezier with finite values whose two `x` controls lie in `[0, 1]` —
    // and the renderer rejects the **whole** motion description for an easing it
    // cannot read, which paints no frame at all. A stored timing therefore has
    // to be read through this before it is handed over, and a name the package
    // does not ship must not pass a lookup that reads inherited keys.
    motionEasingNames.forEach((name) => {
      expect(isMotionEasing(name)).toBe(true);
    });
    expect(isMotionEasing([0.2, 0, 0.4, 1])).toBe(true);
    // `y` may overshoot; only the time controls are bounded.
    expect(isMotionEasing([0.42, -0.5, 0.58, 1.5])).toBe(true);

    ["easeOutBack", "linear ", "", "toString", "__proto__"].forEach((name) => {
      expect(isMotionEasing(name)).toBe(false);
    });
    [2, -0.1].forEach((x) => {
      expect(isMotionEasing([x, 0, 0.5, 1])).toBe(false);
    });
    expect(isMotionEasing([0, 0, 0.5, Number.NaN])).toBe(false);
    expect(isMotionEasing([0, 0, 0.5])).toBe(false);
    expect(isMotionEasing(null)).toBe(false);
    expect(isMotionEasing({})).toBe(false);
  });

  it("answers a name only for the five the grammar carries", () => {
    // `motionCurve` reads a stored name through this guard to pick the curve
    // the runtime resolves it to, so membership is the list's own rather than a
    // table lookup: `toString` must not name a curve the runtime never paints.
    motionEasingNames.forEach((name) => {
      expect(isMotionEasingName(name)).toBe(true);
    });
    ["easeOutBack", "EaseOut", "", "toString", "__proto__"].forEach((name) => {
      expect(isMotionEasingName(name)).toBe(false);
    });
    expect(isMotionEasingName([0.2, 0, 0.4, 1])).toBe(false);
    expect(isMotionEasingName(null)).toBe(false);
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

describe("the preference a run resolves", () => {
  it("is the provider's when the caller states no override", () => {
    // One provider supplies the flag for the whole tree: a reader who asked for
    // less motion is answered by every hook and surface below it, not only by
    // the ones a caller remembered to pass the flag to. A tree that states
    // nothing moves (`MotionProvider`'s own default).
    expect(reducedMotionOf(undefined, "reduced")).toBe(true);
    expect(reducedMotionOf(undefined, "animated")).toBe(false);
  });

  it("yields to the caller's override in both directions", () => {
    // The option is a per-run override, not a second state of the policy: a
    // decorative run can be silenced in an animated tree, and one that must move
    // keeps moving under a reduced provider. `undefined` is the absence that
    // means "no override", so `false` has to be honoured rather than read as one.
    expect(reducedMotionOf(true, "animated")).toBe(true);
    expect(reducedMotionOf(false, "reduced")).toBe(false);
    expect(reducedMotionOf(false, "animated")).toBe(false);
  });
});

describe("a preference the table does not carry", () => {
  /**
   * The bug these guard: the preference is a **stored** choice — an application
   * reads its motion setting back from storage and hands it to `MotionProvider`
   * — and every timing read `preference === "reduced"` directly. A setting that
   * came back as a name the union never described (a renamed value, a `"true"`
   * from a checkbox column) therefore animated a reader who had asked for less
   * motion, silently, because a reduced run is the one policy this package
   * cannot leave to the caller's intent.
   */
  it("is the reduced policy when it is present and not a name", () => {
    const stored = ["Reduced", "true", 1, {}];
    stored.forEach((preference) => {
      expect(preferenceOf(preference)).toBe("reduced");
    });
    // The same rule for the entry points a surface builds its timing with.
    expect(motionTiming("normal", { preference: "Reduced" })).toEqual({
      duration: 0,
    });
    expect(motionTimingOf(220, { preference: "System" })).toEqual({
      duration: 0,
    });
  });

  it("is the same policy in reducedMotionOf, the rule a package composes", () => {
    // The bug this guards: `reducedMotionOf` is published as *the* rule a
    // package composing the timing table reuses ("so a package composing the
    // table does not re-decide what less motion means"), and it compared the
    // preference with `=== "reduced"` while `preferenceOf` — the reader every
    // timing entry point sits on — reads a value that is present and not a name
    // as the reduced policy. A package that handed it its own decoded settings
    // row therefore animated a reader whose stored preference this release no
    // longer names: the two readers disagreed about the same value, on the one
    // direction the policy cannot leave to intent.
    const stored: ReadonlyArray<unknown> = [
      "Reduced",
      "REDUCED",
      "true",
      1,
      {},
      "reduced",
      "animated",
      null,
      undefined,
    ];
    stored.forEach((preference) => {
      expect(reducedMotionOf(undefined, preference)).toBe(
        preferenceOf(preference) === "reduced",
      );
    });
    // The two names above are also the only ones a caller's override yields to.
    expect(reducedMotionOf(false, "REDUCED")).toBe(false);
    expect(reducedMotionOf(true, "animated")).toBe(true);
  });

  it("is the house animated one when the application stored nothing", () => {
    // Absence is not the failure above: a nullish value is what a config that
    // never carried the setting decodes to, and a tree that states no
    // preference has always moved. The two names are their own answers.
    [null, undefined].forEach((preference) => {
      expect(preferenceOf(preference)).toBe("animated");
    });
    expect(preferenceOf("reduced")).toBe("reduced");
    expect(preferenceOf("animated")).toBe("animated");
    expect(motionTiming("normal")).toEqual({
      duration: 0.2,
      ease: "easeInOut",
    });
  });
});

describe("motionTimingOf", () => {
  it("names a duration outside the shared levels, with the phase easing", () => {
    // A toast enters at 220 ms and leaves at 180 ms: durations the level table
    // does not carry, so the surface builds its timing from here instead of
    // borrowing a level that would change the feel of every other surface.
    expect(motionTimingOf(220, { phase: "enter" })).toEqual({
      duration: 0.22,
      ease: "easeOut",
    });
    expect(motionTimingOf(180, { phase: "exit" })).toEqual({
      duration: 0.18,
      ease: "easeIn",
    });
  });

  it("collapses to an instant assignment under the reduced preference", () => {
    expect(motionTimingOf(220, { preference: "reduced" })).toEqual({
      duration: 0,
    });
  });

  it("reads a duration it cannot run as the house surface arrival", () => {
    // The same fallback `motionTiming` applies to an unknown level: a NaN or a
    // zero must not hand the runtime a NaN or an instant tween the caller did
    // not ask for.
    expect(motionTimingOf(Number.NaN)).toEqual({
      duration: 0.2,
      ease: "easeInOut",
    });
    expect(motionTimingOf(0)).toEqual({
      duration: 0.2,
      ease: "easeInOut",
    });
  });

  it("reads a duration past the clock the renderer schedules as the house arrival", () => {
    // The bug this guards: the binding converts a transition's seconds into a
    // `Duration` and rejects the **whole** description for a value it cannot
    // represent (`@gpuix/native@0.11.0`, `packages/native/src/motion.rs`'s
    // `validate_seconds`), and its own suite pins `duration: 1e300` as refused.
    // A refused description paints no frame at all, so a surface built from a
    // stored duration above the clock's range appeared without its fade and
    // left without its travel. `motionTimingOf` read only finiteness and sign;
    // `presenceTimingOf` already reads the same field as no journey.
    const house = { duration: 0.2, ease: "easeInOut" } as const;
    expect(motionTimingOf(1e300)).toEqual(house);
    expect(motionTimingOf(1e19)).toEqual(house);
    // A large duration inside the clock is kept, so the rule cannot pass by
    // discarding every value past a house level.
    expect(motionTimingOf(1e12)).toEqual({ duration: 1e9, ease: "easeInOut" });
  });

  it("reads an options object the caller does not have as the house timing", () => {
    // The bug this guards: `options` is a config as often as a literal, and a
    // settings row the store never wrote reads back as `null` (JSON has no
    // `undefined`), so `options.phase` threw out of the render that built a
    // surface's timing. An absent object is the house timing a caller who says
    // nothing gets, and an option it does not name falls back the same way.
    const house = { duration: 0.2, ease: "easeInOut" } as const;
    expect(motionTimingOf(200, null)).toEqual(house);
    expect(motionTiming("normal", null)).toEqual(house);
    expect(motionTimingOf(200, undefined)).toEqual(house);
    // A stored field is the absence too: `??` is the rule the object's own
    // defaults use, so a phase or preference a store nulled is not a crash.
    expect(motionTimingOf(200, { phase: null })).toEqual(house);
    expect(motionTimingOf(200, { preference: null })).toEqual(house);
  });
});
