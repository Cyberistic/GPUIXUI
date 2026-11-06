import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { currentStep, orientationOf, statusOf, stepName } from "./logic.js";

describe("orientationOf", () => {
  it("keeps the two axes this release ships", () => {
    expect(orientationOf("horizontal")).toBe("horizontal");
    expect(orientationOf("vertical")).toBe("vertical");
  });

  it("reads a name it does not ship as the documented horizontal axis", () => {
    expect(orientationOf("column")).toBe("horizontal");
    expect(orientationOf("Vertical")).toBe("horizontal");
    expect(orientationOf(" vertical")).toBe("horizontal");
    expect(orientationOf(undefined)).toBe("horizontal");
    expect(orientationOf(null)).toBe("horizontal");
    expect(orientationOf(1)).toBe("horizontal");
  });
});

describe("currentStep", () => {
  it("keeps a value it can read, including one below the first step", () => {
    expect(currentStep(2)).toBe(2);
    expect(currentStep(1.5)).toBe(1.5);
    expect(currentStep(0)).toBe(0);
    expect(currentStep(-3)).toBe(-3);
  });

  it("reads a value it cannot name as the first step", () => {
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
    expect(statusOf(0, 1)).toBe("upcoming");
    expect(statusOf(-1, 1)).toBe("upcoming");
  });
});

describe("stepName", () => {
  it("names a titleless step by its position", () => {
    expect(stepName("", 2)).toBe("Step 2");
    expect(stepName("   ", 3)).toBe("Step 3");
    expect(stepName("", Number.NaN)).toBe("Step 1");
  });

  it("keeps a readable title without its padding", () => {
    expect(stepName(" Review ", 2)).toBe("Review");
    expect(stepName("Step 2", 2)).toBe("Step 2");
  });

  it("reads a title that is not text as the step's position", () => {
    expect(stepName(42, 2)).toBe("Step 2");
    expect(stepName(null, 3)).toBe("Step 3");
    expect(stepName({ title: "Name" }, 4)).toBe("Step 4");
    expect(stepName(["Name"], 5)).toBe("Step 5");
  });
});
