/**
 * The rules every text swap shares, without a renderer.
 *
 * The bugs these guard: a swap that happens before the exit has run (a jump
 * instead of a journey); a clock that outruns the swap and queues every value
 * instead of landing on the newest; a target that reverts mid-exit and leaves
 * the clip empty; a reduced run that still schedules a timer; an entry that
 * travels the wrong way, or one whose distance reaches the runtime as `null`; and
 * a level whose halves do not add up to the level the caller named.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  initialSwap,
  requestSwap,
  restSwap,
  settleSwap,
  swapFrames,
  swapHalves,
} from "./text-swap.js";

describe("requestSwap", () => {
  it("keeps the outgoing value painted while the exit runs", () => {
    const leaving = requestSwap(initialSwap("new"), "old", false);
    expect(leaving.shown).toBe("new");
    expect(leaving.phase).toBe("leaving");
    expect(leaving.pending).toEqual(Option.some("old"));
  });

  it("replaces the pending value instead of queueing a second swap", () => {
    const leaving = requestSwap(initialSwap("a"), "b", false);
    const newest = requestSwap(leaving, "c", false);
    expect(newest.phase).toBe("leaving");
    expect(newest.pending).toEqual(Option.some("c"));
    expect(settleSwap(newest).shown).toBe("c");
  });

  it("travels back when the target reverts mid-exit", () => {
    const leaving = requestSwap(initialSwap("a"), "b", false);
    const back = requestSwap(leaving, "a", false);
    expect(back.phase).toBe("entering");
    expect(back.pending).toEqual(Option.none());
    expect(settleSwap(back).shown).toBe("a");
    expect(settleSwap(back).run).toBe(back.run);
  });

  it("changes nothing for the value already on screen", () => {
    const rest = initialSwap("a");
    expect(requestSwap(rest, "a", false)).toBe(rest);
    const entering = settleSwap(requestSwap(rest, "b", false));
    expect(requestSwap(entering, "b", false)).toBe(entering);
  });

  it("starts a new exit when a value changes during the entry", () => {
    const entering = settleSwap(requestSwap(initialSwap("a"), "b", false));
    const leaving = requestSwap(entering, "c", false);
    expect(leaving.phase).toBe("leaving");
    expect(leaving.shown).toBe("b");
    expect(leaving.pending).toEqual(Option.some("c"));
  });

  it("paints the new value at once under the reduced preference", () => {
    const rest = initialSwap("a");
    const jumped = requestSwap(rest, "b", true);
    expect(jumped).toMatchObject({ shown: "b", phase: "rest", run: 1 });
    expect(requestSwap(jumped, "b", true)).toBe(jumped);
  });
});

describe("settleSwap", () => {
  it("swaps in the pending value as a new host", () => {
    const leaving = requestSwap(initialSwap("a"), "b", false);
    const entering = settleSwap(leaving);
    expect(entering).toMatchObject({ shown: "b", phase: "entering", run: 1 });
    expect(entering.pending).toEqual(Option.none());
  });

  it("settles nothing outside the leaving half", () => {
    const rest = initialSwap("a");
    expect(settleSwap(rest)).toBe(rest);
  });
});

describe("restSwap", () => {
  it("lands the swap once the incoming value has arrived", () => {
    const entering = settleSwap(requestSwap(initialSwap("a"), "b", false));
    expect(entering.phase).toBe("entering");
    expect(restSwap(entering)).toMatchObject({
      shown: "b",
      phase: "rest",
      run: 1,
    });
  });

  it("leaves a phase it did not start, so a leaving value keeps its exit", () => {
    const leaving = requestSwap(initialSwap("a"), "b", false);
    expect(restSwap(leaving)).toBe(leaving);
    const rest = initialSwap("a");
    expect(restSwap(rest)).toBe(rest);
  });
});

describe("swapFrames", () => {
  it("travels the named inset from the increasing edge", () => {
    expect(swapFrames("left", 1, 200)).toEqual({
      enterFrom: { opacity: 0, left: 200 },
      rest: { opacity: 1, left: 0 },
      exitTo: { opacity: 0, left: -200 },
    });
  });

  it("reverses both edges for a travel from the decreasing edge", () => {
    expect(swapFrames("left", -1, 200)).toEqual({
      enterFrom: { opacity: 0, left: -200 },
      rest: { opacity: 1, left: 0 },
      exitTo: { opacity: 0, left: 200 },
    });
  });

  it("writes zero travel as 0, never -0", () => {
    const frames = swapFrames("left", -1, 0);
    expect(Object.is(frames.enterFrom.left, 0)).toBe(true);
    expect(Object.is(frames.exitTo.left, 0)).toBe(true);
  });

  it("treats a broken distance as no travel rather than as NaN", () => {
    expect(swapFrames("top", 1, Number.NaN).enterFrom).toEqual({
      opacity: 0,
      top: 0,
    });
    expect(swapFrames("top", 1, -8).exitTo).toEqual({ opacity: 0, top: 0 });
  });
});

describe("swapHalves", () => {
  it("splits a level across both halves", () => {
    const normal = swapHalves("normal", "animated");
    expect(normal.exit).toEqual({ duration: 0.1, ease: "easeIn" });
    expect(normal.enter).toEqual({ duration: 0.1, ease: "easeOut" });
    expect(normal.swapMs).toBe(100);
  });

  it("reads the level the caller named", () => {
    expect(swapHalves("step", "animated").swapMs).toBe(60);
  });

  it("swaps at once under the reduced preference", () => {
    const reduced = swapHalves("normal", "reduced");
    expect(reduced.exit).toEqual({ duration: 0 });
    expect(reduced.enter).toEqual({ duration: 0 });
    expect(reduced.swapMs).toBe(0);
  });
});
