import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  gateMessage,
  isLastStep,
  nextStep,
  previousStep,
  refusalText,
  REFUSAL_FALLBACK,
  stepAnnouncement,
  stepOf,
  stepsOf,
} from "./logic.js";

describe("stepOf", () => {
  it("keeps a step inside 1…count", () => {
    expect(stepOf(1, 3)).toBe(1);
    expect(stepOf(0, 3)).toBe(1);
    expect(stepOf(2.8, 3)).toBe(2);
    expect(stepOf(99, 3)).toBe(3);
    expect(stepOf(Number.NaN, 3)).toBe(1);
    expect(stepOf(2, 0)).toBe(1);
  });
});

describe("nextStep / previousStep", () => {
  it("stops at both ends", () => {
    expect(nextStep(1, 3)).toBe(2);
    expect(nextStep(3, 3)).toBe(3);
    expect(previousStep(2)).toBe(1);
    expect(previousStep(1)).toBe(1);
    expect(previousStep(Number.NaN)).toBe(1);
  });
});

describe("isLastStep", () => {
  it("names the last step and never an empty workflow", () => {
    expect(isLastStep(3, 3)).toBe(true);
    expect(isLastStep(2, 3)).toBe(false);
    expect(isLastStep(1, 0)).toBe(false);
  });
});

describe("gateMessage", () => {
  it("reads a step's own refusal", () => {
    const refusing = { gate: () => Option.some("Accept the checklist") };
    expect(Option.getOrNull(gateMessage(refusing))).toBe(
      "Accept the checklist",
    );
  });

  it("allows a step with no gate, and one whose gate passes", () => {
    expect(Option.isNone(gateMessage(undefined))).toBe(true);
    expect(Option.isNone(gateMessage({}))).toBe(true);
    expect(Option.isNone(gateMessage({ gate: () => Option.none() }))).toBe(
      true,
    );
  });

  it("reads a gate a stored definition did not carry as no gate", () => {
    expect(Option.isNone(gateMessage({ gate: null }))).toBe(true);

    expect(Option.isNone(gateMessage({ gate: "always" }))).toBe(true);
    expect(Option.isNone(gateMessage(null))).toBe(true);

    expect(
      Option.getOrNull(gateMessage({ gate: () => Option.some("Still") })),
    ).toBe("Still");
  });
});

describe("refusalText", () => {
  it("reads a refusal that says nothing as the shipped sentence", () => {
    expect(refusalText("")).toBe(REFUSAL_FALLBACK);
    expect(refusalText("   ")).toBe(REFUSAL_FALLBACK);
    expect(refusalText("\t\n")).toBe(REFUSAL_FALLBACK);
  });

  it("keeps the caller's sentence without its padding", () => {
    expect(refusalText("  Accept the checklist  ")).toBe(
      "Accept the checklist",
    );
  });
});

describe("stepAnnouncement", () => {
  it("names the title and the place in the workflow", () => {
    expect(stepAnnouncement("Review", 2, 3)).toBe("Review, step 2 of 3");
    expect(stepAnnouncement("Review", 9, 3)).toBe("Review, step 3 of 3");
    expect(stepAnnouncement("Review", 1, 0)).toBe("Review, step 1 of 1");
  });
});

describe("stepsOf", () => {
  const step = (id: string, title: string) => ({ id, title, content: null });

  it("reads a list a store wrote, and no steps for anything else", () => {
    const saved = [step("name", "Name"), step("review", "Review")];
    expect(stepsOf(saved)).toEqual(saved);
    expect(stepsOf(null)).toEqual([]);
    expect(stepsOf(undefined)).toEqual([]);
  });

  it("drops an entry that names no step, keeping the ones beside it", () => {
    const kept = [step("name", "Name"), step("review", "Review")];
    const stored = [null, step("name", "Name"), "", step("", "Blank"), kept[1]];
    expect(stepsOf(stored as unknown as typeof kept)).toEqual(kept);
  });
});
