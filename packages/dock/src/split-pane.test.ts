/**
 * The split pane's arithmetic and the runtime rules its divider honours.
 *
 * The arithmetic is pure (`logic.ts`): a divider clamps to its caller's bounds,
 * an arrow steps a fixed pixel count, and Home/End name the bounds. The rules
 * are the ones the window probes measured — the divider is a `role="separator"`
 * keyboard control that arms pointer capture only on the `onMouseDown`/
 * `onMouseMove` pair (`pointer-capture`), and a split resizes by `flexBasis`,
 * never a `transform` (upstream issue #102). Each rule is held by a source
 * guard so a future plan cannot drop it silently the way the record did before.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DIVIDER_STEP,
  clampSize,
  dragSize,
  resizeByKey,
  sizeBounds,
} from "./logic.js";

const dividerSource = readFileSync(
  new URL("./divider.tsx", import.meta.url),
  "utf8",
);
const splitSource = readFileSync(
  new URL("./split-pane.tsx", import.meta.url),
  "utf8",
);

const bounds = sizeBounds(80, 320);

describe("divider clamp", () => {
  it("clamps a size below and above its bounds", () => {
    expect(clampSize(40, bounds)).toBe(80);
    expect(clampSize(999, bounds)).toBe(320);
    expect(clampSize(200, bounds)).toBe(200);
  });

  it("accumulates a drag from its start, clamped at both ends", () => {
    expect(dragSize(200, 40, bounds)).toBe(240);
    expect(dragSize(200, 500, bounds)).toBe(320);
    expect(dragSize(200, -500, bounds)).toBe(80);
  });
});

describe("keyboard step", () => {
  it("steps by the divider's pixel count in both directions", () => {
    expect(resizeByKey(200, "right", bounds)).toBe(200 + DIVIDER_STEP);
    expect(resizeByKey(200, "down", bounds)).toBe(200 + DIVIDER_STEP);
    expect(resizeByKey(200, "left", bounds)).toBe(200 - DIVIDER_STEP);
    expect(resizeByKey(200, "up", bounds)).toBe(200 - DIVIDER_STEP);
  });

  it("clamps an arrow held against a bound", () => {
    expect(resizeByKey(bounds.min, "left", bounds)).toBe(bounds.min);
    expect(resizeByKey(bounds.max, "right", bounds)).toBe(bounds.max);
  });

  it("names the bounds on Home and End", () => {
    expect(resizeByKey(200, "home", bounds)).toBe(bounds.min);
    expect(resizeByKey(200, "end", bounds)).toBe(bounds.max);
  });
});

describe("the divider's runtime rules", () => {
  it("arms pointer capture with the mouseDown + mouseMove pair", () => {
    // `pointer-capture` measured that the runtime captures only for an element
    // subscribed to both; a move-only divider keeps 1 move of 8.
    expect(dividerSource).toContain("onMouseDown");
    expect(dividerSource).toContain("onMouseMove");
  });

  it("is a keyboard-operable separator, not only a handle", () => {
    expect(dividerSource).toContain('role="separator"');
    expect(dividerSource).toContain("aria-valuetext");
    expect(dividerSource).toContain("controlFocusRing");
    expect(dividerSource).toContain("onKeyDown");
  });

  it("resizes by flexBasis and never a transform", () => {
    // Upstream issue #102: the runtime has no transform, so a split's pane is
    // sized by its flex basis, and the divider's feedback is an opacity fade.
    expect(splitSource).toContain("flexBasis");
    expect(splitSource).not.toMatch(/\btransform\s*:/);
  });
});
