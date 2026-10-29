import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { valueFraction } from "@gpuixui/primitives/core";
import { dragSpan } from "./slider-preview";

/**
 * A range drag holds the end it is not moving and orders the span around it.
 *
 * Guarded bug: the drag remembered which thumb the **press** grabbed and moved
 * it with `moveSpanEnd`, which refuses to cross. Pulling the low end past the
 * high end clamped both onto one value; the next move then saw a coincident pair
 * and fell back to the press point, so the thumb jumped back where the gesture
 * started. A crossing must instead continue on the thumb the pointer now holds —
 * the pair swaps roles, stays ordered, and the fill stays between the ends.
 */

const RANGE = { min: 0, max: 100, step: 1 } as const;

describe("a range drag", () => {
  it("moves the grabbed end and pins the other", () => {
    expect(dragSpan({ anchor: 80 }, 55, RANGE)).toStrictEqual({
      start: 55,
      end: 80,
    });
    expect(dragSpan({ anchor: 20 }, 64, RANGE)).toStrictEqual({
      start: 20,
      end: 64,
    });
  });

  it("crosses the other end without collapsing the span", () => {
    const crossed = dragSpan({ anchor: 80 }, 95, RANGE);
    expect(crossed).toStrictEqual({ start: 80, end: 95 });
    expect(crossed.start).toBeLessThanOrEqual(crossed.end);
  });

  it("keeps the dragged end on the pointer after it crosses", () => {
    // The moving value is the low end's, past the anchor: it is now the high
    // thumb, and it keeps following on both sides of the anchor.
    expect(dragSpan({ anchor: 80 }, 90, RANGE)).toStrictEqual({
      start: 80,
      end: 90,
    });
    expect(dragSpan({ anchor: 80 }, 100, RANGE)).toStrictEqual({
      start: 80,
      end: 100,
    });
    expect(dragSpan({ anchor: 80 }, 70, RANGE)).toStrictEqual({
      start: 70,
      end: 80,
    });
  });

  it("paints the fill between the ends after a crossing", () => {
    const crossed = dragSpan({ anchor: 80 }, 95, RANGE);
    const from = valueFraction(crossed.start, RANGE);
    const to = valueFraction(crossed.end, RANGE);
    expect(from).toBeCloseTo(0.8, 6);
    expect(to).toBeCloseTo(0.95, 6);
    expect(to - from).toBeCloseTo(0.15, 6);
  });

  it("opens a coincident pair around the press, in either direction", () => {
    expect(dragSpan({ anchor: 50 }, 70, RANGE)).toStrictEqual({
      start: 50,
      end: 70,
    });
    expect(dragSpan({ anchor: 50 }, 20, RANGE)).toStrictEqual({
      start: 20,
      end: 50,
    });
    expect(dragSpan({ anchor: 50 }, 50, RANGE)).toStrictEqual({
      start: 50,
      end: 50,
    });
  });
});

describe("the slider drawings", () => {
  const read = (name: string) =>
    readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

  it("aim with the primitive's pointer arithmetic, not a fixed percentage", () => {
    for (const demo of ["slider-demo.tsx", "range-slider-demo.tsx"]) {
      const source = read(demo);
      expect(source).toContain("pointerValue");
      expect(source).toContain("decideValueKey");
      expect(source).toContain('from "@gpuixui/primitives/core"');
    }
  });

  it("a range press anchors the other end rather than the grabbed one", () => {
    const source = read("range-slider-demo.tsx");
    expect(source).toContain("nearestEnd");
    expect(source).toContain("anchor");
  });
});
