import { describe, expect, it } from "vitest";
import {
  isMotionEasing,
  isMotionEasingName,
  isMotionLevel,
  motionEasingNames,
  motionEasings,
  motionLevels,
  motionLevelOf,
  motionTiming,
  motionTimingOf,
  preferenceOf,
  reducedMotionOf,
} from "./timing.js";
import { presenceTiming } from "./presence.js";

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
    motionEasingNames.forEach((name) => {
      expect(isMotionEasing(name)).toBe(true);
    });
    expect(isMotionEasing([0.2, 0, 0.4, 1])).toBe(true);

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
  const house = { duration: 0.2, ease: "easeInOut" } as const;

  it("takes the house timing instead of painting a NaN duration", () => {
    // @ts-expect-error — a persisted level the library did not type-check.
    expect(motionTiming("elapsed")).toEqual(house);
  });

  it("keeps a reduced run instant whatever the level", () => {
    // @ts-expect-error — the same untrusted level.
    expect(motionTiming("elapsed", { preference: "reduced" })).toEqual({
      duration: 0,
    });
  });

  it("eases between two resting states for a phase it does not name", () => {
    expect(motionTiming("fast", { phase: "settle" })).toEqual({
      duration: 0.16,
      ease: motionEasings.standard,
    });
  });

  it("reads a phase from the table's own keys, not the ones it inherits", () => {
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

describe("a level a store wrote", () => {
  const stored: ReadonlyArray<unknown> = [
    "elapsed",
    "Faster",
    " normal",
    "",
    42,
    null,
    undefined,
    { speed: "fast" },
    ["fast"],
    "toString",
    "__proto__",
    "constructor",
  ];

  it("names the levels the table carries, and no inherited key", () => {
    expect(Object.keys(motionLevels).filter(isMotionLevel)).toEqual([
      "step",
      "fast",
      "normal",
      "slow",
      "notice",
    ]);

    expect(isMotionLevel("slow")).toBe(true);
    stored.forEach((value) => expect(isMotionLevel(value)).toBe(false));
  });

  it("reads it as the house surface arrival instead of a NaN duration", () => {
    stored.forEach((value) => {
      expect(motionLevelOf(value)).toBe("normal");

      expect(motionTiming(motionLevelOf(value))).toEqual(
        motionTiming("normal"),
      );
      expect(presenceTiming(motionLevelOf(value))).toEqual(
        presenceTiming("normal"),
      );
    });

    expect(motionLevelOf("slow")).toBe("slow");
    expect(motionTiming(motionLevelOf("slow"))).toEqual({
      duration: 0.32,
      ease: "easeInOut",
    });
  });

  it("keeps the reduced preference's read of it", () => {
    expect(
      motionTiming(motionLevelOf("elapsed"), { preference: "reduced" }),
    ).toEqual({ duration: 0 });
  });
});

describe("reduced motion", () => {
  it("collapses the run to an instant assignment with no easing", () => {
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
    expect(reducedMotionOf(undefined, "reduced")).toBe(true);
    expect(reducedMotionOf(undefined, "animated")).toBe(false);
  });

  it("yields to the caller's override in both directions", () => {
    expect(reducedMotionOf(true, "animated")).toBe(true);
    expect(reducedMotionOf(false, "reduced")).toBe(false);
    expect(reducedMotionOf(false, "animated")).toBe(false);
  });
});

describe("a preference the table does not carry", () => {
  it("is the reduced policy when it is present and not a name", () => {
    const stored = ["Reduced", "true", 1, {}];
    stored.forEach((preference) => {
      expect(preferenceOf(preference)).toBe("reduced");
    });

    expect(motionTiming("normal", { preference: "Reduced" })).toEqual({
      duration: 0,
    });
    expect(motionTimingOf(220, { preference: "System" })).toEqual({
      duration: 0,
    });
  });

  it("is the same policy in reducedMotionOf, the rule a package composes", () => {
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

    expect(reducedMotionOf(false, "REDUCED")).toBe(false);
    expect(reducedMotionOf(true, "animated")).toBe(true);
  });

  it("is the house animated one when the application stored nothing", () => {
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

  it("takes the curve a surface names, and refuses one it cannot read", () => {
    const curve = [0.22, 1, 0.36, 1] as const;
    expect(motionTimingOf(260, { phase: "standard", ease: curve })).toEqual({
      duration: 0.26,
      ease: curve,
    });
    expect(motionTimingOf(260, { phase: "standard", ease: "bouncy" })).toEqual({
      duration: 0.26,
      ease: "easeInOut",
    });

    expect(motionTimingOf(260, { preference: "reduced", ease: curve })).toEqual(
      { duration: 0 },
    );
  });

  it("reads a duration it cannot run as the house surface arrival", () => {
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
    const house = { duration: 0.2, ease: "easeInOut" } as const;
    expect(motionTimingOf(1e300)).toEqual(house);
    expect(motionTimingOf(1e19)).toEqual(house);

    expect(motionTimingOf(1e12)).toEqual({ duration: 1e9, ease: "easeInOut" });
  });

  it("reads an options object the caller does not have as the house timing", () => {
    const house = { duration: 0.2, ease: "easeInOut" } as const;
    expect(motionTimingOf(200, null)).toEqual(house);
    expect(motionTiming("normal", null)).toEqual(house);
    expect(motionTimingOf(200, undefined)).toEqual(house);

    expect(motionTimingOf(200, { phase: null })).toEqual(house);
    expect(motionTimingOf(200, { preference: null })).toEqual(house);
  });
});
