import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const motionSteps = (() => {
  const start = scenarios.indexOf("const motionSteps");
  const end = scenarios.indexOf("\nconst ", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

const flat = readme.replace(/\s+/g, " ");

describe("the motion-geometry probe waits for the paint, not the clock", () => {
  it("polls the target in both directions and for the captures", () => {
    const settles =
      motionSteps.match(/settledHeight\(ctx, "motion-box",/g) ?? [];

    expect(settles.length).toBe(4);

    expect(motionSteps).not.toContain("millis(900)");
  });

  it("waits for each completion a frame after the target", () => {
    expect(motionSteps).toContain('text.includes("completes=1")');
    expect(motionSteps).toContain('text.includes("completes=2")');

    expect(motionSteps).toContain("const grownReadout = yield* settleUntil(");
    expect(motionSteps).toContain("const shrunkReadout = yield* settleUntil(");
  });

  it("still takes eight samples per run, which is what proves a tween", () => {
    expect(motionSteps).toContain("yield* motionSamples(ctx)");
    expect(motionSteps).toContain("Arr.some(growSamples");
    expect(motionSteps).toContain("Arr.some(shrinkSamples");

    expect(scenarios).toContain("const motionSamples =");
    expect(scenarios).toContain("[1, 2, 3, 4, 5, 6, 7, 8]");
  });
});

describe("the motion-geometry record", () => {
  it("is registered with the layout capability", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "motion-geometry"),
    ).toEqual([
      {
        id: "motion-geometry",
        title: expect.stringContaining("motion animates"),
        capability: "layout",
      },
    ]);
  });

  it("prints the count the probe asserts, after the poll added no check", () => {
    const printed = Number(
      /(\d+) checks, `--only motion-geometry`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(35);
  });

  it("records the load flake the poll replaced", () => {
    expect(flat).toContain("expected 240 ± 1, got 119");
    expect(flat).toContain("A probe must not press the instant it mounts");
    expect(flat).toContain("wait for the painted target");
  });
});
