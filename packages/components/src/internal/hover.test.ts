/**
 * The hover-delay rule.
 *
 * The bug these guard: `PreviewCard` and `NavigationMenu` passed their delay
 * props straight to `setTimeout`, so `NaN`/`Infinity` ran the timer at once —
 * a malformed `openDelay` opened on hover and a malformed `closeDelay` closed
 * before the pointer could travel into the panel. A non-finite value now takes
 * the component's default; `0` and a negative value still mean "no delay".
 */

import { describe, expect, it } from "vitest";
import { hoverDelay } from "./hover.js";

describe("hoverDelay", () => {
  it("falls back to the component default for a non-finite delay", () => {
    expect(hoverDelay(Number.NaN, 300)).toBe(300);
    expect(hoverDelay(Number.NaN, 150)).toBe(150);
    expect(hoverDelay(Number.POSITIVE_INFINITY, 100)).toBe(100);
  });

  it("keeps a caller's finite delay, and an explicit no-delay", () => {
    expect(hoverDelay(250, 300)).toBe(250);
    expect(hoverDelay(0, 300)).toBe(0);
    expect(hoverDelay(-5, 300)).toBe(0);
  });
});
