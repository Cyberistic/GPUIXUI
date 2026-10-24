/**
 * Guards the shell's activation rule.
 *
 * The bug it catches: the rule compared the spacebar against the DOM's `" "`,
 * a name GPUix never sends — the runtime spells that key `space`, the
 * `SPACE_KEY` every shipped control's `decideActivation` reads and every probe
 * that presses it passes. So a Space press on a sidebar row, a palette button
 * or a `Pressable` did nothing while Enter worked, and no suite saw it: the
 * offscreen probes only ever pressed Enter on the shell, and the library's own
 * activation cases run below this surface.
 */
import { describe, expect, it } from "vitest";
import {
  ENTER_KEY,
  SPACE_KEY,
  decideActivation,
} from "@gpuixui/primitives/core";
import { isActivationKey } from "./ui.js";

describe("the shell's activation rule", () => {
  it("answers the two key names the runtime sends", () => {
    // Both names come from the library's own `KeyName`, so a rename there
    // cannot leave this shell comparing a spelling nothing delivers.
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
    // The shell cannot call `decideActivation`: Space activates a control on
    // its **release**, and this shell's only key source sends a down. The
    // premise is executable so the divergence stays a decision, not a typo.
    expect(decideActivation(SPACE_KEY, "down", false)).toBe(false);
    expect(decideActivation(SPACE_KEY, "up", false)).toBe(true);
    expect(decideActivation(ENTER_KEY, "down", false)).toBe(true);
    expect(isActivationKey(SPACE_KEY)).toBe(true);
    expect(isActivationKey(ENTER_KEY)).toBe(true);
  });
});
