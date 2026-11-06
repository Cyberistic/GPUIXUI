import { describe, expect, it } from "vitest";
import {
  ENTER_KEY,
  SPACE_KEY,
  decideActivation,
} from "@gpuixui/primitives/core";
import { isActivationKey } from "./ui.js";

describe("the shell's activation rule", () => {
  it("answers the two key names the runtime sends", () => {
    expect(isActivationKey(ENTER_KEY)).toBe(true);
    expect(isActivationKey(SPACE_KEY)).toBe(true);
  });

  it("refuses the DOM's spellings, which never arrive", () => {
    expect(isActivationKey(" ")).toBe(false);
    expect(isActivationKey("Enter")).toBe(false);
    expect(isActivationKey("Space")).toBe(false);
    expect(isActivationKey("Spacebar")).toBe(false);
  });

  it("owns no other key", () => {
    expect(isActivationKey("tab")).toBe(false);
    expect(isActivationKey("down")).toBe(false);
    expect(isActivationKey("k")).toBe(false);
    expect(isActivationKey("")).toBe(false);
    expect(isActivationKey(undefined)).toBe(false);
  });

  it("reads the same names as a control, on the phase this host can send", () => {
    expect(decideActivation(SPACE_KEY, "down", false)).toBe(false);
    expect(decideActivation(SPACE_KEY, "up", false)).toBe(true);
    expect(decideActivation(ENTER_KEY, "down", false)).toBe(true);
    expect(isActivationKey(SPACE_KEY)).toBe(true);
    expect(isActivationKey(ENTER_KEY)).toBe(true);
  });
});
