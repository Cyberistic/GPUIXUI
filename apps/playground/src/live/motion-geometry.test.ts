/**
 * Holds two things about the `motion-geometry` record: the claim its README
 * section prints, and the way the probe waits for a run to land.
 *
 * The flake this guards was measured on 2026-10-24: the section's own point 4
 * says `duration` is not a wall-clock promise, and the steps still slept a
 * fixed 900ms for a declared 3s. Under load the same transition painted for
 * seconds, so `the box lands on the animated target height` failed twice in a
 * row with `expected 240 ± 1, got 119` and the live suite's layout capability
 * read `failed` on a green tree. Waiting for the painted target (and for the
 * completion a frame after it) removes the machine's load from the check.
 *
 * `node:fs` is deliberate, as in `collapse.test.ts`: this reads the repository's
 * own probe and Markdown, never a runtime path.
 */
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

/** The `motionSteps` effect, bounded to the next top-level declaration. */
const motionSteps = (() => {
  const start = scenarios.indexOf("const motionSteps");
  const end = scenarios.indexOf("\nconst ", start + 1);
  return start === -1 || end === -1 ? "" : scenarios.slice(start, end);
})();

/** The section's prose on one line, so a wrapped sentence still reads whole. */
const flat = readme.replace(/\s+/g, " ");

describe("the motion-geometry probe waits for the paint, not the clock", () => {
  it("polls the target in both directions and for the captures", () => {
    const settles =
      motionSteps.match(/settledHeight\(ctx, "motion-box",/g) ?? [];
    // Grow, shrink, and one settle before each of the two captures.
    expect(settles.length).toBe(4);
    // The measured flake: a fixed 900ms settle decided the run by the box's
    // load rather than by the animation.
    expect(motionSteps).not.toContain("millis(900)");
  });

  it("waits for each completion a frame after the target", () => {
    expect(motionSteps).toContain('text.includes("completes=1")');
    expect(motionSteps).toContain('text.includes("completes=2")');
    // Both readouts are read through the poll, not beside the settled box.
    expect(motionSteps).toContain("const grownReadout = yield* settleUntil(");
    expect(motionSteps).toContain("const shrunkReadout = yield* settleUntil(");
  });

  it("still takes eight samples per run, which is what proves a tween", () => {
    expect(motionSteps).toContain("yield* motionSamples(ctx)");
    expect(motionSteps).toContain("Arr.some(growSamples");
    expect(motionSteps).toContain("Arr.some(shrinkSamples");
    // The sample helper is the loop of eight; a single sample cannot tell a
    // tween from a jump, which is the check's whole claim.
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
