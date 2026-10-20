/**
 * The disabled-description join rule.
 *
 * The bug these guard: 0.10.0 has no `aria-disabled`, so a disabled control
 * either said nothing about its state or, once a component supplied its own
 * description, replaced that description with "Disabled" or vice versa (plan
 * 516). The join is sentence-aware: a caller's description that already ends a
 * sentence was appended with `". "`, so the `field` example announced
 * `"… e.g. design-system.. Required"` (plan 804).
 */

import { describe, expect, it } from "vitest";
import { stateDescription, statusDescription } from "./state-description.js";

describe("stateDescription", () => {
  it("adds nothing to an enabled part", () => {
    expect(stateDescription(false)).toEqual({});
  });

  it("announces a disabled part", () => {
    expect(stateDescription(true)).toEqual({ "aria-description": "Disabled" });
  });

  it("keeps a caller's description on an enabled part", () => {
    expect(stateDescription(false, "Opens settings")).toEqual({
      "aria-description": "Opens settings",
    });
  });

  it("keeps the caller's description and appends the state", () => {
    expect(stateDescription(true, "Opens settings")).toEqual({
      "aria-description": "Opens settings. Disabled",
    });
  });

  it("skips blank descriptions", () => {
    expect(stateDescription(true, "  ", "")).toEqual({
      "aria-description": "Disabled",
    });
    expect(stateDescription(false, "  ")).toEqual({});
  });

  it("joins several descriptions once, without repeating the state", () => {
    expect(stateDescription(true, "Enter a valid email", "Required")).toEqual({
      "aria-description": "Enter a valid email. Required. Disabled",
    });
    expect(stateDescription(true, "Disabled")).toEqual({
      "aria-description": "Disabled",
    });
  });

  it("does not double the stop of a caller's sentence", () => {
    expect(
      stateDescription(true, "Use a slug, e.g. design-system.", "Required"),
    ).toEqual({
      "aria-description": "Use a slug, e.g. design-system. Required. Disabled",
    });
  });

  it("treats a question or an exclamation as a finished sentence", () => {
    expect(stateDescription(true, "Delete this file?", "Required")).toEqual({
      "aria-description": "Delete this file? Required. Disabled",
    });
    expect(stateDescription(false, "Saved!")).toEqual({
      "aria-description": "Saved!",
    });
  });

  it("keeps the caller's own stop on the status path", () => {
    expect(statusDescription("complete", "Shipped at 09:41.")).toEqual({
      "aria-description": "Shipped at 09:41. Complete",
    });
  });
});
