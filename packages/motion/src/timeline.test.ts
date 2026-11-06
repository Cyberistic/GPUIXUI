import { describe, expect, it } from "vitest";
import { anticipate, easeOut, type Easing } from "./easing.js";
import { Sequence, keyframe, sampleKeyframes, stagger } from "./timeline.js";

const unusableSteps: readonly (readonly [string, number])[] = [
  ["a negative step", -20],
  ["an unreadable step", Number.NaN],
  ["an infinite step", Number.POSITIVE_INFINITY],
];

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

    expect(sampleKeyframes(frames, 0.25)).toBeCloseTo(50 * easeOut(0.5), 5);
  });

  it("lands on the value a segment ends at, whatever curve it names", () => {
    const frames = [
      keyframe(0, 0),
      keyframe(0.5, 50, anticipate),
      keyframe(1, 100),
    ];
    expect(sampleKeyframes(frames, 0.5)).toBe(50);
  });

  it("interpolates between two finite frames whose difference overflows", () => {
    const frames = [keyframe(0, -1e308), keyframe(1, 1e308)];
    expect(sampleKeyframes(frames, 0)).toBe(-1e308);
    expect(sampleKeyframes(frames, 0.5)).toBe(0);
    expect(sampleKeyframes(frames, 1)).toBe(1e308);
  });

  it("reads a NaN progress as the first frame, an infinity as the last", () => {
    const frames = [keyframe(0, 10), keyframe(1, 20)];
    expect(sampleKeyframes(frames, Number.NaN)).toBe(10);
    expect(sampleKeyframes(frames, Number.POSITIVE_INFINITY)).toBe(20);
  });

  it("samples the stops a list names, in whatever order it declared them", () => {
    const frames = [keyframe(0.8, 1), keyframe(0.2, 0)];
    expect(sampleKeyframes(frames, 0.1)).toBe(0);
    expect(sampleKeyframes(frames, 0.5)).toBeCloseTo(0.5, 6);
    expect(sampleKeyframes(frames, 0.9)).toBe(1);

    const three = [keyframe(0.5, 40), keyframe(0, 0), keyframe(1, 100)];
    expect(sampleKeyframes(three, 0.25)).toBe(20);
    expect(sampleKeyframes(three, 0.75)).toBe(70);
  });

  it("changes over at an offset two frames share, holding the last value", () => {
    const frames = [keyframe(0.5, 1), keyframe(0.5, 3), keyframe(1, 5)];
    expect(sampleKeyframes(frames, 0.25)).toBe(1);
    expect(sampleKeyframes(frames, 0.5)).toBe(3);
    expect(sampleKeyframes(frames, 0.75)).toBe(4);
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

  it("starts from the default for a direction it does not name", () => {
    const unreadable = ["middle", "Start"];
    unreadable.forEach((from) => {
      // @ts-expect-error — a persisted direction the library did not type-check.
      expect(stagger(10, 0, 4, from)).toBe(0);
      // @ts-expect-error — the same stored direction at the group's last index.
      expect(stagger(10, 3, 4, from)).toBe(30);
    });

    expect(stagger(10, 0, 4, "center")).toBe(15);
    expect(stagger(10, 0, 4, "end")).toBe(30);
    expect(stagger(10, 0, 4)).toBe(0);
  });

  it("waits for nothing when the group cannot be read", () => {
    expect(stagger(20, Number.NaN, 4)).toBe(0);
    expect(stagger(20, 2, Number.NaN)).toBe(0);
    expect(stagger(20, 2, Number.POSITIVE_INFINITY)).toBe(0);
    expect(stagger(20, 0, 3)).toBe(0);
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
    const sequence = new Sequence<string>().at("a", 0, 100);
    expect(sequence.sample(Number.NaN)).toEqual(sequence.sample(0));
    expect(sequence.sample(Number.POSITIVE_INFINITY)[0]?.state).toBe(
      "completed",
    );
    expect(sequence.complete(Number.NaN)).toBe(false);
    expect(sequence.complete(Number.POSITIVE_INFINITY)).toBe(true);
  });
});

describe("a timeline built by hand", () => {
  it("reads a clock before the sequence as its start, in both entry points", () => {
    const empty = new Sequence<string>();
    expect(empty.sample(-5)).toEqual([]);
    expect(empty.complete(-5)).toBe(true);
    expect(empty.complete(Number.NEGATIVE_INFINITY)).toBe(true);

    const instant = new Sequence<string>().at("a", 0, 0);
    const past = new Sequence<string>().at("a", -100, 50);
    [-5, -0.5, 0].forEach((clock) => {
      const steps = instant.sample(clock);
      expect(steps.every((step) => step.state === "completed")).toBe(true);
      expect(instant.complete(clock)).toBe(true);
      expect(past.complete(clock)).toBe(instant.complete(clock));
    });
  });

  it("does not stop on a frame whose value cannot be read", () => {
    const frames = [keyframe(0, 10), keyframe(1, Number.NaN)];
    expect(sampleKeyframes(frames, 0.5)).toBe(10);
    expect(sampleKeyframes(frames, 1)).toBe(10);
  });

  it("does not stop on a frame whose offset cannot be read", () => {
    const frames = [
      keyframe(0, 0),
      keyframe(Number.NaN, 100),
      keyframe(1, 200),
    ];
    expect(sampleKeyframes(frames, 0.5)).toBe(100);
  });

  it("answers zero when no frame can be read", () => {
    expect(sampleKeyframes([keyframe(Number.NaN, Number.NaN)], 0.5)).toBe(0);
    expect(sampleKeyframes([], 0.5)).toBe(0);
  });

  it("reads a stored frame set as the stops it actually carries", () => {
    expect(sampleKeyframes(null, 0.5)).toBe(0);
    expect(sampleKeyframes(undefined, 0.5)).toBe(0);

    const entries = [keyframe(0, 0), null, undefined, keyframe(1, 100)];
    expect(sampleKeyframes(entries, 0.5)).toBe(50);

    expect(sampleKeyframes([null, keyframe(1, 100)], 0)).toBe(100);
  });

  it("places no step for a group of keys the caller does not have", () => {
    const missing = new Sequence<string>().stagger(null, 10, 20, 50);
    expect(missing.sample(0)).toEqual([]);
    expect(missing.duration()).toBe(0);
    expect(missing.complete(0)).toBe(true);
    expect(
      new Sequence<string>().stagger(undefined, 0, 10, 50).sample(0),
    ).toEqual([]);

    expect(
      new Sequence<string>().stagger(["a", "b"], 0, 10, 50).sample(0),
    ).toHaveLength(2);
  });

  it("waits for nothing when the step cannot be read", () => {
    expect(stagger(Number.NaN, 2, 4)).toBe(0);
    expect(stagger(Number.POSITIVE_INFINITY, 2, 4)).toBe(0);
    expect(stagger(-10, 2, 4)).toBe(0);
    expect(stagger(20, 2, 3)).toBe(40);
  });

  it("places a step whose start cannot be read at the start", () => {
    const sequence = new Sequence<string>().at("a", Number.NaN, 100);
    expect(sequence.sample(0)).toEqual([
      { key: "a", state: "active", value: 0 },
    ]);
    expect(sequence.sample(50)[0]?.value).toBeCloseTo(0.5, 5);
    expect(sequence.duration()).toBe(100);
  });

  it("completes a step whose duration cannot be read", () => {
    const sequence = new Sequence<string>().at("a", 0, Number.NaN);
    expect(sequence.sample(0)).toEqual([
      { key: "a", state: "completed", value: 1 },
    ]);
    expect(sequence.duration()).toBe(0);
    expect(sequence.complete(0)).toBe(true);
  });

  it("does not end the sequence before a step it still has to run", () => {
    const sequence = new Sequence<string>().at("a", 100, -50);

    expect(sequence.duration()).toBe(100);
    expect(sequence.complete(99)).toBe(false);
    expect(sequence.complete(100)).toBe(true);
    expect(sequence.sample(99)[0]?.state).toBe("pending");
    expect(sequence.sample(100)[0]?.state).toBe("completed");
  });

  it("ends on a number the clock can reach", () => {
    const sequence = new Sequence<string>().at("a", 1e308, 1e308);
    expect(sequence.duration()).toBe(1e308);
    expect(sequence.complete(1e308)).toBe(true);
    expect(sequence.sample(1e308)[0]?.state).toBe("completed");
  });

  it("appends after a step rather than before it when its end overflows", () => {
    const sequence = new Sequence<string>()
      .at("a", 1e308, 1e308)
      .append("b", 10);

    expect(sequence.duration()).toBe(1e308);

    expect(sequence.sample(0).map((step) => step.state)).toEqual([
      "pending",
      "pending",
    ]);
    expect(sequence.sample(1e308).map((step) => step.state)).toEqual([
      "completed",
      "completed",
    ]);
  });

  it("keeps a group at its own start when an offset overflows", () => {
    expect(stagger(1e308, 2, 3)).toBe(0);

    const group = new Sequence<string>().stagger(["a", "b"], 1e308, 1e308, 5);
    expect(group.sample(0).map((member) => member.state)).toEqual([
      "pending",
      "pending",
    ]);
    expect(group.sample(1e308).map((member) => member.state)).toEqual([
      "completed",
      "completed",
    ]);
  });

  it("reads a group's end from the steps it still has to run", () => {
    const sequence = new Sequence<string>().stagger(["a", "b"], 10, 20, -50);

    expect(sequence.duration()).toBe(10 + 20);
    expect(sequence.complete(29)).toBe(false);
    expect(sequence.complete(30)).toBe(true);
  });

  it.each(unusableSteps)(
    "staggers a group with the rule the package publishes (%s)",
    (_name, step) => {
      expect(stagger(step, 1, 2)).toBe(0);

      const group = new Sequence<string>().stagger(["a", "b"], 10, step, 50);
      expect(group.sample(0).map((member) => member.state)).toEqual([
        "pending",
        "pending",
      ]);
      expect(group.sample(10).map((member) => member.state)).toEqual([
        "active",
        "active",
      ]);
      expect(group.duration()).toBe(10 + 50);
    },
  );

  it("keeps a staggered group's end readable", () => {
    const sequence = new Sequence<string>().stagger(
      ["a", "b"],
      0,
      Number.NaN,
      100,
    );
    expect(sequence.sample(50).map((step) => step.value)).toEqual([0.5, 0.5]);
    expect(sequence.duration()).toBe(100);
    expect(sequence.complete(100)).toBe(true);
  });

  it("applies only a curve that can read the frame", () => {
    const broken: Easing = () => Number.NaN;
    const frames = [keyframe(0, 0), keyframe(1, 100, broken)];
    expect(sampleKeyframes(frames, 0.5)).toBeCloseTo(50, 5);

    const sequence = new Sequence<string>().at("a", 0, 100, broken);
    expect(sequence.sample(50)).toEqual([
      { key: "a", state: "active", value: 0.5 },
    ]);
  });
});
