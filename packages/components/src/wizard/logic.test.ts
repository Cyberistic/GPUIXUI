/**
 * The wizard's step arithmetic and its gate.
 *
 * The bug guarded: a stored or computed step index must never paint a step that
 * does not exist, and a gate must be consulted on the step the reader is on —
 * a step that refuses to be left keeps the workflow where it was and reports its
 * own message.
 */

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
  stepName,
  stepOf,
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
});

describe("refusalText", () => {
  it("reads a refusal that says nothing as the shipped sentence", () => {
    // The bug guarded: a gate answering Some("") — an i18n row missing its key —
    // kept the reader put and painted an empty alert, so a press did nothing and
    // nothing said why.
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

describe("stepName", () => {
  it("names a titleless step by its position", () => {
    // The bug guarded: a title that arrived blank published an unnamed list
    // item and an announcement opening with a comma (`", step 1 of 3"`).
    expect(stepName("", 2)).toBe("Step 2");
    expect(stepName("   ", 3)).toBe("Step 3");
    expect(stepName("", Number.NaN)).toBe("Step 1");
  });

  it("keeps a readable title without its padding", () => {
    expect(stepName(" Review ", 2)).toBe("Review");
    expect(stepName("Step 2", 2)).toBe("Step 2");
  });
});
