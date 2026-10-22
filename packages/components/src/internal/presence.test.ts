/**
 * The motion seam's frames and mount window.
 *
 * The bugs these guard: an offset with the wrong sign (a drawer that jumps away
 * from its edge, a popover that arrives from the wrong side of its trigger); a
 * mount window with the wrong unit — `motionTiming` names seconds because the
 * runtime reads seconds, while the seam keeps a leaving box painted for
 * milliseconds, and a preference change has to collapse both to zero; and a
 * stagger that survives the reduced preference, holding a resting surface at its
 * first frame for the length of the wait. The direction of every edge is
 * asserted here because the behaviour suite can only see the surfaces it mounts.
 */

import {
  motionLevels,
  motionTiming,
  type MotionPreference,
} from "@gpuixui/motion/timing";
import { describe, expect, it } from "vitest";
import {
  delayedTiming,
  exitWindowMs,
  fadeFrom,
  fadeFromAnchor,
  fadeFromSide,
  fadeOnly,
  transitionWindowMs,
  type SurfaceTiming,
} from "./presence.js";

/** The timing a surface at `level` moves with, as the hook builds it. */
const timing = (
  level: keyof typeof motionLevels,
  preference?: MotionPreference,
): SurfaceTiming => ({
  enter: motionTiming(level, { phase: "enter", preference }),
  exit: motionTiming(level, { phase: "exit", preference }),
});

describe("the frames", () => {
  it("starts a top edge above its resting place and returns to it", () => {
    expect(fadeFrom("top", 8)).toEqual({
      initial: { opacity: 0, top: 8 },
      animate: { opacity: 1, top: 0 },
      exit: { opacity: 0, top: 8 },
    });
  });

  it("mirrors the same rule on the horizontal axis", () => {
    expect(fadeFrom("left", -4)).toEqual({
      initial: { opacity: 0, left: -4 },
      animate: { opacity: 1, left: 0 },
      exit: { opacity: 0, left: -4 },
    });
  });

  it("arrives from outside the window edge a panel is anchored to", () => {
    // A right-edge drawer rests at the edge and starts further right; a
    // top-edge panel starts higher. The other two mirror them.
    expect(fadeFromSide("right", 12).initial).toEqual({ opacity: 0, left: 12 });
    expect(fadeFromSide("left", 12).initial).toEqual({ opacity: 0, left: -12 });
    expect(fadeFromSide("bottom", 12).initial).toEqual({ opacity: 0, top: 12 });
    expect(fadeFromSide("top", 12).initial).toEqual({ opacity: 0, top: -12 });
  });

  it("arrives from the side of the trigger it is anchored to", () => {
    // A surface below its trigger starts above its resting place and moves
    // down; one above starts below; the sides mirror the same rule.
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

  it("dims a scrim without moving it", () => {
    // A veil has no edge: it fades, so it must carry no geometry at all.
    expect(fadeOnly).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    });
  });
});

describe("the mount window", () => {
  it("converts the runtime's seconds to whole milliseconds", () => {
    expect(exitWindowMs(timing("notice"))).toBe(motionLevels.notice);
    expect(exitWindowMs(timing("normal"))).toBe(motionLevels.normal);
  });

  it("collapses to nothing under the reduced preference", () => {
    // The seam reads the preference per render, so this is the value that makes
    // a leaving surface unmount in the frame it closes.
    expect(exitWindowMs(timing("slow", "reduced"))).toBe(0);
  });

  it("treats a timing with no duration as an instant assignment", () => {
    expect(exitWindowMs({ enter: { duration: 0 }, exit: {} })).toBe(0);
  });

  it("times any run by the transition it paints, not by the level's number", () => {
    // The feedback layers (a ripple, a sheen, a flood) keep a layer mounted for
    // the length of an *enter* journey, and the timing they paint is where the
    // preference reaches the window: the level table alone cannot rescale.
    expect(transitionWindowMs(timing("normal").enter)).toBe(
      motionLevels.normal,
    );
    expect(transitionWindowMs(timing("notice").enter)).toBe(
      motionLevels.notice,
    );
    expect(transitionWindowMs(timing("notice", "reduced").enter)).toBe(0);
    expect(transitionWindowMs({})).toBe(0);
  });
});

describe("a staggered run", () => {
  it("hands the delay to the runtime in the seconds it reads", () => {
    // The runtime's `delay` is seconds like `duration`; milliseconds here would
    // make a reveal wait a thousand times too long.
    expect(delayedTiming(timing("normal").enter, 80)).toEqual({
      duration: 0.2,
      ease: "easeOut",
      delay: 0.08,
    });
  });

  it("drops the delay with the journey under the reduced preference", () => {
    // The runtime waits a delay out *before* an instant assignment, so a kept
    // delay holds a reduced surface at its first frame for the whole stagger —
    // measured on `Reveal` (`behaviour/reveal.test.tsx`).
    expect(delayedTiming(timing("normal", "reduced").enter, 80)).toEqual({
      duration: 0,
    });
  });

  it("adds nothing for a delay it cannot schedule, and keeps the timing", () => {
    const enter = timing("fast").enter;
    [-10, Number.NaN, Number.POSITIVE_INFINITY, 0].forEach((delay) => {
      expect(delayedTiming(enter, delay)).toBe(enter);
    });
  });
});
