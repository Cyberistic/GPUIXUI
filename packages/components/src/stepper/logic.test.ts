/**
 * The stepper's one rule, without a renderer.
 *
 * The bug these guard: a `value` the caller cannot name — `NaN` or an infinity
 * from arithmetic over a step index, stamped before a total arrived — left
 * every marker `upcoming` and announced no current step, so the indicator
 * claimed the workflow had not started while nothing on the page said so.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { currentStep, statusOf } from "./logic.js";

describe("currentStep", () => {
  it("keeps a value it can read, including one below the first step", () => {
    expect(currentStep(2)).toBe(2);
    expect(currentStep(1.5)).toBe(1.5);
    expect(currentStep(0)).toBe(0);
    expect(currentStep(-3)).toBe(-3);
  });

  it("reads a value it cannot name as the first step", () => {
    // The first step is the default the prop documents ("1-based"): a marker
    // is painted rather than every step reading upcoming.
    expect(currentStep(Number.NaN)).toBe(1);
    expect(currentStep(Number.POSITIVE_INFINITY)).toBe(1);
    expect(currentStep(Number.NEGATIVE_INFINITY)).toBe(1);
  });
});

describe("statusOf", () => {
  it("derives complete, current and upcoming from the current step", () => {
    expect(statusOf(2, 1)).toBe("complete");
    expect(statusOf(2, 2)).toBe("current");
    expect(statusOf(2, 3)).toBe("upcoming");
  });

  it("marks exactly one step current", () => {
    const steps = [1, 2, 3, 4, 5];
    const currents = Arr.map(steps, (current) =>
      Arr.filter(steps, (step) => statusOf(current, step) === "current"),
    );
    expect(currents).toEqual(Arr.map(steps, (current) => [current]));
  });

  it("marks the first step current for a value it cannot name", () => {
    expect(statusOf(Number.NaN, 1)).toBe("current");
    expect(statusOf(Number.NaN, 2)).toBe("upcoming");
    expect(statusOf(Number.POSITIVE_INFINITY, 1)).toBe("current");
  });

  it("paints no step current for an explicit value below the first", () => {
    // A caller who says "not started" gets an unstarted ladder, which is a
    // state they asked for — distinct from one they could not read.
    expect(statusOf(0, 1)).toBe("upcoming");
    expect(statusOf(-1, 1)).toBe("upcoming");
  });
});
