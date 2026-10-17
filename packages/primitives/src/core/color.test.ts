import { describe, expect, it } from "vitest";
import { alpha } from "./color.js";

/**
 * Guards the colour arithmetic behind interaction feedback.
 *
 * A filled control's hover and press are the role's own colour at a lifted
 * alpha. If `alpha` drops the channel, mis-parses `#RGB` or turns a non-hex
 * value into a broken string, every filled control either stops showing press
 * feedback or paints a colour the runtime ignores. Each case below is one of
 * those failure modes.
 */

describe("alpha", () => {
  it("appends an alpha byte to a six-digit hex colour", () => {
    expect(alpha("#2559D6", 1)).toBe("#2559D6FF");
    expect(alpha("#2559D6", 0)).toBe("#2559D600");
  });

  it("replaces an existing alpha byte rather than appending a third", () => {
    const replaced = alpha("#2559D64D", 0.5);
    expect(replaced).toBe("#2559D680");
    expect(replaced).toHaveLength(9);
  });

  it("clamps out-of-range amounts instead of producing a wider or negative byte", () => {
    expect(alpha("#2559D6", 5)).toBe("#2559D6FF");
    expect(alpha("#2559D6", -1)).toBe("#2559D600");
  });

  it("returns a colour it cannot parse unchanged, so a theme never loses a fill", () => {
    expect(alpha("rgb(37, 89, 214)", 0.5)).toBe("rgb(37, 89, 214)");
    expect(alpha("rebeccapurple", 0.5)).toBe("rebeccapurple");
  });
});
