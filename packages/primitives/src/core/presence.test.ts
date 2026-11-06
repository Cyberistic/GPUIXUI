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
    expect(Object.hasOwn(fadeFromAnchor("top", 2).initial, "left")).toBe(false);
    expect(Object.hasOwn(fadeFromAnchor("left", 2).initial, "top")).toBe(false);
  });

  it("travels nowhere for a distance it cannot paint", () => {
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
    expect(surfaceTiming()).toStrictEqual(presenceTiming("fast", "animated"));
    expect(surfaceTiming(true)).toStrictEqual(
      presenceTiming("fast", "reduced"),
    );
  });

  it("removes the journey, not the frames, under the reduced preference", () => {
    const timing = surfaceTiming(true);
    expect(timing.enter).toStrictEqual({ duration: 0 });
    expect(timing.exit).toStrictEqual({ duration: 0 });

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
    expect(presenceStyle(true)).toStrictEqual({ pointerEvents: "auto" });
    expect(presenceStyle(false)).toStrictEqual({ pointerEvents: "none" });
  });
});

describe("the one table both packages float a surface on", () => {
  it("is the motion package's rule, not a second copy", () => {
    expect(fadeFromAnchor).toBe(sharedFadeFromAnchor);
    expect(exitWindowMs).toBe(sharedExitWindowMs);
    expect(presenceStyle).toBe(sharedPresenceStyle);
  });

  it("restates no frame table, window conversion or pointer rule", () => {
    expect(seam).toContain('from "@gpuixui/motion/presence"');
    expect(seam).toContain('presenceTiming("fast"');
    expect(seam).not.toContain("export const fadeFromAnchor");
    expect(seam).not.toContain("export const exitWindowMs");
    expect(seam).not.toContain("export const presenceStyle");
    expect(seam).not.toContain("const milliseconds");
    expect(seam).not.toContain("const fadeFrom =");
  });
});
