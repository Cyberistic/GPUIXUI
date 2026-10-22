/**
 * The bug this guards: a control that paints below the pressable-target floor.
 *
 * A checkbox draws at `iconSize[md]` (16px), a switch thumb at the same step,
 * and a tree chevron at `xs` (12px). Those are the *drawn* sizes, so the click
 * area was the drawing — 16px, under WCAG 2.2 SC 2.5.8's 24px minimum. The fix
 * is a rule, not a bigger drawing: keep the control's look and reserve the
 * difference as padding. `targetInset` is that arithmetic, and these tests hold
 * it, the floors, and the shipped scales that sit under them to one another — a
 * control height or icon step that drops below the floor fails here by name.
 */
import { describe, expect, it } from "vitest";
import {
  controlSizes,
  densityPresets,
  iconSize,
  targetInset,
  targetSize,
} from "./scale.js";

describe("the target floors", () => {
  it("carries the AA and AAA values, in order", () => {
    expect(targetSize.minimum).toBe(24);
    expect(targetSize.comfortable).toBe(44);
    expect(targetSize.comfortable).toBeGreaterThan(targetSize.minimum);
  });
});

describe("targetInset", () => {
  it("reserves the gap each side of a control below the floor", () => {
    // 12 + 2*6, 14 + 2*5, 16 + 2*4, 20 + 2*2 — each lands exactly on 24.
    expect(targetInset(iconSize.xs)).toBe(6);
    expect(targetInset(iconSize.sm)).toBe(5);
    expect(targetInset(iconSize.md)).toBe(4);
    expect(targetInset(iconSize.lg)).toBe(2);
    expect(targetInset(iconSize.xl)).toBe(0);
  });

  it("rounds a half-pixel gap up, so the target is never short", () => {
    // (24 - 13) / 2 = 5.5: 5 would leave 23px, so the inset is 6 and the box 25.
    expect(targetInset(13)).toBe(6);
    expect(13 + targetInset(13) * 2).toBeGreaterThanOrEqual(targetSize.minimum);
  });

  it("adds nothing to a control that already reaches the floor", () => {
    expect(targetInset(24)).toBe(0);
    expect(targetInset(32)).toBe(0);
  });

  it("takes an explicit floor, so a touch surface can ask for the comfortable one", () => {
    expect(targetInset(iconSize.md, targetSize.comfortable)).toBe(14);
    expect(targetInset(iconSize.md, 16)).toBe(0);
  });

  it("returns no inset for a size or floor that cannot describe a box", () => {
    // A caller's own arithmetic produced these; an inset would invent a box.
    expect(targetInset(Number.NaN)).toBe(0);
    expect(targetInset(Number.POSITIVE_INFINITY)).toBe(0);
    expect(targetInset(16, Number.NaN)).toBe(0);
  });
});

describe("the shipped scales against the floor", () => {
  it("keeps every control height at or above the AA floor in every density", () => {
    const short = Object.values(densityPresets).flatMap((preset) =>
      controlSizes.flatMap((size) => {
        const height = preset.controlHeight[size];
        return height < targetSize.minimum
          ? [`${preset.name} ${size}: ${height}`]
          : [];
      }),
    );

    expect(short).toEqual([]);
  });

  it("keeps every row height at or above the AA floor in every density", () => {
    // A `dense` list row is built at exactly this height, and it is a press
    // target — so the shipped presets, like a brand's, clear the floor.
    const short = Object.values(densityPresets).flatMap((preset) =>
      preset.rowHeight < targetSize.minimum
        ? [`${preset.name}: ${preset.rowHeight}`]
        : [],
    );

    expect(short).toEqual([]);
  });

  it("reserves every icon step up to the floor, because an icon-only control draws at the step", () => {
    const boxes = Object.values(iconSize).map(
      (size) => size + targetInset(size) * 2,
    );

    expect(boxes).toEqual(
      Object.values(iconSize).map(() => targetSize.minimum),
    );
  });
});
