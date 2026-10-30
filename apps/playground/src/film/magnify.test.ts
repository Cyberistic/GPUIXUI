/**
 * The film's macro theme. The bug it guards: a magnified theme that left a length
 * unscaled (a control drawn at 1× inside an 8× frame) or scaled a colour, weight
 * or unitless ratio into nonsense.
 */
import { lightTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { magnify } from "./magnify.js";

describe("magnify", () => {
  const big = magnify(lightTheme, 8);

  it("scales every token length", () => {
    expect(big.spacing.md).toBe(lightTheme.spacing.md * 8);
    expect(big.radius.md).toBe(lightTheme.radius.md * 8);
    expect(big.density.controlHeight.md).toBe(lightTheme.density.controlHeight.md * 8);
    expect(big.typography.body.fontSize).toBe(lightTheme.typography.body.fontSize * 8);
  });

  it("keeps colours, weights and the theme's identity", () => {
    expect(big.colors).toBe(lightTheme.colors);
    expect(big.typography.body.fontWeight).toBe(lightTheme.typography.body.fontWeight);
    expect(big.typography.sans).toBe(lightTheme.typography.sans);
    expect(big.mode).toBe(lightTheme.mode);
  });
});
