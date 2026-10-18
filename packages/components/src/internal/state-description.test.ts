/**
 * The disabled-description join rule.
 *
 * The bug these guard: 0.10.0 has no `aria-disabled`, so a disabled control
 * either said nothing about its state or, once a component supplied its own
 * description, replaced that description with "Disabled" or vice versa (plan
 * 516).
 */

import { describe, expect, it } from "vitest";
import { stateDescription } from "./state-description.js";

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
});
