/**
 * Guards keyframes, stagger, and the keyed sequence driver: offsets interpolate
 * with the segment easing, stagger distributes delays, and steps move through
 * pending → active → completed. Reverting any of these fails its assertion.
 */
import { describe, expect, it } from "vitest";
import { easeOut } from "./easing.js";
import { Sequence, keyframe, sampleKeyframes, stagger } from "./timeline.js";

describe("sampleKeyframes", () => {
  it("pins the endpoints and interpolates linearly between them", () => {
    const frames = [keyframe(0, 0), keyframe(1, 100)];
    expect(sampleKeyframes(frames, -0.5)).toBe(0);
    expect(sampleKeyframes(frames, 0.5)).toBe(50);
    expect(sampleKeyframes(frames, 1.5)).toBe(100);
  });

  it("applies the upper keyframe easing to its segment", () => {
    const frames = [
      keyframe(0, 0),
      keyframe(0.5, 50, easeOut),
      keyframe(1, 100),
    ];
    // Segment [0, 0.5] with local progress 0.5 → easeOut(0.5) = 0.875.
    expect(sampleKeyframes(frames, 0.25)).toBeCloseTo(50 * 0.875, 5);
  });

  it("reads a NaN progress as the first frame, an infinity as the last", () => {
    // The clamp only maps a comparable number: `NaN` used to pass straight into
    // the easing and paint a `NaN` value.
    const frames = [keyframe(0, 10), keyframe(1, 20)];
    expect(sampleKeyframes(frames, Number.NaN)).toBe(10);
    expect(sampleKeyframes(frames, Number.POSITIVE_INFINITY)).toBe(20);
  });
});

describe("stagger", () => {
  it("distributes delays from the chosen origin", () => {
    expect(stagger(20, 0, 3)).toBe(0);
    expect(stagger(20, 2, 3)).toBe(40);
    expect(stagger(20, 0, 3, "end")).toBe(40);
    expect(stagger(20, 1, 3, "center")).toBe(0);
    expect(stagger(20, 0, 3, "center")).toBe(20);
  });

  it("returns zero for an out-of-range index", () => {
    expect(stagger(20, 5, 3)).toBe(0);
    expect(stagger(20, -1, 3)).toBe(0);
  });
});

describe("Sequence", () => {
  it("moves steps through pending, active, and completed", () => {
    const sequence = new Sequence<string>().at("a", 0, 100).append("b", 100);

    const pending = sequence.sample(0);
    expect(pending[0]?.state).toBe("active");
    expect(pending[1]?.state).toBe("pending");

    const mid = sequence.sample(150);
    expect(mid[0]?.state).toBe("completed");
    expect(mid[1]?.state).toBe("active");
    expect(mid[1]?.value).toBe(0.5);

    expect(sequence.complete(150)).toBe(false);
    expect(sequence.complete(200)).toBe(true);
  });

  it("staggers a group of steps by a fixed step", () => {
    const sequence = new Sequence<string>().stagger(
      ["a", "b", "c"],
      10,
      20,
      50,
    );
    const sample = sequence.sample(25);
    expect(sample.map((step) => step.value)).toEqual([0.3, 0, 0]);
    expect(sequence.duration()).toBe(10 + 2 * 20 + 50);
  });

  it("reads a NaN elapsed time as the start, and an infinity as the end", () => {
    // `Math.max(NaN, 0)` is `NaN`, so a caller's unreadable clock used to produce
    // an `active` step whose value was `NaN` — a frame the runtime paints as
    // nothing — instead of the pending start.
    const sequence = new Sequence<string>().at("a", 0, 100);
    expect(sequence.sample(Number.NaN)).toEqual(sequence.sample(0));
    expect(sequence.sample(Number.POSITIVE_INFINITY)[0]?.state).toBe(
      "completed",
    );
    expect(sequence.complete(Number.NaN)).toBe(false);
    expect(sequence.complete(Number.POSITIVE_INFINITY)).toBe(true);
  });
});
