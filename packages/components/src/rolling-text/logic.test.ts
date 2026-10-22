/**
 * The roll's rules, without a renderer.
 *
 * The bugs these guard: a swap that happens before the exit has run (the old and
 * the new value are never both visible, so an early swap is a jump); a clock that
 * outruns the roll and queues every value instead of landing on the newest; a
 * target that reverts mid-exit and leaves the clip empty; a reduced run that
 * still schedules a timer; and an entry that travels the wrong way, which would
 * start the new value already visible.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  initialRoll,
  requestRoll,
  rollFrames,
  rollHalves,
  settleRoll,
} from "./logic.js";

describe("requestRoll", () => {
  it("keeps the outgoing value painted while the exit runs", () => {
    const leaving = requestRoll(initialRoll("new"), "old", false);
    expect(leaving.shown).toBe("new");
    expect(leaving.phase).toBe("leaving");
    expect(leaving.pending).toEqual(Option.some("old"));
  });

  it("replaces the pending value instead of queueing a second roll", () => {
    const leaving = requestRoll(initialRoll("a"), "b", false);
    const newest = requestRoll(leaving, "c", false);
    expect(newest.phase).toBe("leaving");
    expect(newest.pending).toEqual(Option.some("c"));
    expect(settleRoll(newest).shown).toBe("c");
  });

  it("travels back when the target reverts mid-exit", () => {
    const leaving = requestRoll(initialRoll("a"), "b", false);
    const back = requestRoll(leaving, "a", false);
    expect(back.phase).toBe("entering");
    expect(back.pending).toEqual(Option.none());
    expect(settleRoll(back).shown).toBe("a");
    expect(settleRoll(back).run).toBe(back.run);
  });

  it("changes nothing for the value already on screen", () => {
    const rest = initialRoll("a");
    expect(requestRoll(rest, "a", false)).toBe(rest);
    const entering = settleRoll(requestRoll(rest, "b", false));
    expect(requestRoll(entering, "b", false)).toBe(entering);
  });

  it("starts a new exit when a value changes during the entry", () => {
    const entering = settleRoll(requestRoll(initialRoll("a"), "b", false));
    const leaving = requestRoll(entering, "c", false);
    expect(leaving.phase).toBe("leaving");
    expect(leaving.shown).toBe("b");
    expect(leaving.pending).toEqual(Option.some("c"));
  });

  it("paints the new value at once under the reduced preference", () => {
    const rest = initialRoll("a");
    const jumped = requestRoll(rest, "b", true);
    expect(jumped).toMatchObject({ shown: "b", phase: "rest", run: 1 });
    expect(requestRoll(jumped, "b", true)).toBe(jumped);
  });
});

describe("settleRoll", () => {
  it("swaps in the pending value as a new host", () => {
    const leaving = requestRoll(initialRoll("a"), "b", false);
    const entering = settleRoll(leaving);
    expect(entering).toMatchObject({ shown: "b", phase: "entering", run: 1 });
    expect(entering.pending).toEqual(Option.none());
  });

  it("settles nothing outside the leaving half", () => {
    const rest = initialRoll("a");
    expect(settleRoll(rest)).toBe(rest);
  });
});

describe("rollFrames", () => {
  it("enters from below and leaves above when rolling up", () => {
    const frames = rollFrames("up", 20);
    expect(frames.enterFrom).toEqual({ opacity: 0, top: 20 });
    expect(frames.exitTo).toEqual({ opacity: 0, top: -20 });
    expect(frames.rest).toEqual({ opacity: 1, top: 0 });
  });

  it("reverses both edges when rolling down", () => {
    const frames = rollFrames("down", 20);
    expect(frames.enterFrom).toEqual({ opacity: 0, top: -20 });
    expect(frames.exitTo).toEqual({ opacity: 0, top: 20 });
  });

  it("treats a broken distance as no travel rather than as NaN", () => {
    expect(rollFrames("up", Number.NaN).enterFrom).toEqual({
      opacity: 0,
      top: 0,
    });
    expect(rollFrames("up", -8).exitTo).toEqual({ opacity: 0, top: 0 });
  });
});

describe("rollHalves", () => {
  it("splits a level across both halves", () => {
    const normal = rollHalves("normal", "animated");
    expect(normal.exit).toEqual({ duration: 0.1, ease: "easeIn" });
    expect(normal.enter).toEqual({ duration: 0.1, ease: "easeOut" });
    expect(normal.swapMs).toBe(100);
  });

  it("reads the level the caller named", () => {
    expect(rollHalves("step", "animated").swapMs).toBe(60);
  });

  it("swaps at once under the reduced preference", () => {
    const reduced = rollHalves("normal", "reduced");
    expect(reduced.exit).toEqual({ duration: 0 });
    expect(reduced.enter).toEqual({ duration: 0 });
    expect(reduced.swapMs).toBe(0);
  });
});
