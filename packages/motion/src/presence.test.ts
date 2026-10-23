/**
 * The one presence table both packages compose.
 *
 * The bug these guard: `@gpuixui/components` and `@gpuixui/primitives` each
 * carried their own copy of the frames, the hold-window arithmetic, the stagger
 * rule and the leaving pointer rule, and the two copies agreed only until one
 * was edited. The numbers and the policy live here now, so a package that moves
 * a surface reads the same table instead of restating it.
 */

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
  transitionWindowMs,
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

  it("arrives from the edge a panel is anchored to, and leaves back out of it", () => {
    // A right-hand drawer starts further right, so it reads as arriving from
    // outside the window; an anchored surface does the opposite and starts
    // toward its trigger.
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
    // The bug this guards: a hand-built timing is structural, so a negative
    // delay reached the sum and *shortened* the window — a 320 ms exit with a
    // -100 ms wait kept its box mounted for 220 ms, so the last 100 ms of the
    // tween painted outside a mounted surface. A negative duration did the same
    // to the whole window, and an overflowed conversion handed the timer
    // `Infinity`, which fires at once.
    expect(transitionWindowMs({ duration: 0.32, delay: -0.1 })).toBe(320);
    expect(transitionWindowMs({ duration: -0.32 })).toBe(0);
    expect(transitionWindowMs({ duration: 1e308 })).toBe(0);
    expect(transitionWindowMs({ duration: 1e305, delay: 1e305 })).toBe(0);
  });
});

describe("a staggered arrival", () => {
  it("adds the wait in seconds when the run can still travel", () => {
    const enter = presenceTiming("normal").enter;
    expect(delayedTiming(enter, 80)).toEqual({ ...enter, delay: 0.08 });
  });

  it("drops the wait with a journey the preference removed", () => {
    // The runtime waits a delay out *before* an instant assignment, so keeping
    // it would hold a reduced frame back by exactly the wait the reader removed.
    const reduced = presenceTiming("normal", "reduced").enter;
    expect(delayedTiming(reduced, 80)).toBe(reduced);
  });

  it("ignores a wait that cannot be scheduled", () => {
    const enter = presenceTiming("normal").enter;
    expect(delayedTiming(enter, -1)).toBe(enter);
    expect(delayedTiming(enter, 0)).toBe(enter);
    expect(delayedTiming(enter, Number.NaN)).toBe(enter);
    expect(delayedTiming(enter, Number.POSITIVE_INFINITY)).toBe(enter);
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
