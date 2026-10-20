/**
 * Tab rules: activation, and the rail's measured indicator box.
 *
 * The bugs these guard: `activation="manual"` selected a tab as soon as the
 * arrow keys moved focus, so Enter had nothing left to do. The indicator's box
 * lost the rail's padding (the list reports a content-box origin, so a naive
 * `trigger.x - list.x` is four pixels out), and a malformed `thickness` shrank
 * the only selected cue to nothing.
 */

import { describe, expect, it } from "vitest";
import {
  INDICATOR_THICKNESS,
  indicatorBox,
  indicatorThickness,
  selectsOnFocus,
} from "./logic.js";

/** The probe's rail: content-box origin 11,11, padding-box size 398x38. */
const list = { x: 11, y: 11, width: 398, height: 38 };
/** The second tab: one 60px tab and a 4px gap to the right of the origin. */
const trigger = { x: 75, y: 11, width: 100, height: 32 };

describe("selectsOnFocus", () => {
  it("selects on focus in automatic mode", () => {
    expect(selectsOnFocus("automatic")).toBe(true);
  });

  it("waits for Enter or Space in manual mode", () => {
    expect(selectsOnFocus("manual")).toBe(false);
  });
});

describe("indicatorBox", () => {
  it("hugs the rail's bottom edge under a horizontal tab", () => {
    expect(
      indicatorBox({
        list,
        trigger,
        padding: 4,
        orientation: "horizontal",
        thickness: 2,
      }),
    ).toEqual({ left: 68, top: 36, width: 100, height: 2 });
  });

  it("hugs the rail's left edge beside a vertical tab", () => {
    expect(
      indicatorBox({
        list,
        trigger,
        padding: 4,
        orientation: "vertical",
        thickness: 2,
      }),
    ).toEqual({ left: 0, top: 4, width: 2, height: 32 });
  });

  it("keeps a later tab's offset, not the rail's own origin", () => {
    const third = { x: 179, y: 11, width: 60, height: 32 };
    expect(
      indicatorBox({
        list,
        trigger: third,
        padding: 4,
        orientation: "horizontal",
        thickness: 2,
      }).left,
    ).toBe(172);
  });
});

describe("indicatorThickness", () => {
  it("defaults when the caller gives nothing", () => {
    expect(indicatorThickness()).toBe(INDICATOR_THICKNESS);
    expect(indicatorThickness(undefined)).toBe(INDICATOR_THICKNESS);
  });

  it("truncates a fractional bar and floors it at one pixel", () => {
    expect(indicatorThickness(3.7)).toBe(3);
    expect(indicatorThickness(0.5)).toBe(1);
    expect(indicatorThickness(-4)).toBe(1);
  });

  it("treats a non-finite bar as the default, never as nothing", () => {
    expect(indicatorThickness(Number.NaN)).toBe(INDICATOR_THICKNESS);
    expect(indicatorThickness(Number.POSITIVE_INFINITY)).toBe(
      INDICATOR_THICKNESS,
    );
  });
});
