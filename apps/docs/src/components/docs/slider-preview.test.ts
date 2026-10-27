import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dragSpan } from "./slider-preview";

/**
 * A range drag keeps its ends in order, and a press on the coincident pair a
 * price filter opens with opens it around the press.
 *
 * Guarded bug: the Range slider page drew two thumbs at fixed percentages and
 * took no pointer at all — "range slider does not work". The drawing now drags
 * through the primitive's rules, and these are the two moves a hand-written
 * drag gets wrong: crossing the ends (which swaps which value the caller reads
 * back) and a press on a pair that has nowhere to go.
 */

const RANGE = { min: 0, max: 100, step: 1 } as const;

describe("a range drag", () => {
  it("moves the grabbed end and pins the other", () => {
    expect(
      dragSpan({ end: "end", point: 80 }, { start: 20, end: 80 }, 55, RANGE),
    ).toStrictEqual({ start: 20, end: 55 });
    expect(
      dragSpan({ end: "start", point: 20 }, { start: 20, end: 80 }, 64, RANGE),
    ).toStrictEqual({ start: 64, end: 80 });
  });

  it("never lets the ends cross", () => {
    expect(
      dragSpan({ end: "start", point: 20 }, { start: 20, end: 80 }, 95, RANGE),
    ).toStrictEqual({ start: 80, end: 80 });
    expect(
      dragSpan({ end: "end", point: 80 }, { start: 20, end: 80 }, 3, RANGE),
    ).toStrictEqual({ start: 20, end: 20 });
  });

  it("opens a coincident pair around the press, in either direction", () => {
    expect(dragSpan({ end: "start", point: 50 }, { start: 50, end: 50 }, 70, RANGE))
      .toStrictEqual({ start: 50, end: 70 });
    expect(dragSpan({ end: "start", point: 50 }, { start: 50, end: 50 }, 20, RANGE))
      .toStrictEqual({ start: 20, end: 50 });
  });

  it("holds a press that does not move", () => {
    expect(
      dragSpan({ end: "start", point: 50 }, { start: 50, end: 50 }, 50, RANGE),
    ).toStrictEqual({ start: 50, end: 50 });
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
      expect(source).toContain("from \"@gpuixui/primitives/core\"");
    }
  });

  it("a range press asks which end it grabbed", () => {
    expect(read("range-slider-demo.tsx")).toContain("nearestEnd");
  });
});
