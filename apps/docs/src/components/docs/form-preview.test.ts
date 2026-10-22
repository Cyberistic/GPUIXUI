/**
 * The form preview's contract: the messages a failed submit turns on, which
 * field owns each, and the submit the caller owns.
 *
 * The bugs these guard are the ones a form page gets wrong: messages painted
 * before anything was submitted (a form that nags from the first keystroke), a
 * failed submit that reports one message for two bad fields (the runtime stops
 * at the first unless `errors: "all"` is asked for), an edit that clears a
 * message belonging to a field the reader did not touch, a pending form that
 * submits twice, and a success line quoting the draft on screen instead of the
 * one that was accepted.
 */

import { describe, expect, it } from "vitest";
import {
  accept,
  ADDRESS_MESSAGE,
  canSubmit,
  checkAddress,
  checkName,
  createdLabel,
  EMPTY_DRAFT,
  formMessages,
  NAME_MESSAGE,
  visibleMessages,
  type FormDraft,
} from "./form-preview";

const good: FormDraft = { email: "hunter@example.com", name: "Hunter" };

describe("the form preview's messages", () => {
  it("reports nothing before a submit has failed", () => {
    expect(visibleMessages(EMPTY_DRAFT, false)).toEqual([]);
    expect(visibleMessages(good, false)).toEqual([]);
  });

  it("reports both bad fields after a failed submit, in field order", () => {
    expect(formMessages(EMPTY_DRAFT)).toEqual([ADDRESS_MESSAGE, NAME_MESSAGE]);
  });

  it("clears only the field that was fixed", () => {
    const fixed = { ...EMPTY_DRAFT, email: "hunter@example.com" };
    expect(visibleMessages(fixed, true)).toEqual([NAME_MESSAGE]);
  });

  it("keeps a still-bad field's message without a second submit", () => {
    const stillBad = { email: "hunter", name: "Hunter" };
    expect(visibleMessages(stillBad, true)).toEqual([ADDRESS_MESSAGE]);
  });

  it("accepts the draft and trims the name it reports", () => {
    expect(checkAddress("hunter@example.com")).toEqual({ accepted: true });
    expect(checkName("  ")).toEqual({
      accepted: false,
      message: NAME_MESSAGE,
    });
    expect(accept({ email: "hunter@example.com", name: "  Hunter  " })).toEqual(
      {
        email: "hunter@example.com",
        name: "Hunter",
      },
    );
    expect(createdLabel(accept(good))).toBe(
      "Created Hunter (hunter@example.com)",
    );
  });
});

describe("the form preview's submit", () => {
  it("allows one submit when the draft is accepted and the form is idle", () => {
    expect(canSubmit(good, false)).toBe(true);
    expect(canSubmit(good, true)).toBe(false);
  });

  it("refuses a submit a schema would reject", () => {
    expect(canSubmit(EMPTY_DRAFT, false)).toBe(false);
    expect(canSubmit({ ...good, email: "hunter" }, false)).toBe(false);
  });
});
