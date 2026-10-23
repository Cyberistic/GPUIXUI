/**
 * The floating presence seam — the frames and the hold, as data.
 *
 * The bug this suite guards: `Tooltip` rendered the runtime's content with no
 * `motion` at all, so a tip appeared at rest beside every popover, menu and
 * preview card that fades. The seam is pure, so the frames, the timing and the
 * window are asserted here; the painted journey is the window's to measure.
 *
 * The seam **composes** `@gpuixui/motion/presence` rather than restating it:
 * both packages floated a surface on their own copy of the frames, the window
 * and the pointer rule, and they agreed only until one was edited. The identity
 * cases and the source scan below are what keep the second copy from returning.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  exitWindowMs as sharedExitWindowMs,
  fadeFromAnchor as sharedFadeFromAnchor,
  presenceStyle as sharedPresenceStyle,
  presenceTiming,
} from "@gpuixui/motion/presence";
import { motionLevels } from "@gpuixui/motion/timing";
import {
  exitWindowMs,
  fadeFromAnchor,
  presenceStyle,
  surfaceMotion,
  surfaceTiming,
} from "./presence.js";

const seam = readFileSync(
  fileURLToPath(new URL("./presence.ts", import.meta.url)),
  "utf8",
);

describe("the frames a floating surface travels", () => {
  it("arrives from the edge it hangs on", () => {
    // A tip below its trigger starts above its resting place and moves down, so
    // the movement points away from the edge it is anchored to. The exit frame
    // is the initial one, so a leaving tip returns the way it came.
    expect(fadeFromAnchor("top", 2)).toStrictEqual({
      initial: { opacity: 0, top: 2 },
      animate: { opacity: 1, top: 0 },
      exit: { opacity: 0, top: 2 },
    });
    expect(fadeFromAnchor("bottom", 2).initial).toStrictEqual({
      opacity: 0,
      top: -2,
    });
    expect(fadeFromAnchor("left", 2).initial).toStrictEqual({
      opacity: 0,
      left: 2,
    });
    expect(fadeFromAnchor("right", 2).initial).toStrictEqual({
      opacity: 0,
      left: -2,
    });
  });

  it("travels on one axis only", () => {
    // The runtime has no transform, so a frame names `top` or `left` and never
    // both: a surface that carried the other axis would slide across the point
    // the runtime anchored it to.
    expect(Object.hasOwn(fadeFromAnchor("top", 2).initial, "left")).toBe(false);
    expect(Object.hasOwn(fadeFromAnchor("left", 2).initial, "top")).toBe(false);
  });

  it("travels nowhere for a distance it cannot paint", () => {
    // An offset is caller arithmetic — the measured gap between a trigger and
    // the surface it opens. The runtime paints a non-finite inset as nothing, so
    // a NaN would leave the entry frame with no start offset and the travel the
    // caller asked for would silently be gone. The shared seam reads it as no
    // travel; the copy this module used to carry passed the NaN straight
    // through.
    expect(fadeFromAnchor("top", Number.NaN).initial).toStrictEqual({
      opacity: 0,
      top: 0,
    });
    expect(fadeFromAnchor("left", Number.POSITIVE_INFINITY).exit).toStrictEqual(
      { opacity: 0, left: 0 },
    );
  });
});

describe("the timing a tip moves with", () => {
  it("uses the house small-affordance level in both phases", () => {
    const timing = surfaceTiming();
    expect(timing.enter.duration).toBe(motionLevels.fast / 1000);
    expect(timing.enter.ease).toBe("easeOut");
    expect(timing.exit.ease).toBe("easeIn");
  });

  it("reads its phases from the timing package's pairing", () => {
    // The level and the phase pair are one rule. The seam asks the published
    // pairing for them, so a change to the enter/exit curves reaches the tip.
    expect(surfaceTiming()).toStrictEqual(presenceTiming("fast", "animated"));
    expect(surfaceTiming(true)).toStrictEqual(
      presenceTiming("fast", "reduced"),
    );
  });

  it("removes the journey, not the frames, under the reduced preference", () => {
    const timing = surfaceTiming(true);
    expect(timing.enter).toStrictEqual({ duration: 0 });
    expect(timing.exit).toStrictEqual({ duration: 0 });
    // The frames are still painted, so the resting appearance does not depend
    // on the preference.
    expect(
      surfaceMotion(fadeFromAnchor("top", 2), true, timing).animate,
    ).toStrictEqual({ opacity: 1, top: 0 });
  });

  it("counts the whole window a leaving tip occupies", () => {
    expect(exitWindowMs(surfaceTiming())).toBe(motionLevels.fast);
    expect(exitWindowMs(surfaceTiming(true))).toBe(0);
  });
});

describe("the frame a surface paints while it enters or leaves", () => {
  const frames = fadeFromAnchor("top", 2);
  const timing = surfaceTiming();

  it("moves toward the resting frame while present", () => {
    expect(surfaceMotion(frames, true, timing)).toStrictEqual({
      initial: frames.initial,
      animate: frames.animate,
      transition: timing.enter,
    });
  });

  it("moves toward the exit frame while leaving, with the exit curve", () => {
    expect(surfaceMotion(frames, false, timing)).toStrictEqual({
      initial: frames.initial,
      animate: frames.exit,
      transition: timing.exit,
    });
  });

  it("takes no presses while it leaves", () => {
    // The press that dismissed the tip belongs to whatever now lies underneath,
    // and the box is still mounted for its exit.
    expect(presenceStyle(true)).toStrictEqual({ pointerEvents: "auto" });
    expect(presenceStyle(false)).toStrictEqual({ pointerEvents: "none" });
  });
});

describe("the one table both packages float a surface on", () => {
  it("is the motion package's rule, not a second copy", () => {
    // The bug this guards: this package carried the frames, the window and the
    // pointer rule beside the components package's copy, and the two agreed only
    // until one was fixed. Each rule is the published binding itself.
    expect(fadeFromAnchor).toBe(sharedFadeFromAnchor);
    expect(exitWindowMs).toBe(sharedExitWindowMs);
    expect(presenceStyle).toBe(sharedPresenceStyle);
  });

  it("restates no frame table, window conversion or pointer rule", () => {
    // A re-export can be reverted into a local function without the identity
    // cases noticing only if the binding is replaced — and a restored copy is
    // exactly the shape this guards. The seam must reach the published module
    // and name the level through its pairing, not rebuild either.
    expect(seam).toContain('from "@gpuixui/motion/presence"');
    expect(seam).toContain('presenceTiming("fast"');
    expect(seam).not.toContain("export const fadeFromAnchor");
    expect(seam).not.toContain("export const exitWindowMs");
    expect(seam).not.toContain("export const presenceStyle");
    expect(seam).not.toContain("const milliseconds");
    expect(seam).not.toContain("const fadeFrom =");
  });
});
