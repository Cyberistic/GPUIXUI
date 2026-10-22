/**
 * Guards the fixture and the claims `action-ring` measures on the shipped
 * filled action.
 *
 * The bug this holds: a keyboard ring is drawn in the theme's `ring` role, and
 * a filled action's face is often the **same** role — in the shipped dark
 * palette `primary` and `ring` are one hex — so a ring drawn flush against the
 * fill is invisible while every colour report stays clean. The separation is
 * the page showing through `outlineOffset`, so the probe samples three points:
 * the ring's band, the middle of the gap, and the fill inside the box. Each is
 * arithmetic on the painted box, which this file holds without a window; the
 * probe then proves the paint in `action-ring` on 0.11.0.
 *
 * `node:fs` is deliberate, as in `ring-offset.test.ts`: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import { getTheme, keyboardFocusRing } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import {
  ACTION_RING_DANGER,
  ACTION_RING_PRIMARY,
  insidePoint,
} from "./action-ring.js";
import { liveRegistry } from "./registry.js";
import { bandPoint, leftOf } from "./ring-offset.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

const theme = getTheme("dark");
const line = theme.borderWidth.strong;
const offset = keyboardFocusRing(theme).focusVisible.outlineOffset;

const box = { x: 40, y: 20, width: 240, height: 48 };

/** The `action-ring` section, without the headings after it. */
const section = (): string => {
  const start = readme.indexOf("### `action-ring`");
  const end = readme.indexOf("\n### ", start + 1);
  return start === -1 ? "" : readme.slice(start, end === -1 ? undefined : end);
};

describe("the points the filled action is sampled at", () => {
  it("reads the fill inside the box, not the ring's band", () => {
    expect(insidePoint(box, 2)).toEqual({ x: 42, y: 44 });
    // The band is outside the box and the fill sample is inside it, so the two
    // points can never be the same pixel.
    expect(bandPoint(box, offset, line).x).toBeLessThan(box.x);
    expect(insidePoint(box, 2).x).toBeGreaterThan(box.x);
  });

  it("puts the gap half an offset out and the band one line further", () => {
    // Offset 2 and a 2 pt line: the gap's middle is one point out, the band's is
    // three. A frame that confuses them reads the wrong one.
    expect(leftOf(box, offset / 2)).toEqual({ x: 39, y: 44 });
    expect(bandPoint(box, offset, line)).toEqual({ x: 37, y: 44 });
  });
});

describe("the premise the gap repairs", () => {
  it("paints the brand fill in the ring's own role", () => {
    // The defect: a flush ring on this action is the fill's own colour. If the
    // palette ever separates them, this fixture's premise changes and the check
    // names it rather than passing on a stale story.
    expect(theme.colors.primary).toBe(theme.colors.ring);
  });

  it("separates the line from the fill by a positive offset", () => {
    expect(offset).toBe(line);
    expect(offset).toBeGreaterThan(0);
  });
});

describe("the probe's fixture", () => {
  it("mounts the shipped actions and reads the shipped ring", () => {
    const start = scenarios.indexOf("const ActionRingProbe");
    const probe = scenarios.slice(
      start,
      scenarios.indexOf(
        "/** One sample with the runtime's default focus dimming",
        start,
      ),
    );
    expect(probe).toContain(`testId={${"ACTION_RING_PRIMARY"}}`);
    expect(probe).toContain(`testId={${"ACTION_RING_DANGER"}}`);
    expect(probe).toContain('variant="primary"');
    expect(probe).toContain('variant="destructive"');
    // The probe must sample the ring the library ships, not a literal offset.
    expect(scenarios).toContain(
      "keyboardFocusRing(theme).focusVisible.outlineOffset",
    );
  });

  it("names the three points it asserts", () => {
    expect(scenarios).toContain("bandPoint(primaryBefore, offset, line)");
    expect(scenarios).toContain("leftOf(primaryBefore, offset / 2)");
    expect(scenarios).toContain("insidePoint(primaryBefore, 2)");
    expect(scenarios).toContain("insidePoint(dangerBefore, 2)");
    expect(ACTION_RING_PRIMARY).not.toBe(ACTION_RING_DANGER);
  });
});

describe("the measurement the README prints", () => {
  it("records the role, the gap and the layout proof", () => {
    const text = section().replace(/\s+/g, " ");
    expect(text).not.toBe("");
    expect(text).toContain("**The fill and the ring are one role.**");
    expect(text).toContain("one point out is the page");
    expect(text).toContain("`x,y,width,height`");
  });

  it("names the negative control that fails when the offset is dropped", () => {
    expect(section()).toContain(
      "a brand-filled action paints the ring and its own fill as the same role",
    );
    expect(section()).toContain("`expected false, got true`, exit `1`");
  });

  it("registers the probe as a focus measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "action-ring",
      title:
        "Focus: a filled action paints its ring on the page, one strong-border gap clear of its own fill",
      capability: "focus",
    });
  });
});
