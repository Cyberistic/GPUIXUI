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
    // An axis is a builder argument, but a caller can also hand it a name it
    // restored from UI state. The branching used to end in an `else`, so a name
    // the package does not carry travelled on `left`: a surface that asked for a
    // vertical arrival moved sideways while every frame stayed paintable.
    // @ts-expect-error — an axis a store wrote, not the union the builder declares.
    expect(fadeFrom("diagonal", 8)).toEqual(fadeFrom("top", 8));
    // The readable horizontal axis still travels horizontally.
    expect(fadeFrom("left", 8).initial).toEqual({ opacity: 0, left: 8 });
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

  it("takes the house placement for a side it does not name", () => {
    // A side also arrives from persisted state and from a measured placement,
    // so the union the props declare is not a runtime guarantee. The branching
    // used to end in an `else`, which meant a name the package does not carry
    // travelled as `right`: a drawer meant for the top arrived from the side.
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
    // The bug this guards: the offset is caller arithmetic too — the measured
    // gap a surface opens by — and a failed measurement is not a frame. The
    // runtime paints a non-finite inset as nothing, so `NaN` reached the entry
    // and the exit carrying no start offset at all: the travel the caller asked
    // for was silently gone, from a table whose other inputs (the side, the
    // duration, the wait) are all repaired.
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
    // Every entry point reads it through the same rule.
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
    // A negative offset is a direction, not an unusable number.
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
    // A consumer painting its own surface builds its timing here rather than
    // through the provider, and the preference it hands over can be the stored
    // one. The reduced policy is the fail-safe answer: the journey is the part
    // that can hurt the reader who asked for less.
    // @ts-expect-error — a stored preference the library did not type-check.
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
    // The clock, not only the arithmetic: a duration past the range the
    // renderer schedules is a transition it refuses whole, so a leaving box
    // holds no window for it rather than one no timer can take.
    expect(transitionWindowMs({ duration: 1e17 })).toBe(0);
  });

  it("reads a window the scheduler cannot hold as no window at all", () => {
    // The bug this guards: the sum was only checked for *finite*, and the
    // renderer's clock is wider than a host timer's. Thirty million seconds is
    // 30 000 000 000 ms — a duration the renderer schedules, so the seam kept
    // the box for it and handed `setTimeout` a delay Node clamps to `1`
    // (measured on this box: a 3 000 000 000 ms timer fires after 7 ms), so a
    // leaving surface unmounted in the frame it began to leave and its exit
    // tween painted outside a mounted box.
    expect(transitionWindowMs({ duration: 3e7 })).toBe(0);
    // The bound itself is the longest delay a timer holds.
    expect(transitionWindowMs({ duration: 2_147_483.647 })).toBe(2_147_483_647);
    expect(transitionWindowMs({ duration: 2_147_483.648 })).toBe(0);
    // A wait beside a readable duration is measured the same way.
    expect(transitionWindowMs({ duration: 3e7, delay: 0.1 })).toBe(0);
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
    // The bug this guards: a stagger's pace is caller arithmetic, so a finite
    // wait can still be one no clock can sit out — `1e300` ms converts to
    // `1e297` seconds, which the renderer refuses (`Duration::try_from_secs_f64`
    // overflows), and a refused description paints **no** frame at all rather
    // than a late one. A wait past the schedulable range is therefore no wait.
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
    // The bug this guards: the delay was dropped only for a duration of exactly
    // zero, so every other no-journey timing kept it. `PresenceTransition` is
    // exported and structural, so a timing built by hand or decoded from storage
    // arrives with an absent, unreadable or negative duration — and the runtime
    // waits the delay out *before* the instant assignment, holding the surface
    // at its first frame for exactly the wait the run never needed.
    const unreadable = { duration: Number.NaN } as const;
    const absent: PresenceTransition = {};
    const notPositive = { duration: -0.2 } as const;
    const overflowed = { duration: 1e308 } as const;
    expect(delayedTiming(unreadable, 80)).toBe(unreadable);
    expect(delayedTiming(absent, 80)).toBe(absent);
    expect(delayedTiming(notPositive, 80)).toBe(notPositive);
    expect(delayedTiming(overflowed, 80)).toBe(overflowed);
    // A readable run keeps its wait, so the rule cannot pass by dropping every
    // delay.
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
    // The bug this guards: the renderer validates the whole motion description
    // and paints no frame for one it refuses (`validate_style`: every inset fits
    // a 32-bit float, a size is non-negative, `opacity` is `0..1`). The seam
    // dropped only non-finite fields, so one stored out-of-range value beside a
    // readable one lost the readable one's travel too — measured in a window, the
    // surface asked for 8px and moved 0.
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
    // A value just inside the bound is a frame, not an overflow: the repair
    // drops what the renderer refuses rather than everything that is large.
    expect(
      presenceMotion({ initial: { top: 3e38, opacity: 1 } }, true, {
        enter: { duration: 0.2 },
        exit: { duration: 0.2 },
      }).initial,
    ).toEqual({ top: 3e38, opacity: 1 });
    // A distance the renderer refuses is no travel, so a builder still publishes
    // a description it accepts instead of one that paints nothing.
    expect(fadeFrom("top", 4e38).initial).toEqual({ opacity: 0, top: 0 });
    expect(fadeFromAnchor("left", 4e38).initial).toEqual({
      opacity: 0,
      left: 0,
    });
  });
});

describe("a timing a caller stored", () => {
  it("reads a phase the value does not name as no journey", () => {
    // The bug this guards: a missing phase was handed over as `{}`, which the
    // renderer reads as **its own** 300 ms `easeOut` default — so a surface
    // whose config never decoded ran a journey the seam's window had already
    // counted as zero. "No transition" is the instant assignment
    // `transitionWindowMs` means by it, and it has to be said explicitly.
    expect(presenceTimingOf(null)).toEqual({
      enter: { duration: 0 },
      exit: { duration: 0 },
    });
    // A config that decoded with one phase is the shape the input type takes, so
    // the call needs no assertion to reach the reader.
    expect(presenceTimingOf({ enter: { duration: 0.32 } })).toEqual({
      enter: { duration: 0.32 },
      exit: { duration: 0 },
    });
    // A complete pair keeps the transitions it was given.
    expect(presenceTimingOf(presenceTiming("fast"))).toEqual(
      presenceTiming("fast"),
    );
  });

  it("holds a surface that names no phase for no window, and paints it at rest", () => {
    // A config that did not decode carries no object at all, and the reader's
    // signature takes it as it arrives — the call needs no assertion, which is
    // the point of reading a stored value at the boundary.
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
    // The bug this guards: the renderer validates a whole motion description and
    // paints **no frame** for one it rejects, while the seam's window counted the
    // same field as zero — so a stored duration it cannot read (`NaN`, negative,
    // past the clock, written as text) left a surface with no motion at all: an
    // entering one appeared without its fade, and a leaving one kept its resting
    // look for the exit window. A wait or an easing name a release dropped had
    // the same effect, because the renderer rejects the description whole.
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
      // The window and the painted transition are the same run.
      expect(exitWindowMs({ exit: phase })).toBe(
        transitionWindowMs(presenceTimingOf({ exit: phase }).exit),
      );
    });
    // A phase that is not an object at all is the same absence.
    // @ts-expect-error — a stored phase the library did not type-check.
    expect(presenceTimingOf({ enter: "fast" })).toEqual({
      enter: { duration: 0 },
      exit: { duration: 0 },
    });

    // A wait or an easing the renderer cannot read is dropped, the journey kept.
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
      // @ts-expect-error — a stored easing name a release dropped.
      presenceTimingOf({ enter: { duration: 0.2, ease: "easeOutBack" } }).enter,
    ).toEqual({ duration: 0.2 });
    // A control pair the renderer refuses (`x` outside [0, 1]) is no easing.
    expect(
      presenceTimingOf({ enter: { duration: 0.2, ease: [2, 0, 0, 1] } }).enter,
    ).toEqual({ duration: 0.2 });

    // A runnable phase keeps every field it was given, so the rule cannot pass by
    // stripping every transition.
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
    // The bug this guards: `PresenceFrames` is exported and structural, and this
    // module is a published entry, so a frame set can arrive from a config that
    // did not decode. `presenceMotion` handed it straight to the runtime, whose
    // `animate` target is required and whose non-finite insets paint as nothing:
    // a frame a config never carried reached the host as `undefined` (the surface
    // never enters or leaves) and a failed measurement reached it as `NaN` (the
    // travel disappears). The stored shape is a type of its own, so a consumer
    // passes what its decoder answered without an assertion.
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
    // A set that did not decode at all is no frame in every phase.
    expect(presenceMotion(null, true, timing)).toEqual({
      initial: {},
      animate: {},
      transition: timing.enter,
    });
    // The readable pair keeps every field it was given.
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
