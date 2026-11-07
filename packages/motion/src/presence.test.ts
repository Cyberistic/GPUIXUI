import { describe, expect, it } from "vitest";
import {
  delayedTiming,
  exitWindowMs,
  fadeFrom,
  fadeFromAnchor,
  fadeFromSide,
  fadeOnly,
  presenceMotion,
  presenceStyle,
  presenceTiming,
  presenceTimingOf,
  transitionWindowMs,
  type PresenceTransition,
  type PresenceTransitionInput,
} from "./presence.js";
import { motionTiming } from "./timing.js";

describe("the presence frames", () => {
  it("travels on the axis it is given and returns to rest", () => {
    expect(fadeFrom("top", 8)).toEqual({
      initial: { opacity: 0, top: 8 },
      animate: { opacity: 1, top: 0 },
      exit: { opacity: 0, top: 8 },
    });
    expect(fadeFrom("left", -4).initial).toEqual({ opacity: 0, left: -4 });
    expect(fadeOnly).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    });
  });

  it("takes the house vertical axis for an axis it does not name", () => {
    // @ts-expect-error — an axis a store wrote, not the union the builder declares.
    expect(fadeFrom("diagonal", 8)).toEqual(fadeFrom("top", 8));

    expect(fadeFrom("left", 8).initial).toEqual({ opacity: 0, left: 8 });
  });

  it("arrives from the edge a panel is anchored to, and leaves back out of it", () => {
    expect(fadeFromSide("right", 12).initial).toEqual({ opacity: 0, left: 12 });
    expect(fadeFromSide("left", 12).initial).toEqual({ opacity: 0, left: -12 });
    expect(fadeFromSide("bottom", 12).initial).toEqual({ opacity: 0, top: 12 });
    expect(fadeFromSide("top", 12).initial).toEqual({ opacity: 0, top: -12 });

    expect(fadeFromAnchor("bottom", 4).initial).toEqual({
      opacity: 0,
      top: -4,
    });
    expect(fadeFromAnchor("top", 4).initial).toEqual({ opacity: 0, top: 4 });
    expect(fadeFromAnchor("right", 4).initial).toEqual({
      opacity: 0,
      left: -4,
    });
    expect(fadeFromAnchor("left", 4).initial).toEqual({ opacity: 0, left: 4 });
  });

  it("takes the house placement for a side it does not name", () => {
    // @ts-expect-error — a side a store wrote, not the union the props declare.
    expect(fadeFromSide("top-start", 12).initial).toEqual({
      opacity: 0,
      top: 12,
    });
    // @ts-expect-error — the same stored side reaching the anchored frames.
    expect(fadeFromAnchor("top-start", 4).initial).toEqual({
      opacity: 0,
      top: -4,
    });
  });

  it("travels nowhere for a distance it cannot read", () => {
    const still = {
      initial: { opacity: 0, top: 0 },
      animate: { opacity: 1, top: 0 },
      exit: { opacity: 0, top: 0 },
    };
    expect(fadeFrom("top", Number.NaN)).toEqual(still);
    expect(fadeFrom("left", Number.POSITIVE_INFINITY)).toEqual({
      initial: { opacity: 0, left: 0 },
      animate: { opacity: 1, left: 0 },
      exit: { opacity: 0, left: 0 },
    });

    expect(fadeFromAnchor("right", Number.NaN)).toEqual({
      initial: { opacity: 0, left: 0 },
      animate: { opacity: 1, left: 0 },
      exit: { opacity: 0, left: 0 },
    });
    expect(fadeFromSide("left", Number.NaN)).toEqual({
      initial: { opacity: 0, left: 0 },
      animate: { opacity: 1, left: 0 },
      exit: { opacity: 0, left: 0 },
    });

    expect(fadeFrom("top", -8).initial).toEqual({ opacity: 0, top: -8 });
  });
});

describe("the presence timing", () => {
  it("eases in on arrival and out on departure, at the level's own duration", () => {
    expect(presenceTiming("slow")).toEqual({
      enter: motionTiming("slow", { phase: "enter" }),
      exit: motionTiming("slow", { phase: "exit" }),
    });
    expect(presenceTiming("slow").enter).toEqual({
      duration: 0.32,
      ease: "easeOut",
    });
    expect(presenceTiming("slow").exit.ease).toBe("easeIn");
  });

  it("keeps both durations at zero under the reduced preference", () => {
    const timing = presenceTiming("normal", "reduced");
    expect(timing.enter).toEqual({ duration: 0 });
    expect(timing.exit).toEqual({ duration: 0 });
  });

  it("takes the reduced policy for a preference the table does not carry", () => {
    const timing = presenceTiming("slow", "Reduced");
    expect(timing.enter).toEqual({ duration: 0 });
    expect(exitWindowMs(timing)).toBe(0);
  });
});

describe("the hold window", () => {
  it("counts the wait a delayed run sits out as part of its window", () => {
    expect(transitionWindowMs({ duration: 0.32 })).toBe(320);
    expect(transitionWindowMs({ duration: 0.32, delay: 0.1 })).toBe(420);
    expect(exitWindowMs(presenceTiming("notice"))).toBe(500);
    expect(exitWindowMs(presenceTiming("notice", "reduced"))).toBe(0);
  });

  it("reads a field it cannot measure as no time at all", () => {
    expect(transitionWindowMs({})).toBe(0);
    expect(transitionWindowMs({ duration: Number.NaN })).toBe(0);
    expect(
      transitionWindowMs({ duration: 0.2, delay: Number.POSITIVE_INFINITY }),
    ).toBe(200);
  });

  it("never subtracts a wait the run cannot sit out", () => {
    expect(transitionWindowMs({ duration: 0.32, delay: -0.1 })).toBe(320);
    expect(transitionWindowMs({ duration: -0.32 })).toBe(0);
    expect(transitionWindowMs({ duration: 1e308 })).toBe(0);
    expect(transitionWindowMs({ duration: 1e305, delay: 1e305 })).toBe(0);

    expect(transitionWindowMs({ duration: 1e17 })).toBe(0);
  });

  it("reads a window the scheduler cannot hold as no window at all", () => {
    expect(transitionWindowMs({ duration: 3e7 })).toBe(0);

    expect(transitionWindowMs({ duration: 2_147_483.647 })).toBe(2_147_483_647);
    expect(transitionWindowMs({ duration: 2_147_483.648 })).toBe(0);

    expect(transitionWindowMs({ duration: 3e7, delay: 0.1 })).toBe(0);
  });
});

describe("a staggered arrival", () => {
  it("adds the wait in seconds when the run can still travel", () => {
    const enter = presenceTiming("normal").enter;
    expect(delayedTiming(enter, 80)).toEqual({ ...enter, delay: 0.08 });
  });

  it("drops the wait with a journey the preference removed", () => {
    const reduced = presenceTiming("normal", "reduced").enter;
    expect(delayedTiming(reduced, 80)).toBe(reduced);
  });

  it("ignores a wait that cannot be scheduled", () => {
    const enter = presenceTiming("normal").enter;
    expect(delayedTiming(enter, -1)).toBe(enter);
    expect(delayedTiming(enter, 0)).toBe(enter);
    expect(delayedTiming(enter, Number.NaN)).toBe(enter);
    expect(delayedTiming(enter, Number.POSITIVE_INFINITY)).toBe(enter);
    expect(delayedTiming(enter, 1e300)).toBe(enter);
    expect(delayedTiming(enter, Number.MAX_SAFE_INTEGER)).toEqual({
      ...enter,
      delay: Number.MAX_SAFE_INTEGER / 1000,
    });
  });

  it("drops the wait with a journey the timing cannot run", () => {
    const unreadable = { duration: Number.NaN } as const;
    const absent: PresenceTransition = {};
    const notPositive = { duration: -0.2 } as const;
    const overflowed = { duration: 1e308 } as const;
    expect(delayedTiming(unreadable, 80)).toBe(unreadable);
    expect(delayedTiming(absent, 80)).toBe(absent);
    expect(delayedTiming(notPositive, 80)).toBe(notPositive);
    expect(delayedTiming(overflowed, 80)).toBe(overflowed);

    expect(delayedTiming({ duration: 0.2 }, 80)).toEqual({
      duration: 0.2,
      delay: 0.08,
    });
  });
});

describe("the motion prop", () => {
  it("picks the resting or leaving frame and its matching transition", () => {
    const timing = presenceTiming("fast");
    const frames = fadeFrom("top", 4);
    expect(presenceMotion(frames, true, timing)).toEqual({
      initial: frames.initial,
      animate: frames.animate,
      transition: timing.enter,
    });
    expect(presenceMotion(frames, false, timing)).toEqual({
      initial: frames.initial,
      animate: frames.exit,
      transition: timing.exit,
    });
  });
});

describe("a frame a caller stored", () => {
  it("drops a field the renderer refuses, not the frame beside it", () => {
    const read = presenceMotion(
      {
        initial: { opacity: 2, height: -1, top: 8, left: 4e38 },
        animate: { opacity: 1, height: 24, top: 0, left: 0 },
        exit: { opacity: 0 },
      },
      true,
      { enter: { duration: 0.2 }, exit: { duration: 0.2 } },
    );
    expect(read.initial).toEqual({ top: 8 });
    expect(read.animate).toEqual({ opacity: 1, height: 24, top: 0, left: 0 });

    expect(
      presenceMotion({ initial: { top: 3e38, opacity: 1 } }, true, {
        enter: { duration: 0.2 },
        exit: { duration: 0.2 },
      }).initial,
    ).toEqual({ top: 3e38, opacity: 1 });

    expect(fadeFrom("top", 4e38).initial).toEqual({ opacity: 0, top: 0 });
    expect(fadeFromAnchor("left", 4e38).initial).toEqual({
      opacity: 0,
      left: 0,
    });
  });
});

describe("a timing a caller stored", () => {
  it("reads a phase the value does not name as no journey", () => {
    expect(presenceTimingOf(null)).toEqual({
      enter: { duration: 0 },
      exit: { duration: 0 },
    });

    expect(presenceTimingOf({ enter: { duration: 0.32 } })).toEqual({
      enter: { duration: 0.32 },
      exit: { duration: 0 },
    });

    expect(presenceTimingOf(presenceTiming("fast"))).toEqual(
      presenceTiming("fast"),
    );
  });

  it("holds a surface that names no phase for no window, and paints it at rest", () => {
    const stored = { enter: { duration: 0.32 } };
    expect(exitWindowMs(stored)).toBe(0);
    expect(exitWindowMs(null)).toBe(0);
    expect(transitionWindowMs(null)).toBe(0);
    expect(delayedTiming(null, 80)).toEqual({});
    expect(
      presenceMotion(fadeFrom("top", 8), false, stored).transition,
    ).toEqual({ duration: 0 });
  });

  it("reads a field the renderer rejects as no journey, not a rejected description", () => {
    const unreadable: ReadonlyArray<PresenceTransitionInput> = [
      { duration: Number.NaN },
      { duration: -0.2 },
      { duration: 1e308 },
      { duration: 1e305 },
      { duration: Number.POSITIVE_INFINITY },
      // @ts-expect-error — a stored duration a config wrote as text.
      { duration: "0.2" },
    ];
    unreadable.forEach((phase) => {
      expect(presenceTimingOf({ enter: phase }).enter).toEqual({ duration: 0 });

      expect(exitWindowMs({ exit: phase })).toBe(
        transitionWindowMs(presenceTimingOf({ exit: phase }).exit),
      );
    });

    // @ts-expect-error — a stored phase the library did not type-check.
    expect(presenceTimingOf({ enter: "fast" })).toEqual({
      enter: { duration: 0 },
      exit: { duration: 0 },
    });

    expect(
      presenceTimingOf({ enter: { duration: 0.2, delay: Number.NaN } }).enter,
    ).toEqual({ duration: 0.2 });
    expect(
      presenceTimingOf({ enter: { duration: 0.2, delay: -1 } }).enter,
    ).toEqual({ duration: 0.2 });
    expect(
      presenceTimingOf({ enter: { duration: 0.2, delay: 1e308 } }).enter,
    ).toEqual({ duration: 0.2 });
    expect(
      presenceTimingOf({ enter: { duration: 0.2, ease: "easeOutBack" } }).enter,
    ).toEqual({ duration: 0.2 });

    expect(
      presenceTimingOf({ enter: { duration: 0.2, ease: [2, 0, 0, 1] } }).enter,
    ).toEqual({ duration: 0.2 });

    expect(
      presenceTimingOf({
        enter: { duration: 0.2, delay: 0.05, ease: [0.2, 0, 0.4, 1] },
      }).enter,
    ).toEqual({ duration: 0.2, delay: 0.05, ease: [0.2, 0, 0.4, 1] });
    expect(presenceTimingOf(presenceTiming("slow"))).toEqual(
      presenceTiming("slow"),
    );
  });

  it("reads a frame set a caller stored as the fields it can paint", () => {
    const timing = presenceTiming("normal");
    const stored = {
      initial: { opacity: 0, top: Number.NaN },
      animate: null,
      exit: { opacity: 0, left: Number.POSITIVE_INFINITY },
    };

    expect(presenceMotion(stored, true, timing)).toEqual({
      initial: { opacity: 0 },
      animate: {},
      transition: timing.enter,
    });
    expect(presenceMotion(stored, false, timing)).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 0 },
      transition: timing.exit,
    });

    expect(presenceMotion(null, true, timing)).toEqual({
      initial: {},
      animate: {},
      transition: timing.enter,
    });

    expect(presenceMotion(fadeFrom("top", 8), true, timing)).toEqual({
      initial: { opacity: 0, top: 8 },
      animate: { opacity: 1, top: 0 },
      transition: timing.enter,
    });
  });
});

describe("the leaving pointer rule", () => {
  it("takes no presses while a surface leaves, and blocks behind it while open", () => {
    expect(presenceStyle(true)).toEqual({ pointerEvents: "auto" });
    expect(presenceStyle(false)).toEqual({ pointerEvents: "none" });
  });

  it("paints nothing at rest for a wrapper, so it never covers its content", () => {
    expect(presenceStyle(true, "wrapper")).toEqual({});
    expect(presenceStyle(false, "wrapper")).toEqual({ pointerEvents: "none" });
  });
});
